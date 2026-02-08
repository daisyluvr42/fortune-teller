"""
FastAPI Backend for Fortune Teller (Bazi Analysis)

Provides RESTful API endpoints for mobile app integration.
"""
import os
from pathlib import Path
from datetime import datetime, date
import uuid
import re
from typing import Optional, List, Any

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from supabase import create_client

# Import core logic
from logic import (
    calculate_bazi,
    build_user_context,
    get_fortune_analysis,
    BaziPatternCalculator,
    BaziStrengthCalculator,
    is_safe_input,
    SYSTEM_INSTRUCTION,
    get_optimal_temperature
)
from bazi_utils import BaziCompatibilityCalculator, build_couple_prompt
from credit_service import get_credit_manager, QuotaStatus
from llm_client import get_llm_client

# Load .env from project root (parent of backend/)
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
PAYMENT_WEBHOOK_SECRET = os.getenv("PAYMENT_WEBHOOK_SECRET")
# Anonymous users are not allowed to access LLM analysis.
ALLOW_ANON_ANALYSIS = False
RAW_CORS_ORIGINS = os.getenv("CORS_ALLOW_ORIGINS", "")

def _log_supabase_env_status() -> None:
    def _status(key: str) -> str:
        return "set" if os.getenv(key) else "missing"

    print(
        "[env] SUPABASE_URL="
        + _status("SUPABASE_URL")
        + " SUPABASE_SERVICE_KEY="
        + _status("SUPABASE_SERVICE_KEY")
        + " SUPABASE_KEY="
        + _status("SUPABASE_KEY")
    )

_log_supabase_env_status()

def get_supabase_admin():
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Supabase service key not configured")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def get_user_id_from_auth(authorization: Optional[str]) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization token")
    token = authorization.split(" ", 1)[1]
    supabase = get_supabase_admin()
    try:
        user_resp = supabase.auth.get_user(token)
        if hasattr(user_resp, "user"):
            user = user_resp.user
        elif isinstance(user_resp, dict):
            user = user_resp.get("user")
        else:
            user = None
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Authorization token")
    if not user or not getattr(user, "id", None):
        raise HTTPException(status_code=401, detail="Invalid Authorization token")
    return user.id

# --- Pydantic Models for Request/Response ---

class BirthData(BaseModel):
    """Birth data for Bazi calculation."""
    birth_year: int = Field(..., ge=1900, le=2100, description="Year of birth (e.g., 1990)")
    month: int = Field(..., ge=1, le=12, description="Month of birth (1-12)")
    day: int = Field(..., ge=1, le=31, description="Day of birth (1-31)")
    hour: int = Field(..., ge=0, le=23, description="Hour of birth (0-23)")
    minute: int = Field(0, ge=0, le=59, description="Minute of birth (0-59)")
    gender: str = Field(..., pattern="^(男|女)$", description="Gender (男/女)")
    longitude: Optional[float] = Field(None, description="Longitude for true solar time correction")
    is_lunar: bool = Field(False, description="Use lunar calendar for date input")
    time_mode: str = Field("time", pattern="^(time|shichen)$", description="Time input mode: time or shichen")
    shichen: Optional[str] = Field(None, description="Shichen label when time_mode=shichen")
    language: str = Field("zh", pattern="^(zh|en)$", description="Response language (zh/en)")


class Pillar(BaseModel):
    """A single pillar (Gan+Zhi)."""
    gan: str = Field(..., description="Heavenly Stem (天干)")
    zhi: str = Field(..., description="Earthly Branch (地支)")
    ten_god: Optional[str] = Field(None, description="Ten God relation (十神)")
    hidden_stems: Optional[List[str]] = Field(None, description="Hidden stems in the branch (藏干)")


class TwelveStages(BaseModel):
    """Twelve Life Stages (十二长生)."""
    year_stage: str = Field(..., description="Year pillar stage")
    month_stage: str = Field(..., description="Month pillar stage")
    day_stage: str = Field(..., description="Day pillar stage (自坐)")
    hour_stage: str = Field(..., description="Hour pillar stage")


class NayinInfo(BaseModel):
    """Nayin (纳音) for four pillars."""
    year: str = Field(..., description="Year pillar Nayin")
    month: str = Field(..., description="Month pillar Nayin")
    day: str = Field(..., description="Day pillar Nayin")
    hour: str = Field(..., description="Hour pillar Nayin")


class EnergyItem(BaseModel):
    """Energy score and percentage for one element."""
    score: float
    pct: float


