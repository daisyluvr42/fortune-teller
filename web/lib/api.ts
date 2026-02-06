// API Types matching FastAPI backend

export interface BirthData {
    birth_year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    gender: "男" | "女";
    longitude?: number | null;
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
}

export interface AnalysisResponse {
    topic: string;
    markdown_content: string;
}

export interface CompatibilityRequest {
    user_a_data: BirthData;
    user_b_data: BirthData;
    relation_type: string;
}

export interface CompatibilityResponse {
    base_score: number;
    details: string[];
    user_a_summary: string;
    user_b_summary: string;
}

// API Base URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
export async function getOracle(request: OracleRequest): Promise<OracleResponse> {
    const response = await fetch(`${API_BASE}/api/oracle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
 * Get AI-powered fortune analysis
 */
export async function getAnalysis(request: AnalysisRequest): Promise<AnalysisResponse> {
    const response = await fetch(`${API_BASE}/api/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
export async function getCompatibility(request: CompatibilityRequest): Promise<CompatibilityResponse> {
    const response = await fetch(`${API_BASE}/api/compatibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
