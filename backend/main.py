"""
FastAPI Backend for Fortune Teller (Bazi Analysis)

Provides RESTful API endpoints for mobile app integration.
"""
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

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

load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

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


class AnalysisResponse(BaseModel):
    """Response for /api/analysis endpoint."""
    topic: str
    markdown_content: str


class CompatibilityRequest(BaseModel):
    """Request for /api/compatibility endpoint."""
    user_a_data: BirthData
    user_b_data: BirthData
    relation_type: str = Field("恋人/伴侣", description="Relationship type")


class CompatibilityResponse(BaseModel):
    """Response for /api/compatibility endpoint."""
    base_score: int = Field(..., ge=0, le=100, description="Compatibility score (0-100)")
    details: List[str]
    user_a_summary: str
    user_b_summary: str


# --- FastAPI App Initialization ---

app = FastAPI(
    title="命理大师 API",
    description="八字算命后端 API - 支持八字排盘、命理分析、合盘分析、周易起卦",
    version="v0.7.0 beta"
)

# Configure CORS for mobile/web access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific domains
    allow_credentials=True,
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


# --- API Endpoints ---

@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "version": "v0.7.0 beta", "message": "命理大师 API is running"}


@app.post("/api/chart", response_model=ChartResponse)
async def get_bazi_chart(data: BirthData):
    """
    Calculate Bazi Four Pillars and return structured data.
    """
    try:
        from logic import calculate_bazi
        from bazi_utils import BaziEnergyCalculator

        bazi_str, time_info, pattern_info = calculate_bazi(
            year=data.birth_year,
            month=data.month,
            day=data.day,
            hour=data.hour,
            minute=data.minute,
            longitude=data.longitude
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
        
        # Build extended data
        twelve_stages_data = auxiliary.get("twelve_stages")
        nayin_data = auxiliary.get("nayin")
        
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
            pattern_name=pattern_info.get("pattern", "普通格局"),
            pattern_type=pattern_info.get("pattern_type", "正格"),
            day_master=day_master,
            strength=pattern_info.get("strength", {}).get("result", "未知"),
            joy_elements=pattern_info.get("strength", {}).get("joy_elements", "未知"),
            energy_distribution=energy_data,
            time_correction=time_info,
            twelve_stages=TwelveStages(**twelve_stages_data) if twelve_stages_data else None,
            kong_wang=auxiliary.get("kong_wang"),
            nayin=NayinInfo(**nayin_data) if nayin_data else None,
            shen_sha=auxiliary.get("shen_sha")
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Bazi calculation error: {str(e)}")


@app.post("/api/oracle", response_model=OracleResponse)
async def get_oracle(request: OracleRequest):
    """
    Perform a Zhouyi Oracle (divination).
    """
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
        
        result = calculate_fortune_cycles(
            year=data.birth_year,
            month=data.month,
            day=data.day,
            hour=data.hour,
            minute=data.minute,
            gender=data.gender,
            longitude=data.longitude
        )
        return CycleResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cycles calculation error: {str(e)}")


@app.post("/api/analysis", response_model=AnalysisResponse)
async def get_analysis(request: AnalysisRequest):
    """
    Get AI-powered fortune analysis for a specific topic.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
    
    from logic import is_safe_input, calculate_bazi, build_user_context, get_fortune_analysis
    from bazi_utils import build_oracle_prompt
    
    # Safety check
    text_to_check = (request.custom_question or "") + request.question_type
    if not is_safe_input(text_to_check):
        raise HTTPException(status_code=400, detail="Invalid input detected")
    
    try:
        # Calculate Bazi
        bazi_str, time_info, pattern_info = calculate_bazi(
            year=request.user_data.birth_year,
            month=request.user_data.month,
            day=request.user_data.day,
            hour=request.user_data.hour,
            minute=request.user_data.minute,
            longitude=request.user_data.longitude
        )
        
        # Build user context
        current_time_str = datetime.now().strftime("%Y年%m月%d日 %H:%M")
        birth_dt_str = f"{request.user_data.birth_year}年{request.user_data.month}月{request.user_data.day}日 {request.user_data.hour}时"
        
        user_context = build_user_context(
            bazi_text=bazi_str,
            gender=request.user_data.gender,
            birthplace=request.birthplace or "未指定",
            current_time=current_time_str,
            birth_datetime=birth_dt_str,
            pattern_info=pattern_info
        )
        
        # Special handling for Oracle + Bazi combined analysis
        custom_question = request.custom_question
        if request.question_type == "大师解惑" and request.oracle_data:
            # Reconstruct Oracle data for build_oracle_prompt
            hex_data = {
                "original_hex": request.oracle_data.original_hex,
                "future_hex": request.oracle_data.future_hex,
                "changing_lines": request.oracle_data.changing_lines,
                "details": request.oracle_data.details
            }
            bazi_data = {
                "day_pillar": (pattern_info["day_pillar"][0], pattern_info["day_pillar"][1]),
                "pattern_name": pattern_info.get("pattern", "普通格局"),
                "strength": pattern_info.get("strength", {}).get("result", "未知"),
                "joy_elements": pattern_info.get("strength", {}).get("joy_elements", "未知")
            }
            custom_question = build_oracle_prompt(request.custom_question or "请解一卦", hex_data, bazi_data)

        # Collect streamed response
        full_response = ""
        for chunk in get_fortune_analysis(
            topic=request.question_type,
            user_context=user_context,
            custom_question=custom_question,
            api_key=api_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai",
            model="gemini-2.0-flash",
            is_first_response=True,
            conversation_history=None
        ):
            full_response += chunk
        
        return AnalysisResponse(
            topic=request.question_type,
            markdown_content=full_response
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")


@app.post("/api/compatibility", response_model=CompatibilityResponse)
async def get_compatibility(request: CompatibilityRequest):
    """
    Analyze compatibility between two people based on their Bazi.
    """
    try:
        from logic import calculate_bazi
        from bazi_utils import BaziCompatibilityCalculator
        
        # Calculate Bazi for both users
        _, _, pattern_a = calculate_bazi(
            year=request.user_a_data.birth_year,
            month=request.user_a_data.month,
            day=request.user_a_data.day,
            hour=request.user_a_data.hour,
            minute=request.user_a_data.minute,
            longitude=request.user_a_data.longitude
        )
        
        _, _, pattern_b = calculate_bazi(
            year=request.user_b_data.birth_year,
            month=request.user_b_data.month,
            day=request.user_b_data.day,
            hour=request.user_b_data.hour,
            minute=request.user_b_data.minute,
            longitude=request.user_b_data.longitude
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
        
        return CompatibilityResponse(
            base_score=result["base_score"],
            details=result["details"],
            user_a_summary=f"{person_a['pattern_name']}, {person_a['strength']} (喜:{person_a['joy_elements']})",
            user_b_summary=f"{person_b['pattern_name']}, {person_b['strength']} (喜:{person_b['joy_elements']})"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Compatibility analysis error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