class ChartResponse(BaseModel):
    """Response for /api/chart endpoint."""
    year_pillar: Pillar
    month_pillar: Pillar
    day_pillar: Pillar
    hour_pillar: Pillar
    pattern_name: str = Field(..., description="Pattern name (格局)")
    pattern_type: str = Field(..., description="Pattern type (正格/特殊格局)")
    day_master: str = Field(..., description="Day Master (日主)")
    strength: str = Field(..., description="Strength (身强/身弱)")
    joy_elements: str = Field(..., description="Joy elements (喜用神)")
    energy_distribution: Optional[dict[str, EnergyItem]] = Field(None, description="Five Elements energy distribution")
    time_correction: Optional[str] = Field(None, description="True solar time correction info")
    # Extended data for professional chart
    twelve_stages: Optional[TwelveStages] = Field(None, description="Twelve Life Stages (十二长生)")
    kong_wang: Optional[List[str]] = Field(None, description="Empty/Void branches (空亡)")
    nayin: Optional[NayinInfo] = Field(None, description="Nayin (纳音)")
    shen_sha: Optional[List[str]] = Field(None, description="Spirit Stars (神煞)")


class OracleRequest(BaseModel):
    """Request for /api/oracle endpoint."""
    question: str
    user_data: Optional[BirthData] = None
    language: str = Field("zh", pattern="^(zh|en)$", description="Response language (zh/en)")


class OracleResponse(BaseModel):
    """Response for /api/oracle endpoint."""
    original_hex: str
    original_short: str
    original_meaning: str
    original_binary: str
    future_hex: Optional[str] = None
    future_short: Optional[str] = None
    changing_lines: List[int]
    details: List[str]
    coins_detail: Optional[List[List[int]]] = Field(None, description="Detail status of 3 coins for each line (6 lines)")
    lines: Optional[List[dict]] = Field(None, description="Structured line objects for each of 6 lines")
    svg: str


class CycleItem(BaseModel):
    """A single cycle (DaYun or LiuNian)."""
    gan_zhi: str
    year: Optional[int] = None
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    age: Optional[int] = None
    start_age: Optional[int] = None
    end_age: Optional[int] = None


class CycleResponse(BaseModel):
    """Response for /api/cycles endpoint."""
    da_yun: List[CycleItem]
    liu_nian: List[CycleItem]
    liu_yue: List[dict]
    start_info: dict


class AnalysisRequest(BaseModel):
    """Request for /api/analysis endpoint."""
    user_data: BirthData
    question_type: str = Field(..., description="Analysis topic (e.g., 整体命格, 事业运势)")
    custom_question: Optional[str] = Field(None, description="Custom question for 大师解惑")
    birthplace: Optional[str] = Field("未指定", description="Birthplace name")
    oracle_data: Optional[OracleResponse] = None  # To support Oracle + Bazi combined analysis
    profile_id: Optional[str] = Field(None, description="Profile UUID for caching")
    force_refresh: bool = Field(False, description="Force regenerate even if cached")
    language: str = Field("zh", pattern="^(zh|en)$", description="Response language (zh/en)")


class AnalysisResponse(BaseModel):
    """Response for /api/analysis endpoint."""
    topic: str
    markdown_content: str
    from_cache: bool = False
    remaining_credits: Optional[int] = None


class CompatibilityRequest(BaseModel):
    """Request for /api/compatibility endpoint."""
    user_a_data: BirthData
    user_b_data: BirthData
    relation_type: str = Field("恋人/伴侣", description="Relationship type")
    language: str = Field("zh", pattern="^(zh|en)$", description="Response language (zh/en)")


class CompatibilityResponse(BaseModel):
    """Response for /api/compatibility endpoint."""
    base_score: int = Field(..., ge=0, le=100, description="Compatibility score (0-100)")
    details: List[str]
    user_a_summary: str
    user_b_summary: str
    analysis_markdown: Optional[str] = None
    analysis_from_llm: bool = False
    analysis_error: Optional[str] = None


class CreditConsumeRequest(BaseModel):
    """Request to consume a credit."""
    credit_type: str = Field(..., pattern="^(oracle|compatibility|analysis)$")


class CreditStatusResponse(BaseModel):
    """Response for credit status/consumption."""
    credit_type: str
    remaining: int
    cycle_limit: int = 0
    cycle_used: int = 0
    extra_balance: int = 0
    cycle_type: str = "daily"
    # Legacy fields for backward compatibility
    daily_limit: Optional[int] = None
    daily_used: Optional[int] = None
    total_credits: Optional[int] = None
    used_credits: Optional[int] = None
    extra_credits: Optional[int] = None


# --- FastAPI App Initialization ---

app = FastAPI(
    title="命理大师 API",
    description="八字算命后端 API - 支持八字排盘、命理分析、合盘分析、周易起卦",
    version="v0.7.0 beta"
)

