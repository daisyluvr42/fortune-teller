// API Types matching FastAPI backend
import { Lunar, LunarMonth } from "lunar-javascript";

export interface BirthData {
    birth_year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    gender: "男" | "女";
    longitude?: number | null;
    is_lunar?: boolean;
    time_mode?: "time" | "shichen";
    shichen?: "早子时" | "丑时" | "寅时" | "卯时" | "辰时" | "巳时" | "午时" | "未时" | "申时" | "酉时" | "戌时" | "亥时" | "晚子时";
    language?: "zh" | "en";
}

export interface Pillar {
    gan: string;
    zhi: string;
    ten_god: string | null;
    hidden_stems: string[] | null;
}

export interface TwelveStages {
    year_stage: string;
    month_stage: string;
    day_stage: string;
    hour_stage: string;
}

export interface NayinInfo {
    year: string;
    month: string;
    day: string;
    hour: string;
}

export interface EnergyItem {
    score: number;
    pct: number;
}

export interface ChartResponse {
    year_pillar: Pillar;
    month_pillar: Pillar;
    day_pillar: Pillar;
    hour_pillar: Pillar;
    pattern_name: string;
    pattern_type: string;
    day_master: string;
    strength: string;
    joy_elements: string;
    energy_distribution: Record<string, EnergyItem> | null;
    time_correction: string | null;
    twelve_stages: TwelveStages | null;
    kong_wang: string[] | null;
    nayin: NayinInfo | null;
    shen_sha: string[] | null;
}

export interface OracleRequest {
    question: string;
    user_data?: BirthData;
    language?: "zh" | "en";
    profile_id?: string;
}

export interface OracleResponse {
    original_hex: string;
    original_short: string;
    original_meaning: string;
    original_binary: string;
    future_hex: string | null;
    future_short: string | null;
    changing_lines: number[];
    details: string[];
    coins_detail?: number[][];
    lines?: {
        line_index: number;
        coins: number[];
        back_count: number;
        line_value: number;
        line_symbol: string;
        is_change: boolean;
    }[];
    svg: string;
}

export interface CycleItem {
    gan_zhi: string;
    year?: number;
    start_year?: number;
    end_year?: number;
    age?: number;
    start_age?: number;
    end_age?: number;
}

export interface CycleResponse {
    da_yun: CycleItem[];
    liu_nian: CycleItem[];
    liu_yue: { month: number; gan_zhi: string }[];
    start_info: {
        year: number;
        month: number;
        day: number;
        age: number;
    };
}

export interface AnalysisRequest {
    user_data: BirthData;
    question_type: string;
    custom_question?: string;
    birthplace?: string;
    oracle_data?: OracleResponse;
    profile_id?: string;
    force_refresh?: boolean;
    language?: string;
}

export interface AnalysisResponse {
    topic: string;
    markdown_content: string;
    from_cache?: boolean;
    remaining_credits?: number;
}

export type CreditType = "oracle" | "compatibility" | "analysis";

export interface CreditStatusResponse {
    credit_type: CreditType;
    remaining: number;
    // Legacy fields
    daily_limit?: number;
    daily_used?: number;
    total_credits?: number;
    used_credits?: number;
    extra_credits?: number;
    // New unified fields
    cycle_limit?: number;
    cycle_used?: number;
    extra_balance?: number;
    cycle_type?: string;
}

const SHICHEN_TO_HOUR: Record<NonNullable<BirthData["shichen"]>, number> = {
    "早子时": 0,
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
    "晚子时": 23,
};

export function normalizeBirthDataForApi(data: BirthData): BirthData {
    let year = data.birth_year;
    let month = data.month;
    let day = data.day;
    let hour = data.hour;
    let minute = data.minute ?? 0;

    if (data.time_mode === "shichen" && data.shichen) {
        const mapped = SHICHEN_TO_HOUR[data.shichen];
        if (mapped !== undefined) {
            hour = mapped;
            minute = 0;
        }
    }

    if (data.is_lunar) {
        const lunarMonth = LunarMonth.fromYm(year, month);
        if (!lunarMonth) {
            throw new Error("农历月份无效");
        }
        const dayCount = lunarMonth.getDayCount();
        if (day < 1 || day > dayCount) {
            throw new Error(`农历日期无效：该月只有 ${dayCount} 天`);
        }

        const lunar = typeof Lunar.fromYmdHms === "function"
            ? Lunar.fromYmdHms(year, month, day, hour, minute, 0)
            : Lunar.fromYmd(year, month, day);
        const solar = lunar.getSolar();
        year = solar.getYear();
        month = solar.getMonth();
        day = solar.getDay();
    }

    return {
        birth_year: year,
        month,
        day,
        hour,
        minute,
        gender: data.gender,
        longitude: data.longitude,
        is_lunar: false,
        time_mode: "time",
        shichen: undefined,
    };
}

export interface CompatibilityRequest {
    user_a_data: BirthData;
    user_b_data: BirthData;
    relation_type: string;
    language?: "zh" | "en";
    profile_id?: string;
    force_refresh?: boolean;
}