# Configure CORS for mobile/web access
if RAW_CORS_ORIGINS.strip():
    CORS_ORIGINS = [origin.strip() for origin in RAW_CORS_ORIGINS.split(",") if origin.strip()]
else:
    CORS_ORIGINS = ["*"]
ALLOW_CREDENTIALS = os.getenv("CORS_ALLOW_CREDENTIALS")
if ALLOW_CREDENTIALS is not None:
    ALLOW_CREDENTIALS = ALLOW_CREDENTIALS.lower() == "true"
else:
    ALLOW_CREDENTIALS = "*" not in CORS_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,  # In production, restrict to specific domains
    allow_credentials=ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Helper Functions ---

def extract_pillar_data(pillar_str: str, day_master: str, hidden_stems_list: List[str]) -> Pillar:
    """Extract Pillar data from a pillar string like '甲子'."""
    from logic import BaziPatternCalculator
    calc = BaziPatternCalculator()
    gan = pillar_str[0]
    zhi = pillar_str[1]
    ten_god = calc.get_ten_god(day_master, gan) if gan != day_master else "日主"
    return Pillar(
        gan=gan,
        zhi=zhi,
        ten_god=ten_god,
        hidden_stems=hidden_stems_list
    )


SHICHEN_TO_HOUR = {
    "子时": 23,
    "丑时": 1,
    "寅时": 3,
    "卯时": 5,
    "辰时": 7,
    "巳时": 9,
    "午时": 11,
    "未时": 13,
    "申时": 15,
    "酉时": 17,
    "戌时": 19,
    "亥时": 21,
}


def normalize_birth_data(data: BirthData):
    """Normalize birth data for downstream calculation (assumes solar date/time)."""
    year = data.birth_year
    month = data.month
    day = data.day
    hour = data.hour
    minute = data.minute or 0

    if data.time_mode == "shichen":
        if data.shichen and data.shichen in SHICHEN_TO_HOUR:
            hour = SHICHEN_TO_HOUR[data.shichen]
            minute = 0

    if data.is_lunar:
        try:
            from lunar_python import Lunar
            if hasattr(Lunar, "fromYmdHms"):
                lunar = Lunar.fromYmdHms(year, month, day, hour, minute, 0)
            else:
                lunar = Lunar.fromYmd(year, month, day)
            solar = lunar.getSolar()
            year = solar.getYear()
            month = solar.getMonth()
            day = solar.getDay()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid lunar date: {str(e)}")

    return year, month, day, hour, minute, data.longitude


def _ensure_safe_text(value: Optional[str], field_name: str, max_len: int = 500) -> Optional[str]:
    if value is None:
        return None
    text = value.strip()
    if len(text) > max_len:
        text = text[:max_len]
    if text and not is_safe_input(text):
        raise HTTPException(status_code=400, detail=f"Invalid input detected in {field_name}")
    return text


def _ensure_safe_text_list(values: Optional[List[str]], field_name: str, max_len: int = 300, max_items: int = 6) -> List[str]:
    if not values:
        return []
    safe_items: List[str] = []
    for item in values[:max_items]:
        safe_items.append(_ensure_safe_text(item, field_name, max_len=max_len) or "")
    return safe_items