export interface CompatibilityResponse {
    base_score: number;
    details: string[];
    user_a_summary: string;
    user_b_summary: string;
    analysis_markdown?: string | null;
    analysis_from_llm?: boolean;
    analysis_error?: string | null;
}

// API Base URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function authHeaders(token?: string): Record<string, string> {
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getCreditStatus(creditType: CreditType, token?: string): Promise<CreditStatusResponse> {
    const response = await fetch(`${API_BASE}/api/credits/status?credit_type=${creditType}`, {
        method: "GET",
        headers: { ...authHeaders(token) },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "获取次数失败" }));
        throw new Error(error.detail || "获取次数失败");
    }

    return response.json();
}

export async function consumeCredit(creditType: CreditType, token?: string): Promise<CreditStatusResponse> {
    const response = await fetch(`${API_BASE}/api/credits/consume`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({ credit_type: creditType }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "次数不足" }));
        throw new Error(error.detail || "次数不足");
    }

    return response.json();
}

/**
 * Get total recharged credits for the authenticated user
 */
export async function getTotalCredits(token?: string): Promise<{ total_credits: number }> {
    const response = await fetch(`${API_BASE}/api/credits/total`, {
        method: "GET",
        headers: { ...authHeaders(token) },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "获取点数失败" }));
        throw new Error(error.detail || "获取点数失败");
    }

    return response.json();
}

// ===== Membership APIs =====

export interface MembershipStatus {
    membership_type: "free" | "vip";
    expires_at: string | null;
    days_remaining: number | null;
    auto_renew: boolean;
    quotas: {
        analysis: number;
        oracle: number;
        compatibility: number;
    };
}

export interface CheckoutSessionRequest {
    user_id: string;
    analysis_type: string;
}

export interface CheckoutSessionResponse {
    checkout_url: string;
    session_id: string;
}

/**
 * Get membership status for the authenticated user
 */
export async function getMembershipStatus(token?: string): Promise<MembershipStatus> {
    const response = await fetch(`${API_BASE}/api/membership/status`, {
        method: "GET",
        headers: { ...authHeaders(token) },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "获取会员状态失败" }));
        throw new Error(error.detail || "获取会员状态失败");
    }

    return response.json();
}

/**
 * Create Stripe checkout session
 */
export async function createCheckoutSession(payload: CheckoutSessionRequest): Promise<CheckoutSessionResponse> {
    const response = await fetch(`${API_BASE}/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "创建支付会话失败" }));
        throw new Error(error.detail || "创建支付会话失败");
    }

    return response.json();
}

/**
 * Get pricing information
 */
export async function getPricing(): Promise<{
    pricing: {
        vip_monthly: { USD: number; CNY: number; days: number };
        credits_pack: { USD: number; CNY: number; credits: number };
    };
    quotas: {
        free: { analysis: number; oracle: number; compatibility: number };
        vip: { analysis: number; oracle: number; compatibility: number };
    };
}> {
    const response = await fetch(`${API_BASE}/api/pricing`, {
        method: "GET",
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "获取价格信息失败" }));
        throw new Error(error.detail || "获取价格信息失败");
    }

    return response.json();
}

/**
 * Calculate Bazi chart from birth data
 */
export async function calculateBazi(data: BirthData): Promise<ChartResponse> {
    const response = await fetch(`${API_BASE}/api/chart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "排盘失败" }));
        throw new Error(error.detail || "排盘请求失败");
    }

    return response.json();
}

/**
 * Perform a Zhouyi Oracle (divination)
 */
export async function getOracle(request: OracleRequest, token?: string): Promise<OracleResponse> {
    const response = await fetch(`${API_BASE}/api/oracle`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "起卦失败" }));
        throw new Error(error.detail || "起卦请求失败");
    }

    return response.json();
}

/**
 * Calculate fortune cycles (DaYun and LiuNian)
 */
export async function getCycles(data: BirthData): Promise<CycleResponse> {
    const response = await fetch(`${API_BASE}/api/cycles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "计算流年失败" }));
        throw new Error(error.detail || "流年计算请求失败");
    }

    return response.json();
}

/**
 * Get AI-powered fortune analysis (with caching support)
 */
export async function getAnalysis(request: AnalysisRequest, token?: string): Promise<AnalysisResponse> {
    const response = await fetch(`${API_BASE}/api/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "分析失败" }));
        throw new Error(error.detail || "命理分析请求失败");
    }

    return response.json();
}

/**
 * Analyze compatibility between two people
 */
export async function getCompatibility(request: CompatibilityRequest, token?: string): Promise<CompatibilityResponse> {
    const response = await fetch(`${API_BASE}/api/compatibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "合盘失败" }));
        throw new Error(error.detail || "合盘分析请求失败");
    }

    return response.json();
}

/**
 * Health check for API
 */
export async function checkApiHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE}/`);
        return response.ok;
    } catch {
        return false;
    }
}