def _ensure_profile_belongs_to_user(profile_id: str, user_id: str) -> dict:
    try:
        uuid.UUID(profile_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid profile_id")
    supabase = get_supabase_admin()
    resp = supabase.table("bazi_profiles").select("session_data,user_id").eq("id", profile_id).eq("user_id", user_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return resp.data[0]


def _sanitize_llm_output(text: str) -> str:
    if not text:
        return text
    # Remove code fences
    text = re.sub(r"```[\s\S]*?```", "", text)
    # Remove markdown inline symbols
    for token in ("**", "__", "`"):
        text = text.replace(token, "")
    # Remove brackets used as section markers
    text = text.replace("【", "").replace("】", "")
    # Remove common emoji ranges
    text = re.sub(r"[\U0001F300-\U0001FAFF]", "", text)

    lines = []
    prev_blank = False
    for raw in text.splitlines():
        line = raw.strip()
        line = re.sub(r"^#{1,6}\s*", "", line)
        line = re.sub(r"^>\s*", "", line)
        line = re.sub(r"^[-*+•]\s+", "", line)
        line = re.sub(r"^\d+[\.\)\、]\s*", "", line)
        if line in ("---", "***", "___"):
            continue
        if not line:
            if lines and not prev_blank:
                lines.append("")
                prev_blank = True
            continue
        lines.append(line)
        prev_blank = False
    return "\n".join(lines).strip()


def consume_oracle_credit(user_id: str) -> CreditStatusResponse:
    """Consume oracle credit using unified CreditManager."""
    cm = get_credit_manager()
    status = cm.consume(user_id, "oracle")
    return CreditStatusResponse(
        credit_type="oracle",
        remaining=status.remaining,
        cycle_limit=status.cycle_limit,
        cycle_used=status.cycle_used,
        extra_balance=status.extra_balance,
        cycle_type=status.cycle_type,
        daily_limit=status.cycle_limit,
        daily_used=status.cycle_used,
        extra_credits=status.extra_balance,
    )


def consume_compatibility_credit(user_id: str) -> CreditStatusResponse:
    """Consume compatibility credit using unified CreditManager."""
    cm = get_credit_manager()
    status = cm.consume(user_id, "compatibility")
    return CreditStatusResponse(
        credit_type="compatibility",
        remaining=status.remaining,
        cycle_limit=status.cycle_limit,
        cycle_used=status.cycle_used,
        extra_balance=status.extra_balance,
        cycle_type=status.cycle_type,
        total_credits=status.cycle_limit,
        used_credits=status.cycle_used,
        extra_credits=status.extra_balance,
    )


def consume_analysis_credit(user_id: str) -> CreditStatusResponse:
    """Consume analysis credit using unified CreditManager."""
    cm = get_credit_manager()
    status = cm.consume(user_id, "analysis")
    return CreditStatusResponse(
        credit_type="analysis",
        remaining=status.remaining,
        cycle_limit=status.cycle_limit,
        cycle_used=status.cycle_used,
        extra_balance=status.extra_balance,
        cycle_type=status.cycle_type,
        daily_limit=status.cycle_limit,
        daily_used=status.cycle_used,
        extra_credits=status.extra_balance,
    )


def get_credit_status(user_id: str, credit_type: str) -> CreditStatusResponse:
    """Get credit status using unified CreditManager."""
    if credit_type not in ("oracle", "compatibility", "analysis"):
        raise HTTPException(status_code=400, detail="Invalid credit type")
    
    cm = get_credit_manager()
    status = cm.get_status(user_id, credit_type)  # type: ignore
    
    # Build response with legacy field mapping
    resp = CreditStatusResponse(
        credit_type=credit_type,
        remaining=status.remaining,
        cycle_limit=status.cycle_limit,
        cycle_used=status.cycle_used,
        extra_balance=status.extra_balance,
        cycle_type=status.cycle_type,
        extra_credits=status.extra_balance,
    )
    if credit_type == "oracle" or credit_type == "analysis":
        resp.daily_limit = status.cycle_limit
        resp.daily_used = status.cycle_used
    elif credit_type == "compatibility":
        resp.total_credits = status.cycle_limit
        resp.used_credits = status.cycle_used
    return resp


def _ensure_credit_available(user_id: str, credit_type: str) -> CreditStatusResponse:
    status = get_credit_status(user_id, credit_type)
    if status.remaining <= 0:
        raise HTTPException(status_code=403, detail=f"{credit_type} 额度不足，请充值或开通 VIP 获取更多权益")
    return status


# --- API Endpoints ---

@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "version": "v0.7.0 beta", "message": "命理大师 API is running"}


@app.get("/api/credits/status", response_model=CreditStatusResponse)
async def credit_status(credit_type: str, authorization: Optional[str] = Header(None)):
    """
    Get credit status for oracle or compatibility.
    """
    user_id = get_user_id_from_auth(authorization)
    return get_credit_status(user_id, credit_type)


@app.post("/api/credits/consume", response_model=CreditStatusResponse)
async def credit_consume(request: CreditConsumeRequest, authorization: Optional[str] = Header(None)):
    """
    Consume one credit for oracle, compatibility, or analysis.
    """
    user_id = get_user_id_from_auth(authorization)
    if request.credit_type == "oracle":
        return consume_oracle_credit(user_id)
    if request.credit_type == "compatibility":
        return consume_compatibility_credit(user_id)
    if request.credit_type == "analysis":
        return consume_analysis_credit(user_id)
    raise HTTPException(status_code=400, detail="Invalid credit type")


@app.get("/api/credits/total")
async def get_total_credits(authorization: Optional[str] = Header(None)):
    """
    Get total recharged credits for the authenticated user.
    Returns the sum of extra_balance across all features.
    """
    user_id = get_user_id_from_auth(authorization)
    cm = get_credit_manager()
    total = cm.get_total_credits(user_id)
    return {"total_credits": total}


# ===== Membership APIs =====

@app.get("/api/membership/status")
async def get_membership_status(authorization: Optional[str] = Header(None)):
    """
    Get current membership status for the authenticated user.
    Returns membership type (free/vip), expiry date, and daily quotas.
    """
    user_id = get_user_id_from_auth(authorization)
    from membership_service import get_membership_service
    service = get_membership_service()
    return service.get_membership(user_id)


@app.post("/api/payment/create")
async def create_payment(
    payment_type: str,  # 'membership_vip' or 'credits_recharge'
    currency: str = "USD",  # 'USD' or 'CNY'
    quantity: int = 1,  # months for VIP, packs for credits
    authorization: Optional[str] = Header(None)
):
    """
    Create a payment order (placeholder for Stripe/Alipay/WeChat integration).
    
    Pricing:
    - VIP Monthly: $9.99 USD / ¥68 CNY
    - Credits Pack: $0.99 USD / ¥6.8 CNY = 10 credits
    """
    user_id = get_user_id_from_auth(authorization)
    from membership_service import get_membership_service, PaymentRequest
    service = get_membership_service()
    
    request = PaymentRequest(
        payment_type=payment_type,
        currency=currency,
        quantity=quantity,
    )
    return service.create_payment(user_id, request)


@app.post("/api/payment/complete")
async def complete_payment(
    payment_id: str,
    payment_provider: str,  # 'stripe', 'alipay', 'wechat'
    provider_payment_id: str,  # Payment ID from the provider
    x_webhook_secret: Optional[str] = Header(None),
):
    """
    Payment completion webhook (for internal use / testing).
    
    In production, this will be called by Stripe/Alipay/WeChat webhooks.
    """
    if not PAYMENT_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Payment webhook secret not configured")
    if not x_webhook_secret or x_webhook_secret != PAYMENT_WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized payment callback")
    from membership_service import get_membership_service
    service = get_membership_service()
    return service.complete_payment(payment_id, payment_provider, provider_payment_id)


@app.get("/api/pricing")
async def get_pricing():
    """
    Get current pricing information.
    """
    from membership_service import PRICING, QUOTA_CONFIG
    return {
        "pricing": PRICING,
        "quotas": QUOTA_CONFIG,
    }


@app.post("/api/chart", response_model=ChartResponse)
async def get_bazi_chart(data: BirthData):
    """
    Calculate Bazi Four Pillars and return structured data.
    """
    try:
        from logic import calculate_bazi
        from bazi_utils import BaziEnergyCalculator
        from translations import (
            translate_pattern, translate_strength, translate_element,
            translate_nayin, translate_shensha
        )
        
        lang = data.language
        year, month, day, hour, minute, longitude = normalize_birth_data(data)

        bazi_str, time_info, pattern_info = calculate_bazi(
            year=year,
            month=month,
            day=day,
            hour=hour,
            minute=minute,
            longitude=longitude
        )
        
        day_master = pattern_info["day_master"]
        hidden = pattern_info.get("hidden_stems", {})
        auxiliary = pattern_info.get("auxiliary", {})
        
        # Calculate Energy Distribution
        pillars_list = [
            pattern_info["year_pillar"],
            pattern_info["month_pillar"],
            pattern_info["day_pillar"],
            pattern_info["hour_pillar"]
        ]
        energy_calc = BaziEnergyCalculator()
        energy_data = energy_calc.calculate_energy(pillars_list)
        
        # Translate energy data keys if English
        if lang == "en" and energy_data:
            translated_energy = {}
            for key, value in energy_data.items():
                translated_key = translate_element(key, lang)
                translated_energy[translated_key] = value
            energy_data = translated_energy
        
        # Build extended data
        twelve_stages_data = auxiliary.get("twelve_stages")
        nayin_data = auxiliary.get("nayin")
        
        # Translate nayin if English
        if lang == "en" and nayin_data:
            nayin_data = {
                "year": translate_nayin(nayin_data.get("year", ""), lang),
                "month": translate_nayin(nayin_data.get("month", ""), lang),
                "day": translate_nayin(nayin_data.get("day", ""), lang),
                "hour": translate_nayin(nayin_data.get("hour", ""), lang),
            }
        
        # Translate shen_sha if English
        shen_sha_list = auxiliary.get("shen_sha", [])
        if lang == "en" and shen_sha_list:
            shen_sha_list = [translate_shensha(s, lang) for s in shen_sha_list]
        
        # Translate pattern name
        pattern_name = translate_pattern(pattern_info.get("pattern", "普通格局"), lang)
        
        # Translate strength
        strength = translate_strength(pattern_info.get("strength", {}).get("result", "未知"), lang)
        
        # Translate joy elements
        joy_elements_raw = pattern_info.get("strength", {}).get("joy_elements", "未知")
        if lang == "en" and joy_elements_raw != "未知":
            # joy_elements might be like "水木" - translate each character
            joy_translated = []
            for char in joy_elements_raw:
                joy_translated.append(translate_element(char, lang))
            joy_elements = ", ".join(joy_translated) if joy_translated else joy_elements_raw
        else:
            joy_elements = joy_elements_raw
        
        return ChartResponse(
            year_pillar=extract_pillar_data(
                pattern_info["year_pillar"], 
                day_master, 
                hidden.get("年支藏干", [])
            ),
            month_pillar=extract_pillar_data(
                pattern_info["month_pillar"], 
                day_master, 
                hidden.get("月支藏干", [])
            ),
            day_pillar=extract_pillar_data(
                pattern_info["day_pillar"], 
                day_master, 
                hidden.get("日支藏干", [])
            ),
            hour_pillar=extract_pillar_data(
                pattern_info["hour_pillar"], 
                day_master, 
                hidden.get("时支藏干", [])
            ),
            pattern_name=pattern_name,
            pattern_type=pattern_info.get("pattern_type", "正格"),
            day_master=day_master,
            strength=strength,
            joy_elements=joy_elements,
            energy_distribution=energy_data,
            time_correction=time_info,
            twelve_stages=TwelveStages(**twelve_stages_data) if twelve_stages_data else None,
            kong_wang=auxiliary.get("kong_wang"),
            nayin=NayinInfo(**nayin_data) if nayin_data else None,
            shen_sha=shen_sha_list
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Bazi calculation error: {str(e)}")


@app.post("/api/oracle", response_model=OracleResponse)
async def get_oracle(request: OracleRequest, authorization: Optional[str] = Header(None)):
    """
    Perform a Zhouyi Oracle (divination).
    """
    _ensure_safe_text(request.question, "question", max_len=800)
    user_id = get_user_id_from_auth(authorization)
    consume_oracle_credit(user_id)
    try:
        from logic import ZhouyiCalculator
        from bazi_utils import draw_hexagram_svg
        
        calc = ZhouyiCalculator()
        result = calc.cast_hexagram()
        
        return OracleResponse(
            original_hex=result["original_hex"],
            original_short=result["original_short"],
            original_meaning=result["original_meaning"],
            original_binary=result["original_binary"],
            future_hex=result.get("future_hex"),
            future_short=result.get("future_short"),
            changing_lines=result.get("changing_lines", []),
            details=result.get("details", []),
            coins_detail=result.get("coins_detail"),
            lines=result.get("lines"),
            svg=draw_hexagram_svg(result["original_binary"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Oracle error: {str(e)}")


@app.post("/api/cycles", response_model=CycleResponse)
async def get_cycles(data: BirthData):
    """
    Calculate fortune cycles (DaYun and LiuNian).
    """
    try:
        from logic import calculate_fortune_cycles
        
        year, month, day, hour, minute, longitude = normalize_birth_data(data)

        result = calculate_fortune_cycles(
            year=year,
            month=month,
            day=day,
            hour=hour,
            minute=minute,
            gender=data.gender,
            longitude=longitude
        )
        return CycleResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cycles calculation error: {str(e)}")


@app.post("/api/analysis", response_model=AnalysisResponse)
async def get_analysis(request: AnalysisRequest, authorization: Optional[str] = Header(None)):
    """
    Get AI-powered fortune analysis for a specific topic.
    Supports caching via profile_id and force_refresh.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
    
    from logic import is_safe_input, calculate_bazi, build_user_context, get_fortune_analysis
    from bazi_utils import build_oracle_prompt
    
    # Safety check
    question_type = _ensure_safe_text(request.question_type, "question_type", max_len=80) or request.question_type
    custom_question_clean = _ensure_safe_text(request.custom_question, "custom_question", max_len=1200)
    birthplace = _ensure_safe_text(request.birthplace or "未指定", "birthplace", max_len=80) or "未指定"
    oracle_details = _ensure_safe_text_list(
        request.oracle_data.details if request.oracle_data else None,
        "oracle_data.details",
        max_len=300,
        max_items=6,
    )
    text_to_check = (custom_question_clean or "") + question_type + birthplace
    if not is_safe_input(text_to_check):
        raise HTTPException(status_code=400, detail="Invalid input detected")
    
    # Get user_id if authenticated
    user_id = None
    if authorization:
        user_id = get_user_id_from_auth(authorization)
    elif not ALLOW_ANON_ANALYSIS:
        raise HTTPException(status_code=401, detail="Authentication required for analysis")

    if request.profile_id and not user_id:
        raise HTTPException(status_code=401, detail="Authentication required for profile cache")
    
    supabase = None
    cached_result = None
    remaining_credits = None
    
    # Check cache if profile_id is provided and not force_refresh
    if request.profile_id and not request.force_refresh:
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required for profile cache")
        try:
            profile_record = _ensure_profile_belongs_to_user(request.profile_id, user_id)
            session_data = profile_record.get("session_data") or {}
            analyses = session_data.get("analyses") or {}
            cached_result = analyses.get(question_type)
            if cached_result:
                return AnalysisResponse(
                    topic=question_type,
                    markdown_content=cached_result,
                    from_cache=True,
                    remaining_credits=None  # Don't expose credits on cache hit
                )
        except HTTPException:
            raise
        except Exception as e:
            print(f"Cache check error: {e}")  # Log but don't fail
    
    # Check credit availability for authenticated users (do not deduct yet)
    if user_id:
        try:
            _ensure_credit_available(user_id, "analysis")
        except HTTPException as e:
            if e.status_code == 403:
                raise HTTPException(status_code=403, detail="深度分析次数已用完，请明日再试或充值")
            raise
    
    try:
        # Calculate Bazi
        year, month, day, hour, minute, longitude = normalize_birth_data(request.user_data)
        bazi_str, time_info, pattern_info = calculate_bazi(
            year=year,
            month=month,
            day=day,
            hour=hour,
            minute=minute,
            longitude=longitude
        )
        
        # Build user context
        current_time_str = datetime.now().strftime("%Y年%m月%d日 %H:%M")
        birth_dt_str = f"{year}年{month}月{day}日 {hour}时"
        
        user_context = build_user_context(
            bazi_text=bazi_str,
            gender=request.user_data.gender,
            birthplace=birthplace,
            current_time=current_time_str,
            birth_datetime=birth_dt_str,
            pattern_info=pattern_info,
            birth_year=year
        )
        
        # Calculate Age for Thousand Faces Strategy
        current_year = datetime.now().year
        age = current_year - year
        
        # Special handling for Oracle + Bazi combined analysis
        custom_question = custom_question_clean
        if question_type == "大师解惑" and request.oracle_data:
            # Reconstruct Oracle data for build_oracle_prompt
            hex_data = {
                "original_hex": request.oracle_data.original_hex,
                "future_hex": request.oracle_data.future_hex,
                "changing_lines": request.oracle_data.changing_lines,
                "details": oracle_details
            }
            bazi_data = {
                "day_pillar": (pattern_info["day_pillar"][0], pattern_info["day_pillar"][1]),
                "pattern_name": pattern_info.get("pattern", "普通格局"),
                "strength": pattern_info.get("strength", {}).get("result", "未知"),
                "joy_elements": pattern_info.get("strength", {}).get("joy_elements", "未知")
            }
            custom_question = build_oracle_prompt(custom_question or "请解一卦", hex_data, bazi_data, language=request.language)

        # Collect streamed response
        full_response = ""
        for chunk in get_fortune_analysis(
            topic=question_type,
            user_context=user_context,
            custom_question=custom_question,
            api_key=api_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai",
            model="gemini-2.0-flash",
            language=request.language,
            is_first_response=True,
            conversation_history=None,
            age=age
        ):
            full_response += chunk
        full_response = _sanitize_llm_output(full_response)
        
        # Consume credit only after successful LLM output
        if user_id:
            if not full_response.strip():
                raise HTTPException(status_code=500, detail="Analysis error: empty response")
            try:
                credit_status = consume_analysis_credit(user_id)
                remaining_credits = credit_status.remaining
            except HTTPException as e:
                if e.status_code == 403:
                    raise HTTPException(status_code=403, detail="深度分析次数已用完，请明日再试或充值")
                raise

        # Save to cache if profile_id is provided
        if request.profile_id and full_response:
            try:
                if not user_id:
                    raise HTTPException(status_code=401, detail="Authentication required for profile cache")
                if not supabase:
                    supabase = get_supabase_admin()
                # Fetch current session_data
                profile_resp = supabase.table("bazi_profiles").select("session_data,user_id").eq("id", request.profile_id).eq("user_id", user_id).execute()
                if profile_resp.data and len(profile_resp.data) > 0:
                    session_data = profile_resp.data[0].get("session_data") or {}
                    analyses = session_data.get("analyses") or {}
                    analyses[question_type] = full_response
                    session_data["analyses"] = analyses
                    supabase.table("bazi_profiles").update({"session_data": session_data}).eq("id", request.profile_id).eq("user_id", user_id).execute()
            except Exception as e:
                print(f"Cache write error: {e}")  # Log but don't fail
        
        return AnalysisResponse(
            topic=question_type,
            markdown_content=full_response,
            from_cache=False,
            remaining_credits=remaining_credits
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")




@app.post("/api/compatibility", response_model=CompatibilityResponse)
async def get_compatibility(request: CompatibilityRequest, authorization: Optional[str] = Header(None)):
    """
    Analyze compatibility between two people based on their Bazi.
    """
    _ensure_safe_text(request.relation_type, "relation_type", max_len=50)
    user_id = None
    if authorization:
        user_id = get_user_id_from_auth(authorization)
    try:
        from logic import calculate_bazi
        from bazi_utils import BaziCompatibilityCalculator
        
        # Calculate Bazi for both users
        year_a, month_a, day_a, hour_a, minute_a, longitude_a = normalize_birth_data(request.user_a_data)
        _, _, pattern_a = calculate_bazi(
            year=year_a,
            month=month_a,
            day=day_a,
            hour=hour_a,
            minute=minute_a,
            longitude=longitude_a
        )
        
        year_b, month_b, day_b, hour_b, minute_b, longitude_b = normalize_birth_data(request.user_b_data)
        _, _, pattern_b = calculate_bazi(
            year=year_b,
            month=month_b,
            day=day_b,
            hour=hour_b,
            minute=minute_b,
            longitude=longitude_b
        )
        
        # Prepare data for compatibility calculator
        person_a = {
            "day_pillar": (pattern_a["day_pillar"][0], pattern_a["day_pillar"][1]),
            "year_pillar": pattern_a["year_pillar"],
            "month_pillar": pattern_a["month_pillar"],
            "hour_pillar": pattern_a["hour_pillar"],
            "gender": request.user_a_data.gender,
            "pattern_name": pattern_a.get("pattern", "普通格局"),
            "strength": pattern_a.get("strength", {}).get("result", "未知"),
            "joy_elements": pattern_a.get("strength", {}).get("joy_elements", "未知"),
            "nayin": pattern_a.get("auxiliary", {}).get("nayin", {})
        }
        
        person_b = {
            "day_pillar": (pattern_b["day_pillar"][0], pattern_b["day_pillar"][1]),
            "year_pillar": pattern_b["year_pillar"],
            "month_pillar": pattern_b["month_pillar"],
            "hour_pillar": pattern_b["hour_pillar"],
            "gender": request.user_b_data.gender,
            "pattern_name": pattern_b.get("pattern", "普通格局"),
            "strength": pattern_b.get("strength", {}).get("result", "未知"),
            "joy_elements": pattern_b.get("strength", {}).get("joy_elements", "未知"),
            "nayin": pattern_b.get("auxiliary", {}).get("nayin", {})
        }
        
        # Run compatibility analysis
        calculator = BaziCompatibilityCalculator()
        result = calculator.analyze_compatibility(person_a, person_b)
        
        # Localize labels based on language
        if request.language == "en":
            joy_label = "Favorable"
            llm_unavailable_msg = "AI interpretation is temporarily unavailable. Please try again later."
            quota_unavailable_msg = "Compatibility quota used up. Please recharge or upgrade to VIP."
        else:
            joy_label = "喜"
            llm_unavailable_msg = "AI 解读暂时不可用，请稍后再试。"
            quota_unavailable_msg = "合盘次数已用完，请充值或开通 VIP"

        analysis_markdown = None
        analysis_error = None
        analysis_from_llm = False

        if user_id:
            try:
                _ensure_credit_available(user_id, "compatibility")
            except HTTPException as e:
                if e.status_code == 403:
                    analysis_error = quota_unavailable_msg
                else:
                    analysis_error = llm_unavailable_msg

        if user_id and not analysis_error:
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                analysis_error = llm_unavailable_msg
            else:
                try:
                    prompt = build_couple_prompt(
                        person_a=person_a,
                        person_b=person_b,
                        comp_data=result,
                        relation_type=request.relation_type,
                        language=request.language,
                    )
                    client = get_llm_client(api_key, "https://generativelanguage.googleapis.com/v1beta/openai")
                    response = client.chat.completions.create(
                        model="gemini-2.0-flash",
                        messages=[
                            {"role": "system", "content": "你是一位资深命理顾问，请严格遵循用户指令。"},
                            {"role": "user", "content": prompt},
                        ],
                        temperature=get_optimal_temperature("gemini-2.0-flash"),
                    )
                    analysis_markdown = response.choices[0].message.content or ""
                    analysis_markdown = _sanitize_llm_output(analysis_markdown)
                    analysis_from_llm = bool(analysis_markdown)
                    if analysis_from_llm:
                        consume_compatibility_credit(user_id)
                except Exception as e:
                    print(f"[compatibility] LLM error: {e}")
                    analysis_error = llm_unavailable_msg
        
        return CompatibilityResponse(
            base_score=result["base_score"],
            details=result["details"],
            user_a_summary=f"{person_a['pattern_name']}, {person_a['strength']} ({joy_label}:{person_a['joy_elements']})",
            user_b_summary=f"{person_b['pattern_name']}, {person_b['strength']} ({joy_label}:{person_b['joy_elements']})",
            analysis_markdown=analysis_markdown,
            analysis_from_llm=analysis_from_llm,
            analysis_error=analysis_error,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Compatibility analysis error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
