"""
Fortune Teller Streamlit App.
"""
import streamlit as st
import streamlit.components.v1 as components
import json
import urllib.parse
import re
import calendar
from datetime import date, datetime
import os
from pathlib import Path
from logic import calculate_bazi, get_fortune_analysis, build_user_context, BaziChartGenerator, ZhouyiCalculator
from bazi_utils import BaziCompatibilityCalculator, build_couple_prompt, draw_hexagram_svg, build_oracle_prompt, BaziEnergyCalculator, EnergyPieChartGenerator
from china_cities import CHINA_CITIES, SHICHEN_HOURS, get_shichen_mid_hour
from lunar_python import Lunar, LunarYear
from dotenv import load_dotenv
from pdf_generator import generate_report_pdf
from llm_client import get_llm_client
from text_utils import clean_markdown_for_display
from db_utils import init_db, save_profile, profile_exists, get_all_profiles, get_profile_by_id, delete_profile, update_session_data, check_daily_quota, consume_daily_quota

PROJECT_ROOT = Path(__file__).resolve().parent
load_dotenv(dotenv_path=PROJECT_ROOT / ".env")


def get_app_version() -> str:
    """Read the app version from VERSION file; fallback if missing."""
    try:
        return (PROJECT_ROOT / "VERSION").read_text(encoding="utf-8").strip()
    except Exception:
        return "v0.0.0"

# Daily limit for default API key (to prevent abuse)
DEFAULT_API_DAILY_LIMIT = 20

# Pre-sorted city list for searchable dropdown
SORTED_CITY_LIST = sorted(CHINA_CITIES.keys())
SORTED_CITY_LIST_LOWER = [city.lower() for city in SORTED_CITY_LIST]


def searchable_city_select(label: str, key_prefix: str, default_index: int = 0):
    """
    Create a searchable city dropdown with text filter.
    
    Args:
        label: Label for the section
        key_prefix: Unique prefix for session state keys
        default_index: Default selected index in filtered list
    
    Returns:
        tuple: (selected_city, longitude or None)
    """
    search_key = f"{key_prefix}_search"
    select_key = f"{key_prefix}_select"
    
    # Initialize search state
    if search_key not in st.session_state:
        st.session_state[search_key] = ""
    
    # Search input with placeholder
    search_query = st.text_input(
        "🔍 搜索城市",
        value=st.session_state[search_key],
        placeholder="输入城市名快速筛选...",
        key=search_key,
        label_visibility="collapsed"
    )
    
    # Filter city list based on search query
    if search_query:
        query_lower = search_query.lower()
        filtered_cities = [
            city
            for city, city_lower in zip(SORTED_CITY_LIST, SORTED_CITY_LIST_LOWER)
            if query_lower in city_lower
        ]
    else:
        filtered_cities = SORTED_CITY_LIST
    
    # Build options list with "不选择" option first
    options = ["不选择 (使用北京时间)"] + filtered_cities
    
    # If no matches, show all cities
    if len(options) == 1 and search_query:
        st.caption(f"未找到匹配 '{search_query}' 的城市，显示全部")
        options = ["不选择 (使用北京时间)"] + SORTED_CITY_LIST
    
    # City selectbox
    selected = st.selectbox(
        label,
        options=options,
        index=default_index,
        label_visibility="collapsed",
        key=select_key
    )
    
    # Return selected city and longitude
    if selected != "不选择 (使用北京时间)":
        longitude = CHINA_CITIES.get(selected)
        st.caption(f"📐 经度: {longitude}°E")
        return selected, longitude
    else:
        return selected, None




def serialize_session_state() -> str:
    """
    Capture critical session state as JSON string for persistence.
    Used for auto-saving session after LLM responses.
    """
    snapshot = {
        "bazi_result": st.session_state.get("bazi_result", ""),
        "time_info": st.session_state.get("time_info", ""),
        "user_context": st.session_state.get("user_context", ""),
        "clicked_topics": list(st.session_state.get("clicked_topics", set())),
        "responses": st.session_state.get("responses", []),
        "pattern_info": st.session_state.get("pattern_info"),
        "bazi_svg": st.session_state.get("bazi_svg"),
        "energy_data": st.session_state.get("energy_data"),
        "energy_svg": st.session_state.get("energy_svg"),
        "dominant_element": st.session_state.get("dominant_element"),
        "weakest_element": st.session_state.get("weakest_element"),
        "birthplace": st.session_state.get("birthplace"),
        "gender": st.session_state.get("gender"),
        "birth_datetime": st.session_state.get("birth_datetime"),
        "is_first_response": st.session_state.get("is_first_response", True),
        "custom_question_count": st.session_state.get("custom_question_count", 0),
    }
    return json.dumps(snapshot, ensure_ascii=False)


def restore_session_state(session_data_json: str) -> bool:
    """
    Restore session state from JSON string.
    Returns True if restoration was successful.
    """
    try:
        snapshot = json.loads(session_data_json)
        
        st.session_state.bazi_result = snapshot.get("bazi_result", "")
        st.session_state.time_info = snapshot.get("time_info", "")
        st.session_state.user_context = snapshot.get("user_context", "")
        st.session_state.clicked_topics = set(snapshot.get("clicked_topics", []))
        st.session_state.responses = [tuple(r) if isinstance(r, list) else r for r in snapshot.get("responses", [])]
        st.session_state.pattern_info = snapshot.get("pattern_info")
        st.session_state.bazi_svg = snapshot.get("bazi_svg")
        st.session_state.energy_data = snapshot.get("energy_data")
        st.session_state.energy_svg = snapshot.get("energy_svg")
        st.session_state.dominant_element = tuple(snapshot["dominant_element"]) if snapshot.get("dominant_element") else None
        st.session_state.weakest_element = tuple(snapshot["weakest_element"]) if snapshot.get("weakest_element") else None
        st.session_state.birthplace = snapshot.get("birthplace")
        st.session_state.gender = snapshot.get("gender")
        st.session_state.birth_datetime = snapshot.get("birth_datetime")
        st.session_state.is_first_response = snapshot.get("is_first_response", True)
        st.session_state.custom_question_count = snapshot.get("custom_question_count", 0)
        
        # Critical: Set flags to show results page
        st.session_state.bazi_calculated = True
        st.session_state.has_result = True
        
        return True
    except Exception as e:
        print(f"Failed to restore session state: {e}")
        return False

# Default API configuration (Gemini) - Load from environment for security
# IMPORTANT: Set GEMINI_API_KEY in .env file, do NOT hardcode API keys!
DEFAULT_API_KEY = os.getenv("GEMINI_API_KEY", "")
DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai"
DEFAULT_MODEL = "gemini-3-pro-preview"

# Predefined AI providers (updated 2026-01)
AI_PROVIDERS = {
    "默认 (Gemini)": {
        "base_url": DEFAULT_BASE_URL,
        "models": ["gemini-3-pro-preview", "gemini-3-flash-preview", "gemini-2.0-flash-exp", "gemini-1.5-pro"]
    },
    "DeepSeek": {
        "base_url": "https://api.deepseek.com",
        "models": ["deepseek-chat", "deepseek-reasoner"]
    },
    "OpenAI": {
        "base_url": "https://api.openai.com/v1",
        "models": ["gpt-4.5-preview", "gpt-4o", "gpt-4o-mini", "o1", "o1-mini"]
    },
    "Anthropic (Claude)": {
        "base_url": "https://api.anthropic.com/v1",
        "models": ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"]
    },
    "Google Gemini": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai",
        "models": ["gemini-3-pro-preview", "gemini-3-flash-preview", "gemini-2.0-flash-exp", "gemini-1.5-pro"]
    },
    "Moonshot (月之暗面)": {
        "base_url": "https://api.moonshot.cn/v1",
        "models": ["moonshot-v1-128k", "moonshot-v1-32k", "moonshot-v1-8k"]
    },
    "Zhipu (智谱)": {
        "base_url": "https://open.bigmodel.cn/api/paas/v4",
        "models": ["glm-4-plus", "glm-4-0520", "glm-4-flash"]
    },
    "自定义 (Custom)": {
        "base_url": "",
        "models": []
    }
}

# Fortune analysis topics
ANALYSIS_TOPICS = ["整体命格", "事业运势", "感情运势", "喜用忌用", "健康建议", "开运建议", "大师解惑"]

# Page Configuration
st.set_page_config(
    page_title="命理大师",
    page_icon="🔮",
    layout="centered"
)

# Initialize session state
if "bazi_calculated" not in st.session_state:
    st.session_state.bazi_calculated = False
if "has_result" not in st.session_state:
    st.session_state.has_result = False  # Controls which page to show
if "bazi_result" not in st.session_state:
    st.session_state.bazi_result = ""
if "time_info" not in st.session_state:
    st.session_state.time_info = ""
if "user_context" not in st.session_state:
    st.session_state.user_context = ""
if "clicked_topics" not in st.session_state:
    st.session_state.clicked_topics = set()
if "responses" not in st.session_state:
    st.session_state.responses = []  # List of (topic_key, topic_display, response) tuples
if "show_custom_input" not in st.session_state:
    st.session_state.show_custom_input = False
if "custom_question_count" not in st.session_state:
    st.session_state.custom_question_count = 0
if "time_mode" not in st.session_state:
    st.session_state.time_mode = "exact"  # "exact" or "shichen"
if "is_first_response" not in st.session_state:
    st.session_state.is_first_response = True
if "scroll_to_topic" not in st.session_state:
    st.session_state.scroll_to_topic = None
if "is_generating" not in st.session_state:
    st.session_state.is_generating = False
if "data_loaded_from_storage" not in st.session_state:
    st.session_state.data_loaded_from_storage = False
if "clear_storage_requested" not in st.session_state:
    st.session_state.clear_storage_requested = False
if "default_api_usage_count" not in st.session_state:
    st.session_state.default_api_usage_count = 0
if "using_default_api" not in st.session_state:
    st.session_state.using_default_api = True
if "calendar_mode" not in st.session_state:
    st.session_state.calendar_mode = "solar"  # "solar" or "lunar"
if "compatibility_mode" not in st.session_state:
    st.session_state.compatibility_mode = False
if "partner_bazi" not in st.session_state:
    st.session_state.partner_bazi = None
if "partner_info" not in st.session_state:
    st.session_state.partner_info = None
if "compatibility_result" not in st.session_state:
    st.session_state.compatibility_result = None
# Oracle (每日一卦) session state
if "oracle_mode" not in st.session_state:
    st.session_state.oracle_mode = False
if "oracle_question" not in st.session_state:
    st.session_state.oracle_question = ""
if "oracle_shake_count" not in st.session_state:
    st.session_state.oracle_shake_count = 0
if "oracle_hex_result" not in st.session_state:
    st.session_state.oracle_hex_result = None
if "oracle_used_today" not in st.session_state:
    st.session_state.oracle_used_today = False
if "oracle_usage_date" not in st.session_state:
    st.session_state.oracle_usage_date = None

# ========== Form Input Session State Keys ==========
# These bind to form widgets with key= parameter for auto-update when loading profiles
if "input_gender" not in st.session_state:
    st.session_state.input_gender = "男"
if "input_birth_date" not in st.session_state:
    st.session_state.input_birth_date = date(1990, 1, 1)
if "input_birth_hour" not in st.session_state:
    st.session_state.input_birth_hour = 12
if "input_birth_minute" not in st.session_state:
    st.session_state.input_birth_minute = 0
if "input_lunar_year" not in st.session_state:
    st.session_state.input_lunar_year = 1990
if "input_lunar_month" not in st.session_state:
    st.session_state.input_lunar_month = "1月"
if "input_lunar_day" not in st.session_state:
    st.session_state.input_lunar_day = 1

# Check query parameters for localStorage data
query_params = st.query_params
if "fortune_data" in query_params and not st.session_state.data_loaded_from_storage:
    try:
        encoded_data = query_params["fortune_data"]
        decoded_data = urllib.parse.unquote(encoded_data)
        saved_data = json.loads(decoded_data)
        
        # Restore session state from saved data
        st.session_state.bazi_calculated = saved_data.get("bazi_calculated", False)
        st.session_state.bazi_result = saved_data.get("bazi_result", "")
        st.session_state.time_info = saved_data.get("time_info", "")
        st.session_state.user_context = saved_data.get("user_context", "")
        st.session_state.clicked_topics = set(saved_data.get("clicked_topics", []))
        st.session_state.responses = [tuple(r) for r in saved_data.get("responses", [])]
        st.session_state.birthplace = saved_data.get("birthplace", "未指定")
        st.session_state.gender = saved_data.get("gender", "男")
        st.session_state.is_first_response = saved_data.get("is_first_response", True)
        st.session_state.custom_question_count = saved_data.get("custom_question_count", 0)
        st.session_state.data_loaded_from_storage = True
        
        # Clear query params after loading
        st.query_params.clear()
        st.rerun()
    except Exception as e:
        # If parsing fails, just continue with fresh state
        st.session_state.data_loaded_from_storage = True
        st.query_params.clear()

# Custom CSS for styling
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&display=swap');
    
    /* ===== Base Styles ===== */
    .main {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    }
    
    .stApp {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    }
    
    h1 {
        font-family: 'Noto Serif SC', serif;
        text-align: center;
        color: #FFE57A;
        text-shadow: 0 0 8px rgba(255, 229, 122, 0.6), 0 2px 3px rgba(0, 0, 0, 0.6);
        margin-bottom: 30px;
        font-size: 2.3rem;
        font-weight: 800;
        letter-spacing: 2.5px;
    }
    
    h2, h3, h4, h5 {
        font-family: 'Noto Serif SC', serif;
        color: #FFD700 !important;
        font-weight: 700 !important;
        text-shadow: 0 1px 3px rgba(0,0,0,0.8);
        margin-top: 1.5rem;
        margin-bottom: 1rem;
    }
    
    .bazi-display {
        font-family: 'Noto Serif SC', serif;
        font-size: 2rem;
        text-align: center;
        color: #fff;
        background: linear-gradient(145deg, rgba(255, 215, 0, 0.1), rgba(255, 140, 0, 0.1));
        border: 2px solid rgba(255, 215, 0, 0.3);
        border-radius: 15px;
        padding: 25px;
        margin: 20px 0;
        box-shadow: 0 8px 32px rgba(255, 215, 0, 0.2);
        backdrop-filter: blur(10px);
    }
    
    .time-info {
        font-family: 'Noto Serif SC', serif;
        font-size: 0.95rem;
        text-align: center;
        color: #CCCCCC;
        margin-top: -10px;
        margin-bottom: 20px;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    }
    
    .fortune-text {
        font-family: 'Noto Serif SC', serif;
        font-size: 1.1rem;
        line-height: 1.8;
        color: #e0e0e0;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        padding: 20px;
        margin-top: 10px;
        margin-bottom: 20px;
        word-wrap: break-word;
        overflow-wrap: break-word;
    }
    
    .topic-header {
        font-family: 'Noto Serif SC', serif;
        font-size: 1.35rem;
        font-weight: 700;
        color: #ffd700;
        border-left: 5px solid #ffd700;
        padding-left: 15px;
        margin-top: 30px;
        margin-bottom: 15px;
        text-shadow: 0 1px 3px rgba(0,0,0,0.5);
    }
    
    .stButton > button {
        background: linear-gradient(145deg, #ffd700, #ff8c00);
        color: #1a1a2e;
        font-family: 'Noto Serif SC', serif;
        font-size: 1rem;
        font-weight: bold;
        border: none;
        border-radius: 15px;
        padding: 10px 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
        min-height: 44px; /* Touch-friendly tap target */
    }
    
    .stButton > button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(255, 215, 0, 0.6);
    }
    
    .stDateInput label, .stSlider label, .stSelectbox label, .stTextInput label, .stCheckbox label {
        color: #ffd700 !important;
        font-family: 'Noto Serif SC', serif;
    }
    
    .stSlider > div > div {
        background-color: rgba(255, 215, 0, 0.3);
    }
    
    div[data-testid="stSliderTickBarMin"], 
    div[data-testid="stSliderTickBarMax"] {
        color: #ffd700;
    }
    
    .sidebar-title {
        font-family: 'Noto Serif SC', serif;
        color: #ffd700;
        font-size: 1.2rem;
        margin-bottom: 10px;
    }
    
    .section-label {
        font-family: 'Noto Serif SC', serif;
        color: #FFF5CC;
        font-size: 1rem;
        margin-bottom: 5px;
        font-weight: 500;
    }
    
    .api-section {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        padding: 15px;
        margin: 15px 0;
    }
    
    .quota-warning {
        color: #ff6b6b;
        font-family: 'Noto Serif SC', serif;
        padding: 10px;
        background: rgba(255, 107, 107, 0.1);
        border-radius: 8px;
        margin: 10px 0;
    }
    
    /* ===== SVG Chart Responsive Container ===== */
    .bazi-chart-container {
        display: block;
        width: 100%;
        margin-bottom: 20px;
        overflow-x: auto;
        overflow-y: hidden;
        -webkit-overflow-scrolling: touch;
        text-align: center;
    }
    
    .bazi-chart-container svg {
        display: block;
        margin: 0 auto;
        width: 100%;
        max-width: 480px;
        height: auto;
    }
    
    /* Mobile SVG - ensure it fits screen */
    @media screen and (max-width: 500px) {
        .bazi-chart-container {
            padding: 0 5px;
        }
        
        .bazi-chart-container svg {
            width: 100%;
            max-width: 100%;
        }
    }
    
    /* ===== Mobile Responsive Styles ===== */
    @media screen and (max-width: 768px) {
        /* Title */
        h1 {
            font-size: 1.6rem;
            margin-bottom: 20px;
            padding: 0 10px;
        }
        
        /* Main container padding */
        .main .block-container {
            padding: 1rem 0.5rem !important;
        }
        
        /* Bazi display */
        .bazi-display {
            font-size: 1.4rem;
            padding: 15px 10px;
            margin: 10px 0;
        }
        
        /* Time info */
        .time-info {
            font-size: 0.75rem;
            padding: 0 5px;
            line-height: 1.5;
        }
        
        /* Fortune text */
        .fortune-text {
            font-size: 0.95rem;
            line-height: 1.7;
            padding: 15px 12px;
        }
        
        /* Topic header */
        .topic-header {
            font-size: 1.1rem;
            padding-left: 10px;
            margin-top: 15px;
        }
        
        /* Section labels */
        .section-label {
            font-size: 0.9rem;
        }
        
        /* Buttons - make them full width on mobile */
        .stButton > button {
            font-size: 0.9rem;
            padding: 12px 10px;
            min-height: 48px; /* Larger tap target for mobile */
            width: 100%;
        }
        
        /* Select boxes */
        .stSelectbox > div > div {
            font-size: 0.9rem;
        }
        
        /* Radio buttons - make horizontal options wrap nicely */
        .stRadio > div {
            flex-wrap: wrap;
            gap: 8px;
        }
        
        .stRadio > div > label {
            font-size: 0.9rem;
            padding: 8px 12px;
        }
        
        /* Hide sidebar by default on mobile */
        [data-testid="stSidebar"] {
            min-width: 0px;
        }
        
        /* Columns - stack vertically on mobile */
        [data-testid="column"] {
            width: 100% !important;
            flex: 1 1 100% !important;
            min-width: 100% !important;
        }
        
        /* Expander */
        .streamlit-expanderHeader {
            font-size: 0.9rem;
        }
        
        /* Date input */
        .stDateInput > div {
            max-width: 100%;
        }
        
        /* API settings */
        .api-section {
            padding: 10px;
        }
    }
    
    /* ===== Small Mobile (iPhone SE, etc.) ===== */
    @media screen and (max-width: 375px) {
        h1 {
            font-size: 1.4rem;
        }
        
        .bazi-display {
            font-size: 1.2rem;
            padding: 12px 8px;
        }
        
        .fortune-text {
            font-size: 0.9rem;
            padding: 12px 10px;
        }
        
        .topic-header {
            font-size: 1rem;
        }
        
        .stButton > button {
            font-size: 0.85rem;
            padding: 10px 8px;
        }
    }
    
    /* ===== Tablet Landscape ===== */
    @media screen and (min-width: 769px) and (max-width: 1024px) {
        .main .block-container {
            padding: 2rem 1.5rem !important;
        }
        
        h1 {
            font-size: 1.9rem;
        }
        
        .fortune-text {
            font-size: 1rem;
        }
    }
    
    /* ===== Improve touch scrolling ===== */
    .main {
        -webkit-overflow-scrolling: touch;
    }
    
    /* ===== Fix button grid on mobile ===== */
    @media screen and (max-width: 768px) {
        /* Make button rows 2x2 grid instead of 4 columns */
        [data-testid="stHorizontalBlock"] {
            flex-wrap: wrap !important;
            gap: 8px !important;
        }
        
        [data-testid="stHorizontalBlock"] > [data-testid="column"] {
            flex: 1 1 45% !important;
            min-width: 45% !important;
            max-width: 48% !important;
        }
    }
    
    /* ===== Improve radio button appearance on mobile ===== */
    @media screen and (max-width: 768px) {
        div[data-testid="stRadio"] > div {
            gap: 4px;
        }
        
        div[data-testid="stRadio"] label {
            padding: 10px 16px !important;
            border-radius: 20px;
            background: rgba(255, 215, 0, 0.1);
            border: 1px solid rgba(255, 215, 0, 0.3);
            color: #FFFFFF !important;
        }
        
        div[data-testid="stRadio"] label:has(input:checked) {
            background: rgba(255, 215, 0, 0.3);
            border-color: #ffd700;
        }
    }
    
    /* ===== Radio button text contrast (all screens) ===== */
    div[data-testid="stRadio"] label span {
        color: #FFFFFF !important;
    }
    
    div[data-testid="stRadio"] label p {
        color: #FFFFFF !important;
    }
    
    /* ===== Expander header contrast ===== */
    .streamlit-expanderHeader {
        color: #FFFFFF !important;
    }
    
    .streamlit-expanderHeader p {
        color: #FFFFFF !important;
    }
    
    details summary span {
        color: #FFFFFF !important;
    }
    
    /* ===== Mobile-friendly select dropdowns ===== */
    @media screen and (max-width: 768px) {
        .stSelectbox [data-baseweb="select"] {
            min-height: 44px;
        }
        
        .stSelectbox [data-baseweb="select"] > div {
            font-size: 1rem;
        }
        
        /* Searchable city input styling */
        .stTextInput input {
            min-height: 44px;
            font-size: 1rem;
        }
        
        .stTextInput input::placeholder {
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.9rem;
        }
    }
    
    /* ===== City search input styling (all screens) ===== */
    .stTextInput input[placeholder*="城市"] {
        background: rgba(255, 215, 0, 0.05);
        border: 1px solid rgba(255, 215, 0, 0.3);
        border-radius: 8px;
    }
    
    .stTextInput input[placeholder*="城市"]:focus {
        border-color: #ffd700;
        box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.2);
    }
    
    /* ===== Viewport meta optimization ===== */
    @viewport {
        width: device-width;
        zoom: 1;
    }
</style>
""", unsafe_allow_html=True)

# Initialize database on startup
init_db()

# Profile session state initialization for Input-First pattern
if "loaded_profile" not in st.session_state:
    st.session_state.loaded_profile = None
if "loaded_profile_id" not in st.session_state:
    st.session_state.loaded_profile_id = None
if "pending_profile_load" not in st.session_state:
    st.session_state.pending_profile_load = None  # Profile to load on next rerun


def calculate_and_store_single(
    birthday: date,
    final_hour: int,
    final_minute: int,
    longitude: float,
    gender: str,
    birthplace: str,
):
    """Calculate Bazi and store all derived session state for single-person mode."""
    bazi_result, time_info, pattern_info = calculate_bazi(
        birthday.year,
        birthday.month,
        birthday.day,
        final_hour,
        final_minute,
        longitude,
    )

    st.session_state.bazi_calculated = True
    st.session_state.has_result = True  # Controls page display
    st.session_state.bazi_result = bazi_result
    st.session_state.time_info = time_info
    st.session_state.pattern_info = pattern_info
    st.session_state.birthplace = birthplace if birthplace != "不选择 (使用北京时间)" else "未指定"
    st.session_state.gender = gender

    current_time = datetime.now().strftime("%Y年%m月%d日 %H:%M")
    birth_datetime = f"{birthday.year}年{birthday.month}月{birthday.day}日 {final_hour:02d}:{final_minute:02d}"
    st.session_state.birth_datetime = birth_datetime
    st.session_state.user_context = build_user_context(
        bazi_result,
        gender,
        st.session_state.birthplace,
        current_time,
        birth_datetime,
        pattern_info,
        birthday.year,
    )

    chart_generator = BaziChartGenerator()
    ten_gods = pattern_info.get("ten_gods", {})
    hidden_stems_info = pattern_info.get("hidden_stems", {})
    day_master = pattern_info.get("day_master", "")

    def get_hidden_with_gods(branch_name):
        """Get hidden stems list with ten god for each."""
        from logic import BaziPatternCalculator
        calc = BaziPatternCalculator()
        branch_hidden = hidden_stems_info.get(branch_name, [])
        result = []
        for stem in branch_hidden:
            if day_master:
                god = calc.get_ten_god(day_master, stem)
                result.append((stem, god))
            else:
                result.append((stem, ""))
        return result

    chart_data = {
        "gender": "乾造" if gender == "男" else "坤造",
        "year": {
            "stem": pattern_info.get("year_pillar", "")[0] if pattern_info.get("year_pillar") else "?",
            "branch": pattern_info.get("year_pillar", "")[1] if len(pattern_info.get("year_pillar", "")) > 1 else "?",
            "stem_ten_god": ten_gods.get("年干", ""),
            "hidden_stems": get_hidden_with_gods("年支藏干"),
        },
        "month": {
            "stem": pattern_info.get("month_pillar", "")[0] if pattern_info.get("month_pillar") else "?",
            "branch": pattern_info.get("month_pillar", "")[1] if len(pattern_info.get("month_pillar", "")) > 1 else "?",
            "stem_ten_god": ten_gods.get("月干", ""),
            "hidden_stems": get_hidden_with_gods("月支藏干"),
        },
        "day": {
            "stem": pattern_info.get("day_pillar", "")[0] if pattern_info.get("day_pillar") else "?",
            "branch": pattern_info.get("day_pillar", "")[1] if len(pattern_info.get("day_pillar", "")) > 1 else "?",
            "stem_ten_god": "日主",
            "hidden_stems": get_hidden_with_gods("日支藏干"),
        },
        "hour": {
            "stem": pattern_info.get("hour_pillar", "")[0] if pattern_info.get("hour_pillar") else "?",
            "branch": pattern_info.get("hour_pillar", "")[1] if len(pattern_info.get("hour_pillar", "")) > 1 else "?",
            "stem_ten_god": ten_gods.get("时干", ""),
            "hidden_stems": get_hidden_with_gods("时支藏干"),
        },
    }
    st.session_state.bazi_svg = chart_generator.generate_chart(chart_data)

    pillars = [
        pattern_info.get("year_pillar", ""),
        pattern_info.get("month_pillar", ""),
        pattern_info.get("day_pillar", ""),
        pattern_info.get("hour_pillar", ""),
    ]
    energy_calc = BaziEnergyCalculator()
    energy_data = energy_calc.calculate_energy(pillars)
    st.session_state.energy_data = energy_data

    energy_chart_gen = EnergyPieChartGenerator()
    st.session_state.energy_svg = energy_chart_gen.generate_chart(energy_data)

    dominant_element, dominant_pct = energy_calc.get_dominant_element(pillars)
    weakest_element, weakest_pct = energy_calc.get_weakest_element(pillars)
    st.session_state.dominant_element = (dominant_element, dominant_pct)
    st.session_state.weakest_element = (weakest_element, weakest_pct)

    energy_context = f"""
【五行能量分布】(System Calculated)
- 木: {energy_data['木']['score']}分 ({int(energy_data['木']['pct'] * 100)}%)
- 火: {energy_data['火']['score']}分 ({int(energy_data['火']['pct'] * 100)}%)
- 土: {energy_data['土']['score']}分 ({int(energy_data['土']['pct'] * 100)}%)
- 金: {energy_data['金']['score']}分 ({int(energy_data['金']['pct'] * 100)}%)
- 水: {energy_data['水']['score']}分 ({int(energy_data['水']['pct'] * 100)}%)
- **最强五行**: {dominant_element} ({int(dominant_pct * 100)}%)
- **最弱五行**: {weakest_element} ({int(weakest_pct * 100)}%)
⚠️ 请根据此五行能量分布分析用户的健康、性格倾向和开运建议。
"""
    st.session_state.user_context += energy_context

    return {
        "chart_generator": chart_generator,
        "pattern_info": pattern_info,
        "bazi_result": bazi_result,
    }


def reset_session_state(clear_storage: bool) -> None:
    """Reset app state; optionally clear browser storage."""
    to_clear = [
        # Widget keys
        "input_gender_widget",
        "input_birth_date_widget",
        "input_birth_hour_widget",
        "input_birth_minute_widget",
        "profile_search_input",
        "save_profile_id_input",
        "partner_gender",
        "partner_cal_radio",
        "partner_birthday",
        "partner_lunar_year",
        "partner_lunar_month",
        "partner_lunar_day",
        "partner_time_radio",
        "partner_hour",
        "partner_minute",
        "partner_shichen",
        "main_city_search",
        "main_city_select",
        "partner_city_search",
        "partner_city_select",
    ]
    for key in to_clear:
        st.session_state.pop(key, None)

    st.session_state.bazi_calculated = False
    st.session_state.has_result = False
    st.session_state.bazi_result = ""
    st.session_state.time_info = ""
    st.session_state.user_context = ""
    st.session_state.clicked_topics = set()
    st.session_state.responses = []
    st.session_state.show_custom_input = False
    st.session_state.custom_question_count = 0
    st.session_state.time_mode = "exact"
    st.session_state.calendar_mode = "solar"
    st.session_state.is_first_response = True
    st.session_state.scroll_to_topic = None
    st.session_state.loaded_profile = None
    st.session_state.loaded_profile_id = None
    st.session_state.pending_profile_load = None
    st.session_state.pattern_info = None
    st.session_state.bazi_svg = None
    st.session_state.energy_data = None
    st.session_state.energy_svg = None
    st.session_state.dominant_element = None
    st.session_state.weakest_element = None
    st.session_state.birthplace = "未指定"
    st.session_state.gender = "男"
    st.session_state.birth_datetime = ""
    st.session_state.compatibility_mode = False
    st.session_state.partner_bazi = None
    st.session_state.partner_info = None
    st.session_state.partner_pattern_info = None
    st.session_state.compatibility_result = None
    st.session_state.couple_svg = None
    st.session_state.stored_partner_gender = None
    st.session_state.stored_relation_type = None
    st.session_state.oracle_mode = False
    st.session_state.oracle_question = ""
    st.session_state.oracle_shake_count = 0
    st.session_state.oracle_hex_result = None
    st.session_state.oracle_used_today = False
    st.session_state.oracle_usage_date = None

    st.session_state.input_gender = "男"
    st.session_state.input_birth_date = date(1990, 1, 1)
    st.session_state.input_birth_hour = 12
    st.session_state.input_birth_minute = 0
    st.session_state.input_lunar_year = 1990
    st.session_state.input_lunar_month = "1月"
    st.session_state.input_lunar_day = 1
    st.session_state.partner_calendar_mode = "solar"
    st.session_state.partner_time_mode = "exact"

    st.session_state.data_loaded_from_storage = True
    st.query_params.clear()

    if clear_storage:
        st.session_state.clear_storage_requested = True


def reset_for_recalc() -> None:
    """Reset analysis outputs but keep current profile inputs."""
    st.session_state.bazi_calculated = False
    st.session_state.has_result = False
    st.session_state.bazi_result = ""
    st.session_state.time_info = ""
    st.session_state.user_context = ""
    st.session_state.clicked_topics = set()
    st.session_state.responses = []
    st.session_state.show_custom_input = False
    st.session_state.custom_question_count = 0
    st.session_state.is_first_response = True
    st.session_state.scroll_to_topic = None
    st.session_state.pattern_info = None
    st.session_state.bazi_svg = None
    st.session_state.energy_data = None
    st.session_state.energy_svg = None
    st.session_state.dominant_element = None
    st.session_state.weakest_element = None
    st.session_state.birth_datetime = ""
    st.session_state.oracle_mode = False
    st.session_state.oracle_question = ""
    st.session_state.oracle_shake_count = 0
    st.session_state.oracle_hex_result = None
    st.session_state.oracle_used_today = False
    st.session_state.oracle_usage_date = None


def reset_for_new_profile() -> None:
    """Clear loaded profile and return to initial input page."""
    reset_session_state(clear_storage=False)
    st.session_state.loaded_profile = None
    st.session_state.loaded_profile_id = None


def load_profile_callback(profile_data: dict, profile_id: str):
    """
    Callback function to load profile data into session state.
    This updates all input keys and sets has_result flag.
    MUST be called before any UI rendering for proper updates.
    """
    # 1. Update form input session state keys
    st.session_state.input_gender = profile_data.get("gender", "男")
    
    # Handle date - either solar or lunar
    if profile_data.get("is_lunar", False):
        st.session_state.calendar_mode = "lunar"
        st.session_state.input_lunar_year = profile_data.get("birth_year", 1990)
        st.session_state.input_lunar_month = f"{profile_data.get('birth_month', 1)}月"
        st.session_state.input_lunar_day = profile_data.get("birth_day", 1)
    else:
        st.session_state.calendar_mode = "solar"
        try:
            st.session_state.input_birth_date = date(
                profile_data.get("birth_year", 1990),
                profile_data.get("birth_month", 1),
                profile_data.get("birth_day", 1)
            )
        except:
            st.session_state.input_birth_date = date(1990, 1, 1)
    
    # Handle time
    birth_hour_str = profile_data.get("birth_hour", "12:00")
    if birth_hour_str and ":" in birth_hour_str:
        try:
            h, m = birth_hour_str.split(":")
            st.session_state.input_birth_hour = int(h)
            st.session_state.input_birth_minute = int(m)
            st.session_state.time_mode = "exact"
        except:
            st.session_state.input_birth_hour = 12
            st.session_state.input_birth_minute = 0
    elif birth_hour_str and "时" in birth_hour_str:
        # Shichen format
        st.session_state.time_mode = "shichen"
        st.session_state.input_birth_hour = 12  # Fallback
    
    # Store loaded profile reference
    st.session_state.loaded_profile = profile_data
    st.session_state.loaded_profile_id = profile_id
    
    # 2. Restore session data if available (bazi results, chat history, etc.)
    if profile_data.get("session_data"):
        if restore_session_state(profile_data["session_data"]):
            # restore_session_state sets bazi_calculated = True
            st.session_state.has_result = True
            return

    # 3. If no session data, auto-calculate to enter results page
    try:
        birth_year = int(profile_data.get("birth_year", 1990))
        birth_month = int(profile_data.get("birth_month", 1))
        birth_day = int(profile_data.get("birth_day", 1))
        is_lunar = bool(profile_data.get("is_lunar", False))

        if is_lunar:
            lunar_date = Lunar.fromYmd(birth_year, birth_month, birth_day)
            solar_date = lunar_date.getSolar()
            birthday = date(solar_date.getYear(), solar_date.getMonth(), solar_date.getDay())
        else:
            birthday = date(birth_year, birth_month, birth_day)

        birth_hour_str = profile_data.get("birth_hour", "12:00")
        if birth_hour_str and ":" in birth_hour_str:
            h, m = birth_hour_str.split(":")
            final_hour = int(h)
            final_minute = int(m)
        elif birth_hour_str and "时" in birth_hour_str:
            final_hour = get_shichen_mid_hour(birth_hour_str)
            final_minute = 0
        else:
            final_hour = 12
            final_minute = 0

        birthplace = profile_data.get("city") or "未指定"
        longitude = CHINA_CITIES.get(birthplace)
        gender = profile_data.get("gender", "男")

        calculate_and_store_single(
            birthday=birthday,
            final_hour=final_hour,
            final_minute=final_minute,
            longitude=longitude,
            gender=gender,
            birthplace=birthplace,
        )
    except Exception as e:
        st.error(f"档案自动加载失败: {str(e)}")
    
    # 3. Clear cache if needed
    # st.cache_data.clear()  # Uncomment if caching causes issues


# ========== CRITICAL: Handle Pending Profile Load BEFORE Any UI ==========
# This ensures profile data is loaded into session state before widgets render
if st.session_state.pending_profile_load is not None:
    pending = st.session_state.pending_profile_load
    st.session_state.pending_profile_load = None  # Clear the flag
    load_profile_callback(pending["profile"], pending["profile_id"])
    st.rerun()  # Rerun to render with updated state

# Sidebar with Profile Search (Input-First Pattern)
with st.sidebar:
    # ========== Profile Search Section (Input-First) ==========
    st.markdown('<p class="sidebar-title">🔍 查找档案</p>', unsafe_allow_html=True)
    
    search_id = st.text_input(
        "输入档案ID搜索",
        placeholder="例如: Boss123",
        key="profile_search_input",
        label_visibility="collapsed"
    )
    
    col_search, col_delete = st.columns([2, 1])
    
    with col_search:
        if st.button("📥 加载", use_container_width=True):
            if search_id.strip():
                profile = get_profile_by_id(search_id.strip())
                if profile:
                    # Use pending load mechanism for proper session state update
                    # This ensures load_profile_callback runs BEFORE any UI renders
                    st.session_state.pending_profile_load = {
                        "profile": profile,
                        "profile_id": search_id.strip()
                    }
                    st.rerun()  # Rerun to trigger the callback at top of script
                else:
                    st.error("未找到此ID")
            else:
                st.warning("请输入ID")
    
    with col_delete:
        if st.button("🗑️", use_container_width=True, help="删除此档案"):
            if search_id.strip():
                if delete_profile(search_id.strip()):
                    st.success("已删除")
                    if st.session_state.loaded_profile_id == search_id.strip():
                        st.session_state.loaded_profile = None
                        st.session_state.loaded_profile_id = None
                    st.rerun()
                else:
                    st.error("未找到")
    
    st.markdown("---")
    
    # ========== Save Profile Section ==========
    st.markdown('<p class="sidebar-title">💾 保存档案</p>', unsafe_allow_html=True)
    
    save_profile_id = st.text_input(
        "输入新档案ID",
        placeholder="例如: MyBoss",
        key="save_profile_id_input",
        label_visibility="collapsed"
    )
    
    if st.button("💾 保存当前档案", use_container_width=True):
        if save_profile_id.strip():
            # Check if profile ID already exists
            if profile_exists(save_profile_id.strip()):
                st.error("此ID已存在，请换一个")
            else:
                # Get current form values from session state or use defaults
                # Note: We need to save from the current form state, which might be in session_state after rerun
                # For now, we'll save the loaded_profile data if available, or the last calculated data
                if st.session_state.bazi_calculated:
                    # If bazi is already calculated, we have session data to save
                    # Try to get birth info from session state
                    birth_datetime = st.session_state.get("birth_datetime", "")
                    gender = st.session_state.get("gender", "男")
                    birthplace = st.session_state.get("birthplace", None)
                    
                    # Parse birth_datetime to extract year, month, day, hour
                    try:
                        # birth_datetime format is usually like "1990年1月1日 12:00"
                        match = re.search(r'(\d+)年(\d+)月(\d+)日', birth_datetime)
                        if match:
                            b_year = int(match.group(1))
                            b_month = int(match.group(2))
                            b_day = int(match.group(3))
                        else:
                            st.error("无法解析出生日期，请先点击'开始算命'")
                            st.stop()
                        
                        # Extract hour if available
                        hour_match = re.search(r'(\d{1,2})[:：](\d{2})', birth_datetime)
                        if hour_match:
                            birth_hour = f"{hour_match.group(1)}:{hour_match.group(2)}"
                        else:
                            birth_hour = "12:00"
                        
                        # Save profile with current session data
                        success = save_profile(
                            profile_id=save_profile_id.strip(),
                            gender=gender,
                            birth_year=b_year,
                            birth_month=b_month,
                            birth_day=b_day,
                            birth_hour=birth_hour,
                            city=birthplace,
                            is_lunar=False  # Assume solar for now
                        )
                        
                        if success:
                            # Also save session data for instant restore
                            session_data_json = serialize_session_state()
                            update_session_data(save_profile_id.strip(), session_data_json)
                            st.session_state.loaded_profile_id = save_profile_id.strip()
                            st.success(f"✓ 已保存为 {save_profile_id.strip()}")
                            st.rerun()
                        else:
                            st.error("保存失败")
                    except Exception as e:
                        st.error(f"保存出错: {str(e)}")
                else:
                    st.warning("请先点击'开始算命'计算八字后再保存")
        else:
            st.warning("请输入档案ID")
    
    # Show loaded profile info
    if st.session_state.loaded_profile:
        profile = st.session_state.loaded_profile
        st.markdown(f"""
        <div style="background: rgba(255, 215, 0, 0.1); border-radius: 8px; padding: 10px; margin-top: 10px;">
            <small style="color: #ffd700;">📋 当前: <b>{st.session_state.loaded_profile_id}</b></small><br>
            <small style="color: #ccc;">{profile['gender']} | {profile['birth_year']}年{profile['birth_month']}月{profile['birth_day']}日</small>
        </div>
        """, unsafe_allow_html=True)
        
        if st.button("✕ 填新档案", use_container_width=True):
            reset_for_new_profile()
            st.rerun()
    
    st.markdown("---")
    st.markdown('<p class="sidebar-title">⚙️ 设置</p>', unsafe_allow_html=True)
    
    # Reset button
    if st.button("🔄 重算一次", use_container_width=True):
        if st.session_state.loaded_profile_id:
            update_session_data(st.session_state.loaded_profile_id, "")
        reset_for_recalc()
        st.rerun()
    
    # Clear storage button
    if st.button("🗑️ 清除浏览器记录", use_container_width=True):
        reset_session_state(clear_storage=True)
        st.rerun()
    
    st.markdown("""
    <small style="color: #888;">
    💡 默认 API 每会话限制 """ + str(DEFAULT_API_DAILY_LIMIT) + """ 次请求。
    </small>
    """, unsafe_allow_html=True)
    st.markdown("""
    <small style="color: #666;">
    💾 在主界面输入信息后可保存为档案
    </small>
    """, unsafe_allow_html=True)
    app_version = get_app_version()
    st.markdown(f"""
    <small style="color: #666;">
    👤 作者：@daisyluvr | ✉️ daisylur8@gmail.com | 版本：{app_version}
    </small>
    """, unsafe_allow_html=True)

# Handle clear storage request - inject JavaScript to clear localStorage
if st.session_state.clear_storage_requested:
    components.html('''
        <script>
            localStorage.removeItem('fortune_teller_data');
            console.log('localStorage cleared');
        </script>
    ''', height=0)
    st.session_state.clear_storage_requested = False

# Title
st.markdown("<h1>🔮 命理大师</h1>", unsafe_allow_html=True)

# ========== Loaded Profile Notification ==========
# If a profile was loaded from sidebar, show notification and pre-fill values will be used
if st.session_state.loaded_profile and not st.session_state.has_result:
    profile = st.session_state.loaded_profile
    st.markdown(f"""
    <div style="background: rgba(76, 175, 80, 0.1); border: 1px solid rgba(76, 175, 80, 0.3); 
                border-radius: 10px; padding: 12px; margin-bottom: 15px;">
        <span style="color: #4CAF50;">✓ 已加载档案:</span>
        <strong style="color: #ffd700;">{st.session_state.loaded_profile_id}</strong>
        <span style="color: #ccc;"> ({profile['gender']} | {profile['birth_year']}年{profile['birth_month']}月{profile['birth_day']}日)</span>
    </div>
    """, unsafe_allow_html=True)

# ========== MAIN INTERFACE: Mutually Exclusive Pages ==========
# Use has_result to determine which page to show
if not st.session_state.has_result:
    # Mode Toggle (Single vs Compatibility)
    st.markdown('<p class="section-label">💫 分析模式</p>', unsafe_allow_html=True)
    mode_selection = st.radio(
        "分析模式",
        options=["单人模式", "合盘模式 💕"],
        index=1 if st.session_state.compatibility_mode else 0,
        horizontal=True,
        label_visibility="collapsed"
    )
    
    # Update session state based on mode selection
    if mode_selection == "合盘模式 💕" and not st.session_state.compatibility_mode:
        st.session_state.compatibility_mode = True
        st.rerun()
    elif mode_selection == "单人模式" and st.session_state.compatibility_mode:
        st.session_state.compatibility_mode = False
        st.rerun()
    
    st.markdown("---")
    
    # Show form label based on mode
    if st.session_state.compatibility_mode:
        st.markdown("### 👤 甲方 (我的信息)")
    
    # Gender Selection - bound to session state for auto-update on profile load
    st.markdown('<p class="section-label">👤 性别</p>', unsafe_allow_html=True)
    
    gender = st.selectbox(
        "性别",
        options=["男", "女"],
        index=0 if st.session_state.input_gender == "男" else 1,
        key="input_gender_widget",
        label_visibility="collapsed"
    )
    # Sync widget value to session state
    st.session_state.input_gender = gender


    # Birth Date Input
    st.markdown('<p class="section-label">📅 出生日期</p>', unsafe_allow_html=True)
    
    # Calendar type radio button (similar to time mode)
    calendar_mode = st.radio(
        "日历类型",
        options=["阳历", "农历"],
        index=0 if st.session_state.calendar_mode == "solar" else 1,
        horizontal=True,
        label_visibility="collapsed"
    )
    
    # Update session state based on radio selection
    if calendar_mode == "阳历" and st.session_state.calendar_mode != "solar":
        st.session_state.calendar_mode = "solar"
        st.rerun()
    elif calendar_mode == "农历" and st.session_state.calendar_mode != "lunar":
        st.session_state.calendar_mode = "lunar"
        st.rerun()
    
    # Show appropriate date input based on calendar mode
    if st.session_state.calendar_mode == "solar":
        # Solar calendar - use Chinese selectboxes for consistent locale
        solar_col1, solar_col2, solar_col3 = st.columns(3)
        current_year = date.today().year
        default_date = st.session_state.input_birth_date

        year_options = list(range(current_year, 1899, -1))
        with solar_col1:
            solar_year = st.selectbox(
                "阳历年",
                options=year_options,
                index=year_options.index(default_date.year) if default_date.year in year_options else 0,
                format_func=lambda x: f"{x}年"
            )

        with solar_col2:
            solar_month = st.selectbox(
                "阳历月",
                options=list(range(1, 13)),
                index=default_date.month - 1,
                format_func=lambda x: f"{x}月"
            )

        days_in_month = calendar.monthrange(solar_year, solar_month)[1]
        day_options = list(range(1, days_in_month + 1))
        default_day = min(default_date.day, days_in_month)
        with solar_col3:
            solar_day = st.selectbox(
                "阳历日",
                options=day_options,
                index=day_options.index(default_day),
                format_func=lambda x: f"{x}日"
            )

        birthday = date(solar_year, solar_month, solar_day)
        st.session_state.input_birth_date = birthday
    else:
        # Lunar calendar - use dropdowns
        lunar_col1, lunar_col2, lunar_col3 = st.columns(3)
        
        # Year selection (1900-current year)
        current_year = date.today().year
        with lunar_col1:
            lunar_year = st.selectbox(
                "农历年",
                options=list(range(current_year, 1899, -1)),  # Descending order
                index=current_year - 1990  # Default to 1990
            )
        
        # Check if this lunar year has a leap month
        lunar_year_obj = LunarYear.fromYear(lunar_year)
        leap_month = lunar_year_obj.getLeapMonth()  # 0 if no leap month
        
        # Build month options
        month_options = []
        for m in range(1, 13):
            month_options.append(f"{m}月")
            if leap_month == m:
                month_options.append(f"闰{m}月")
        
        with lunar_col2:
            lunar_month_str = st.selectbox(
                "农历月",
                options=month_options,
                index=0
            )
        
        # Parse the selected month
        if lunar_month_str.startswith("闰"):
            is_leap_month = True
            lunar_month = int(lunar_month_str[1:-1])  # Extract number from "闰X月"
        else:
            is_leap_month = False
            lunar_month = int(lunar_month_str[:-1])  # Extract number from "X月"
        
        # Day selection (1-30, lunar months have max 30 days)
        with lunar_col3:
            lunar_day = st.selectbox(
                "农历日",
                options=list(range(1, 31)),
                index=0,
                format_func=lambda x: f"初{x}" if x <= 10 else (f"十{['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][x-11]}" if x <= 20 else (f"廿{['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][x-21]}" if x < 30 else "三十"))
            )
        
        # Convert lunar date to solar date
        try:
            # Use negative month number for leap months
            lunar_month_param = -lunar_month if is_leap_month else lunar_month
            lunar_date = Lunar.fromYmd(lunar_year, lunar_month_param, lunar_day)
            solar_date = lunar_date.getSolar()
            birthday = date(solar_date.getYear(), solar_date.getMonth(), solar_date.getDay())
            
            # Show the converted solar date
            st.caption(f"📅 对应阳历: {birthday.year}年{birthday.month}月{birthday.day}日")
        except Exception as e:
            st.error(f"农历日期无效: {str(e)}")
            birthday = date(1990, 1, 1)  # Fallback

    # Time Input Section with radio button toggle
    st.markdown('<p class="section-label">⏰ 出生时间</p>', unsafe_allow_html=True)

    time_mode = st.radio(
        "时间类型",
        options=["精确时间", "时辰"],
        index=0 if st.session_state.time_mode == "exact" else 1,
        horizontal=True,
        label_visibility="collapsed"
    )
    
    # Update session state based on radio selection
    if time_mode == "精确时间" and st.session_state.time_mode != "exact":
        st.session_state.time_mode = "exact"
        st.rerun()
    elif time_mode == "时辰" and st.session_state.time_mode != "shichen":
        st.session_state.time_mode = "shichen"
        st.rerun()

    # Show appropriate time input based on mode
    if st.session_state.time_mode == "exact":
        time_col_h, time_col_m = st.columns(2)
        with time_col_h:
            birth_hour = st.selectbox(
                "小时",
                options=list(range(24)),
                index=st.session_state.input_birth_hour,
                key="input_birth_hour_widget",
                format_func=lambda x: f"{x:02d}"
            )
            st.session_state.input_birth_hour = birth_hour
        with time_col_m:
            # Calculate minute index (options are 0, 5, 10, ... 55)
            _minute_options = list(range(0, 60, 5))
            _minute_idx = _minute_options.index(st.session_state.input_birth_minute) if st.session_state.input_birth_minute in _minute_options else 0
            birth_minute = st.selectbox(
                "分钟",
                options=_minute_options,
                index=_minute_idx,
                key="input_birth_minute_widget",
                format_func=lambda x: f"{x:02d}"
            )
            st.session_state.input_birth_minute = birth_minute
        final_hour = birth_hour
        final_minute = birth_minute

    else:  # shichen mode
        shichen = st.selectbox(
            "选择时辰",
            options=list(SHICHEN_HOURS.keys()),
            index=6
        )
        final_hour = get_shichen_mid_hour(shichen)
        final_minute = 0

    # Birthplace Input Section - Searchable Dropdown
    st.markdown('<p class="section-label">📍 出生地点 (用于真太阳时计算)</p>', unsafe_allow_html=True)
    
    birthplace, longitude = searchable_city_select(
        label="选择出生城市",
        key_prefix="main_city"
    )


    # ========== Partner Input Form (Compatibility Mode Only) ==========
    if st.session_state.compatibility_mode:
        st.markdown("---")
        st.markdown("### 💕 乙方 (Ta的信息)")
        
        # Partner Gender
        st.markdown('<p class="section-label">👤 性别</p>', unsafe_allow_html=True)
        partner_gender = st.selectbox(
            "对方性别",
            options=["男", "女"],
            index=1,  # Default to opposite
            label_visibility="collapsed",
            key="partner_gender"
        )
        
        # Relationship Type
        st.markdown('<p class="section-label">💑 二位是什么关系？</p>', unsafe_allow_html=True)
        relation_type = st.selectbox(
            "关系类型",
            options=["恋人/伴侣", "事业合伙人", "知己好友", "尚未确定"],
            index=0,
            label_visibility="collapsed",
            key="relation_type"
        )
        
        # Partner Calendar Mode
        st.markdown('<p class="section-label">📅 出生日期</p>', unsafe_allow_html=True)
        
        # Initialize partner calendar mode
        if "partner_calendar_mode" not in st.session_state:
            st.session_state.partner_calendar_mode = "solar"
        
        partner_calendar_mode = st.radio(
            "乙方日历类型",
            options=["阳历", "农历"],
            index=0 if st.session_state.partner_calendar_mode == "solar" else 1,
            horizontal=True,
            label_visibility="collapsed",
            key="partner_cal_radio"
        )
        
        # Update session state
        if partner_calendar_mode == "阳历" and st.session_state.partner_calendar_mode != "solar":
            st.session_state.partner_calendar_mode = "solar"
            st.rerun()
        elif partner_calendar_mode == "农历" and st.session_state.partner_calendar_mode != "lunar":
            st.session_state.partner_calendar_mode = "lunar"
            st.rerun()
        
        # Partner Birth Date based on calendar mode
        if st.session_state.partner_calendar_mode == "solar":
            partner_birthday = st.date_input(
                "对方出生日期",
                value=date(1992, 1, 1),
                min_value=date(1900, 1, 1),
                max_value=date.today(),
                label_visibility="collapsed",
                key="partner_birthday"
            )
        else:
            # Lunar calendar - use dropdowns
            p_lunar_col1, p_lunar_col2, p_lunar_col3 = st.columns(3)
            
            current_year = date.today().year
            with p_lunar_col1:
                p_lunar_year = st.selectbox(
                    "乙方农历年",
                    options=list(range(current_year, 1899, -1)),
                    index=current_year - 1992,
                    key="partner_lunar_year"
                )
            
            # Check for leap month
            p_lunar_year_obj = LunarYear.fromYear(p_lunar_year)
            p_leap_month = p_lunar_year_obj.getLeapMonth()
            
            p_month_options = []
            for m in range(1, 13):
                p_month_options.append(f"{m}月")
                if p_leap_month == m:
                    p_month_options.append(f"闰{m}月")
            
            with p_lunar_col2:
                p_lunar_month_str = st.selectbox(
                    "乙方农历月",
                    options=p_month_options,
                    index=0,
                    key="partner_lunar_month"
                )
            
            # Parse month
            if p_lunar_month_str.startswith("闰"):
                p_is_leap = True
                p_lunar_month = int(p_lunar_month_str[1:-1])
            else:
                p_is_leap = False
                p_lunar_month = int(p_lunar_month_str[:-1])
            
            with p_lunar_col3:
                p_lunar_day = st.selectbox(
                    "乙方农历日",
                    options=list(range(1, 31)),
                    index=0,
                    format_func=lambda x: f"初{x}" if x <= 10 else (f"十{['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][x-11]}" if x <= 20 else (f"廿{['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][x-21]}" if x < 30 else "三十")),
                    key="partner_lunar_day"
                )
            
            # Convert to solar
            try:
                p_lunar_month_param = -p_lunar_month if p_is_leap else p_lunar_month
                p_lunar_date = Lunar.fromYmd(p_lunar_year, p_lunar_month_param, p_lunar_day)
                p_solar_date = p_lunar_date.getSolar()
                partner_birthday = date(p_solar_date.getYear(), p_solar_date.getMonth(), p_solar_date.getDay())
                st.caption(f"📅 对应阳历: {partner_birthday.year}年{partner_birthday.month}月{partner_birthday.day}日")
            except Exception as e:
                st.error(f"乙方农历日期无效: {str(e)}")
                partner_birthday = date(1992, 1, 1)
        
        # Partner Birth Time - with shichen option
        st.markdown('<p class="section-label">⏰ 出生时间</p>', unsafe_allow_html=True)
        
        if "partner_time_mode" not in st.session_state:
            st.session_state.partner_time_mode = "exact"
        
        partner_time_mode = st.radio(
            "乙方时间类型",
            options=["精确时间", "时辰"],
            index=0 if st.session_state.partner_time_mode == "exact" else 1,
            horizontal=True,
            label_visibility="collapsed",
            key="partner_time_radio"
        )
        
        if partner_time_mode == "精确时间" and st.session_state.partner_time_mode != "exact":
            st.session_state.partner_time_mode = "exact"
            st.rerun()
        elif partner_time_mode == "时辰" and st.session_state.partner_time_mode != "shichen":
            st.session_state.partner_time_mode = "shichen"
            st.rerun()
        
        if st.session_state.partner_time_mode == "exact":
            partner_time_col_h, partner_time_col_m = st.columns(2)
            with partner_time_col_h:
                partner_birth_hour = st.selectbox(
                    "对方小时",
                    options=list(range(24)),
                    index=12,
                    format_func=lambda x: f"{x:02d}",
                    key="partner_hour"
                )
            with partner_time_col_m:
                partner_birth_minute = st.selectbox(
                    "对方分钟",
                    options=list(range(0, 60, 5)),
                    index=0,
                    format_func=lambda x: f"{x:02d}",
                    key="partner_minute"
                )
            partner_final_hour = partner_birth_hour
            partner_final_minute = partner_birth_minute
        else:
            # Shichen mode
            partner_shichen = st.selectbox(
                "乙方时辰",
                options=list(SHICHEN_HOURS.keys()),
                index=6,
                key="partner_shichen"
            )
            partner_final_hour = get_shichen_mid_hour(partner_shichen)
            partner_final_minute = 0
        
        # Partner Birthplace - Searchable Dropdown
        st.markdown('<p class="section-label">📍 出生地点</p>', unsafe_allow_html=True)
        
        partner_birthplace, partner_longitude = searchable_city_select(
            label="对方出生城市",
            key_prefix="partner_city"
        )


    # ========== Save Profile Dialog ==========
    @st.dialog("保存档案")
    def save_profile_dialog():
        """Dialog to save current form values as a profile with user-defined ID."""
        st.markdown("为当前输入的信息设置一个唯一ID，以便日后快速加载。")
        
        new_profile_id = st.text_input(
            "档案ID",
            placeholder="输入字母/数字组合，如: Boss123",
            max_chars=50
        )
        
        col_confirm, col_cancel = st.columns(2)
        with col_confirm:
            if st.button("✓ 确认保存", use_container_width=True, type="primary"):
                if not new_profile_id.strip():
                    st.error("请输入档案ID")
                elif profile_exists(new_profile_id.strip()):
                    st.error("❌ ID已存在，请换一个")
                else:
                    # Get current form values from session state
                    # These need to be captured before dialog opens
                    save_success = save_profile(
                        profile_id=new_profile_id.strip(),
                        gender=st.session_state.get("_save_gender", "男"),
                        birth_year=st.session_state.get("_save_year", 1990),
                        birth_month=st.session_state.get("_save_month", 1),
                        birth_day=st.session_state.get("_save_day", 1),
                        birth_hour=st.session_state.get("_save_hour", "午时 (11:00-13:00)"),
                        city=st.session_state.get("_save_city", None),
                        is_lunar=st.session_state.get("_save_is_lunar", False)
                    )
                    if save_success:
                        # Update session state immediately to sync with daily divination
                        st.session_state.loaded_profile_id = new_profile_id.strip()
                        st.session_state.loaded_profile = {
                            "id": new_profile_id.strip(),
                            "gender": st.session_state.get("_save_gender", "男"),
                            "birth_year": st.session_state.get("_save_year", 1990),
                            "birth_month": st.session_state.get("_save_month", 1),
                            "birth_day": st.session_state.get("_save_day", 1),
                            "birth_hour": st.session_state.get("_save_hour", "12:00"),
                            "city": st.session_state.get("_save_city", None)
                        }
                        
                        st.success(f"✓ 档案 '{new_profile_id.strip()}' 已保存!")
                        st.balloons()
                        import time
                        time.sleep(0.5)  # Give user a moment to see success
                        st.rerun()  # Close dialog by rerunning
                    else:
                        st.error("保存失败")
        
        with col_cancel:
            if st.button("✕ 取消", use_container_width=True):
                st.rerun()

    # Calculate and Save buttons row
    st.markdown("")
    if st.session_state.compatibility_mode:
        # Compatibility mode: only calculate button
        col1, col2, col3 = st.columns([1, 2, 1])
        with col2:
            start_button = st.button("💕 开始合盘分析", use_container_width=True)
        save_clicked = False
    else:
        # Single mode: save + calculate buttons (Save first for better UX)
        col1, col2, col3, col4 = st.columns([1, 1, 1, 1])
        with col2:
            # Store current form values before opening dialog
            if st.button("💾 保存档案", use_container_width=True):
                # Capture current form values to session state for the dialog
                st.session_state["_save_gender"] = gender
                st.session_state["_save_year"] = birthday.year
                st.session_state["_save_month"] = birthday.month
                st.session_state["_save_day"] = birthday.day
                st.session_state["_save_hour"] = st.session_state.time_mode == "shichen" and shichen or f"{final_hour:02d}:00"
                st.session_state["_save_city"] = birthplace if birthplace != "不选择 (使用北京时间)" else None
                st.session_state["_save_is_lunar"] = st.session_state.calendar_mode == "lunar"
                save_profile_dialog()
        with col3:
            start_button = st.button("🎴 开始算命", use_container_width=True)

    # API Configuration (Optional) - Below buttons
    st.markdown("---")
    with st.expander("🤖 AI 模型设置 (可选)", expanded=False):
        st.markdown('<small style="color: #888;">默认使用 Gemini API，如需使用其他模型请在此配置</small>', unsafe_allow_html=True)
        
        provider = st.selectbox(
            "选择 AI 提供商",
            list(AI_PROVIDERS.keys()),
            index=0
        )
        
        provider_config = AI_PROVIDERS[provider]
        
        if provider == "自定义 (Custom)":
            base_url = st.text_input(
                "API Base URL",
                placeholder="https://api.example.com/v1"
            )
            model = st.text_input(
                "模型名称",
                placeholder="model-name"
            )
            api_key = st.text_input(
                "API Key",
                type="password",
                placeholder="输入你的 API Key"
            )
        elif provider == "默认 (Gemini)":
            base_url = DEFAULT_BASE_URL
            model = st.selectbox("选择模型", provider_config["models"])
            api_key = ""  # Will use default
        else:
            base_url = provider_config["base_url"]
            model = st.selectbox("选择模型", provider_config["models"])
            api_key = st.text_input(
                "API Key",
                type="password",
                placeholder="输入你的 API Key"
            )

    # Store API config in session state
    if 'api_config' not in st.session_state:
        st.session_state.api_config = {
            'api_key': DEFAULT_API_KEY,
            'base_url': DEFAULT_BASE_URL,
            'model': DEFAULT_MODEL
        }
    
    # Update API config based on selection
    if provider == "默认 (Gemini)" or (not api_key):
        st.session_state.api_config = {
            'api_key': DEFAULT_API_KEY,
            'base_url': DEFAULT_BASE_URL,
            'model': model if provider == "默认 (Gemini)" else DEFAULT_MODEL
        }
        st.session_state.using_default_api = True
    else:
        st.session_state.api_config = {
            'api_key': api_key,
            'base_url': base_url,
            'model': model
        }
        st.session_state.using_default_api = False


    if start_button:
        result = calculate_and_store_single(
            birthday=birthday,
            final_hour=final_hour,
            final_minute=final_minute,
            longitude=longitude,
            gender=gender,
            birthplace=birthplace,
        )
        chart_generator = result["chart_generator"]
        pattern_info = result["pattern_info"]
        bazi_result = result["bazi_result"]
        
        # ========== Compatibility Mode: Calculate Partner's Bazi ==========
        if st.session_state.compatibility_mode:
            # Calculate partner's Bazi
            partner_bazi_result, partner_time_info, partner_pattern_info = calculate_bazi(
                partner_birthday.year,
                partner_birthday.month,
                partner_birthday.day,
                partner_final_hour,
                partner_final_minute,
                partner_longitude
            )
            
            # Store partner info
            st.session_state.partner_bazi = partner_bazi_result
            st.session_state.partner_pattern_info = partner_pattern_info
            st.session_state.stored_partner_gender = partner_gender
            st.session_state.stored_relation_type = relation_type
            
            # Build partner chart data for couple chart
            partner_chart_data = {
                "year_pillar": (partner_pattern_info.get("year_pillar", "??")[0], partner_pattern_info.get("year_pillar", "??")[1]),
                "month_pillar": (partner_pattern_info.get("month_pillar", "??")[0], partner_pattern_info.get("month_pillar", "??")[1]),
                "day_pillar": (partner_pattern_info.get("day_pillar", "??")[0], partner_pattern_info.get("day_pillar", "??")[1]),
                "hour_pillar": (partner_pattern_info.get("hour_pillar", "??")[0], partner_pattern_info.get("hour_pillar", "??")[1]),
            }
            
            # Build my chart data for couple chart
            my_chart_data = {
                "year_pillar": (pattern_info.get("year_pillar", "??")[0], pattern_info.get("year_pillar", "??")[1]),
                "month_pillar": (pattern_info.get("month_pillar", "??")[0], pattern_info.get("month_pillar", "??")[1]),
                "day_pillar": (pattern_info.get("day_pillar", "??")[0], pattern_info.get("day_pillar", "??")[1]),
                "hour_pillar": (pattern_info.get("hour_pillar", "??")[0], pattern_info.get("hour_pillar", "??")[1]),
            }
            
            # Generate couple chart SVG
            st.session_state.couple_svg = chart_generator.generate_couple_chart(my_chart_data, partner_chart_data)
            
            # Run compatibility analysis
            compatibility_calc = BaziCompatibilityCalculator()
            compat_result = compatibility_calc.analyze_compatibility(my_chart_data, partner_chart_data)
            st.session_state.compatibility_result = compat_result
            
            # Build combined user context for LLM
            partner_birth_dt = f"{partner_birthday.year}年{partner_birthday.month}月{partner_birthday.day}日 {partner_final_hour:02d}:{partner_final_minute:02d}"
            
            # Add compatibility info to user context
            compatibility_context = f"""
【双人合盘信息】

**甲方 (我)：**
{bazi_result}
性别：{gender}

**乙方 (Ta)：**
{partner_bazi_result}
性别：{partner_gender}

**后端计算的日柱关系：**
"""
            for detail in compat_result['details']:
                compatibility_context += f"- {detail}\n"
            
            compatibility_context += f"\n**初步匹配分数：** {compat_result['base_score']}/100\n"
            
            # Append compatibility context to user context
            st.session_state.user_context += compatibility_context
        
        st.rerun()


# Show results if Bazi is calculated
else:
    # Display chart based on mode
    if st.session_state.compatibility_mode and hasattr(st.session_state, 'couple_svg') and st.session_state.couple_svg:
        # Show couple chart in compatibility mode
        st.markdown("### 💕 双人排盘")
        couple_svg_container = f'''
        <div class="bazi-chart-container" style="max-width: 800px;">
            {st.session_state.couple_svg}
        </div>
        '''
        st.markdown(couple_svg_container, unsafe_allow_html=True)
        
        # Show compatibility score preview
        if st.session_state.compatibility_result:
            compat = st.session_state.compatibility_result
            st.markdown(f"""
            <div style="text-align: center; margin: 15px 0; padding: 15px; background: rgba(255, 182, 193, 0.2); border-radius: 10px; border: 1px solid #FFB6C1;">
                <span style="font-size: 1.5rem; color: #FFB6C1;">💕</span>
                <span style="font-size: 1.2rem; color: #fff; margin-left: 10px;">初步匹配分数: <strong style="color: #FFD700;">{compat['base_score']}/100</strong></span>
            </div>
            """, unsafe_allow_html=True)
            
            # Show quick compatibility insights
            if compat['details']:
                for detail in compat['details']:
                    st.markdown(f"<p style='color: #e0e0e0; margin: 5px 0;'>{detail}</p>", unsafe_allow_html=True)
        
        # Show both genders
        st.markdown(f'<div class="time-info">👤 甲方: {st.session_state.gender} | 👤 乙方: {getattr(st.session_state, "stored_partner_gender", "未知")}</div>', unsafe_allow_html=True)
        
    elif hasattr(st.session_state, 'bazi_svg') and st.session_state.bazi_svg:
        # Single person mode - show individual chart
        centered_svg = f'''
        <div class="bazi-chart-container">
            {st.session_state.bazi_svg}
        </div>
        '''
        st.markdown(centered_svg, unsafe_allow_html=True)
        
        if st.session_state.time_info:
            st.markdown(f'<div class="time-info">📐 {st.session_state.time_info} | 出生地: {st.session_state.birthplace} | 性别: {st.session_state.gender}</div>', unsafe_allow_html=True)
        
        # ========== Five Elements Energy Pie Chart ==========
        if hasattr(st.session_state, 'energy_svg') and st.session_state.energy_svg:
            st.markdown("")
            
            # Centered title using HTML
            st.markdown('<h3 style="text-align: center; color: #FFD700; margin-bottom: 10px;">📊 五行能量分布</h3>', unsafe_allow_html=True)
            
            # Render the energy pie chart SVG (centered)
            import base64
            energy_svg_b64 = base64.b64encode(st.session_state.energy_svg.encode()).decode()
            energy_chart_html = f'''
            <div style="display: flex; justify-content: center; margin: 15px 0;">
                <img src="data:image/svg+xml;base64,{energy_svg_b64}" style="max-width: 100%; width: 400px; height: auto;"/>
            </div>
            '''
            st.markdown(energy_chart_html, unsafe_allow_html=True)
            
            # Display strongest and weakest elements using st.metric (centered with CSS)
            if hasattr(st.session_state, 'dominant_element') and hasattr(st.session_state, 'weakest_element'):
                dominant = st.session_state.dominant_element
                weakest = st.session_state.weakest_element
                
                # Element color mapping
                element_colors = {"木": "🟢", "火": "🔴", "土": "🟠", "金": "🟡", "水": "🔵"}
                
                # Centered metrics using HTML instead of st.columns for better alignment
                metrics_html = f'''
                <div style="display: flex; justify-content: center; gap: 60px; margin: 20px 0;">
                    <div style="text-align: center;">
                        <div style="color: #888; font-size: 0.9rem; margin-bottom: 5px;">⬆️ 最强五行</div>
                        <div style="font-size: 2rem; font-weight: bold; color: #FFFFFF;">{element_colors.get(dominant[0], '')} {dominant[0]}</div>
                        <div style="color: #2ecc71; font-size: 0.9rem;">↑ {int(dominant[1] * 100)}%</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="color: #888; font-size: 0.9rem; margin-bottom: 5px;">⬇️ 最弱五行</div>
                        <div style="font-size: 2rem; font-weight: bold; color: #FFFFFF;">{element_colors.get(weakest[0], '')} {weakest[0]}</div>
                        <div style="color: #e74c3c; font-size: 0.9rem;">↓ {int(weakest[1] * 100)}%</div>
                    </div>
                </div>
                '''
                st.markdown(metrics_html, unsafe_allow_html=True)
            
            st.markdown("")
        
    else:
        # Fallback to text display
        st.markdown(f'<div class="bazi-display">{st.session_state.bazi_result}</div>', unsafe_allow_html=True)
    

    st.markdown("---")
    
    # Check if currently generating
    is_generating = st.session_state.is_generating
    
    # ========== Different Button Layout for Single vs Compatibility Mode ==========
    if st.session_state.compatibility_mode:
        # Compatibility Mode - 4 focused analysis buttons in 2x2 layout
        st.markdown("### 🤔 你想问什么？")
        
        # Define focused prompt templates for each topic
        COUPLE_PROMPTS = {
            "缘分契合度": "请重点从【性格互补】和【灵魂羁绊】的角度分析。判断两人是正缘还是孽缘，用唯美的比喻描述这段关系。",
            "婚姻前景": "请重点分析【未来5年的流年走势】。判断两人结婚的概率，最佳结婚年份，以及未来可能遇到的感情危机年份。",
            "避雷指南": "请重点分析两人的【矛盾引爆点】。例如一方冷战一方暴躁。请给出具体的、心理学层面的沟通建议和哄人技巧。",
            "对方旺我吗": "请重点分析【五行能量的相互影响】。判断乙方是否能补足甲方的喜用神。和对方在一起，甲方的财运、事业运是会提升还是被消耗？"
        }
        
        # 2x2 button layout
        col1, col2 = st.columns(2)
        with col1:
            is_clicked_soul = "缘分契合度" in st.session_state.clicked_topics
            btn_soul = st.button(
                f"{'✓' if is_clicked_soul else '💖'} 缘分契合度", 
                key="btn_compat_soul", 
                use_container_width=True, 
                disabled=is_generating
            )
            is_clicked_conflict = "避雷指南" in st.session_state.clicked_topics
            btn_conflict = st.button(
                f"{'✓' if is_clicked_conflict else '💣'} 避雷指南", 
                key="btn_compat_conflict", 
                use_container_width=True, 
                disabled=is_generating
            )
        with col2:
            is_clicked_marriage = "婚姻前景" in st.session_state.clicked_topics
            btn_marriage = st.button(
                f"{'✓' if is_clicked_marriage else '💍'} 婚姻前景", 
                key="btn_compat_marriage", 
                use_container_width=True, 
                disabled=is_generating
            )
            is_clicked_wealth = "对方旺我吗" in st.session_state.clicked_topics
            btn_wealth = st.button(
                f"{'✓' if is_clicked_wealth else '💰'} 对方旺我吗", 
                key="btn_compat_wealth", 
                use_container_width=True, 
                disabled=is_generating
            )
        
        # "大师解惑" button below the 2x2 grid
        st.markdown("")
        if st.button("💬 大师解惑", key="btn_compat_custom", use_container_width=True, disabled=is_generating):
            st.session_state.show_custom_input = True
            st.rerun()
        
        # Determine which button was clicked and set the focus instruction
        selected_topic = None
        selected_focus = ""
        
        if btn_soul:
            selected_topic = "缘分契合度"
            selected_focus = COUPLE_PROMPTS["缘分契合度"]
        elif btn_marriage:
            selected_topic = "婚姻前景"
            selected_focus = COUPLE_PROMPTS["婚姻前景"]
        elif btn_conflict:
            selected_topic = "避雷指南"
            selected_focus = COUPLE_PROMPTS["避雷指南"]
        elif btn_wealth:
            selected_topic = "对方旺我吗"
            selected_focus = COUPLE_PROMPTS["对方旺我吗"]
        
        if selected_topic:
            if selected_topic in st.session_state.clicked_topics:
                # Already clicked - scroll to existing result
                st.session_state.scroll_to_topic = selected_topic
                st.session_state.scroll_timestamp = datetime.now().timestamp()
                st.rerun()
            else:
                # New click - trigger analysis
                st.session_state.clicked_topics.add(selected_topic)
                st.session_state.pending_topic = selected_topic
                st.session_state.pending_focus_instruction = selected_focus  # Store focus instruction
                st.session_state.is_generating = True
                st.rerun()
    else:
        # Single Mode - Regular buttons + Oracle button
        st.markdown("### 🌟 选择想要了解的内容")
        
        # Button array - buttons are disabled during generation
        # First row: 4 main topics
        cols = st.columns(4)
        
        for i, topic in enumerate(ANALYSIS_TOPICS[:4]):
            with cols[i]:
                is_clicked = topic in st.session_state.clicked_topics
                button_label = f"✓ {topic}" if is_clicked else topic
                if st.button(button_label, key=f"btn_{topic}", use_container_width=True, disabled=is_generating):
                    if topic in st.session_state.clicked_topics:
                        st.session_state.scroll_to_topic = topic
                        st.session_state.scroll_timestamp = datetime.now().timestamp()
                        st.rerun()
                    else:
                        st.session_state.clicked_topics.add(topic)
                        st.session_state.pending_topic = topic
                        st.session_state.is_generating = True
                        st.rerun()
        
        # Second row: Remaining 2 topics + Oracle button + 大师解惑
        cols2 = st.columns(4)
        
        # 健康建议 (index 4)
        with cols2[0]:
            topic = ANALYSIS_TOPICS[4]
            is_clicked = topic in st.session_state.clicked_topics
            button_label = f"✓ {topic}" if is_clicked else topic
            if st.button(button_label, key=f"btn_{topic}", use_container_width=True, disabled=is_generating):
                if topic in st.session_state.clicked_topics:
                    st.session_state.scroll_to_topic = topic
                    st.session_state.scroll_timestamp = datetime.now().timestamp()
                    st.rerun()
                else:
                    st.session_state.clicked_topics.add(topic)
                    st.session_state.pending_topic = topic
                    st.session_state.is_generating = True
                    st.rerun()
        
        # 开运建议 (index 5)
        with cols2[1]:
            topic = ANALYSIS_TOPICS[5]
            is_clicked = topic in st.session_state.clicked_topics
            button_label = f"✓ {topic}" if is_clicked else topic
            if st.button(button_label, key=f"btn_{topic}", use_container_width=True, disabled=is_generating):
                if topic in st.session_state.clicked_topics:
                    st.session_state.scroll_to_topic = topic
                    st.session_state.scroll_timestamp = datetime.now().timestamp()
                    st.rerun()
                else:
                    st.session_state.clicked_topics.add(topic)
                    st.session_state.pending_topic = topic
                    st.session_state.is_generating = True
                    st.rerun()
        
        # 🎴 每日一卦 (Oracle button)
        with cols2[2]:
            # Check if profile is loaded (required for daily quota)
            has_profile = st.session_state.loaded_profile_id is not None
            oracle_label = "✓ 每日一卦" if "oracle" in st.session_state.clicked_topics else "🎴 每日一卦"
            
            if not has_profile:
                # No profile loaded - show disabled button with tooltip
                st.button(oracle_label, key="btn_oracle", use_container_width=True, disabled=True, help="需读取或建立档案")
            else:
                # Check database quota
                has_quota = check_daily_quota(st.session_state.loaded_profile_id)
                oracle_disabled = is_generating or (not has_quota and "oracle" not in st.session_state.clicked_topics)
                
                if st.button(oracle_label, key="btn_oracle", use_container_width=True, disabled=oracle_disabled):
                    if "oracle" in st.session_state.clicked_topics:
                        # Scroll to existing oracle result
                        st.session_state.scroll_to_topic = "oracle"
                        st.session_state.scroll_timestamp = datetime.now().timestamp()
                        st.rerun()
                    elif has_quota:
                        st.session_state.oracle_mode = True
                        st.rerun()
                
                # Show quota status below button
                if not has_quota and "oracle" not in st.session_state.clicked_topics:
                    st.caption("🍵 今日已用")
        
        # 大师解惑 (index 6)
        with cols2[3]:
            topic = ANALYSIS_TOPICS[6]  # "大师解惑"
            if st.button(f"💬 {topic}", key=f"btn_{topic}", use_container_width=True, disabled=is_generating):
                st.session_state.show_custom_input = True
                st.rerun()
    
    
    # Custom question input
    if st.session_state.show_custom_input:
        st.markdown("---")
        custom_col1, custom_col2 = st.columns([4, 1])
        with custom_col1:
            custom_question = st.text_input(
                "💬 请输入您的问题",
                key=f"custom_q_{st.session_state.custom_question_count}",
                placeholder="例如：我今年适合跳槽吗？"
            )
        with custom_col2:
            st.markdown("<br>", unsafe_allow_html=True)
            if st.button("提交", key="submit_custom", use_container_width=True, disabled=is_generating):
                if custom_question.strip():
                    st.session_state.pending_topic = "大师解惑"
                    st.session_state.pending_custom_question = custom_question
                    st.session_state.custom_question_count += 1
                    st.session_state.show_custom_input = False
                    st.session_state.is_generating = True
                    st.rerun()
    
    # ========== Oracle Mode (每日一卦) UI ==========
    if st.session_state.oracle_mode:
        st.markdown("---")
        st.markdown('<h3 style="color: #FFD700; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">🎴 每日一卦 - 周易占卜</h3>', unsafe_allow_html=True)
        
        # Step 1: Input question (if not already set)
        if not st.session_state.oracle_question:
            oracle_question = st.text_input(
                "🔮 请输入您想卜问的事情",
                key="oracle_question_input",
                placeholder="例如：这份工作机会值得抓住吗？"
            )
            if st.button("确认卜问", key="confirm_oracle_question", use_container_width=True):
                if oracle_question.strip():
                    st.session_state.oracle_question = oracle_question.strip()
                    st.session_state.oracle_shake_count = 0
                    st.rerun()
                else:
                    st.warning("请先输入您想卜问的事情")
        
        # Step 2: Shaking / Clicking 3 times
        elif st.session_state.oracle_shake_count < 3:
            st.info(f"📿 您正在卜问：**{st.session_state.oracle_question}**")
            
            # Reminder to silently repeat the question 3 times
            st.markdown('''
            <div style="background: linear-gradient(145deg, rgba(255, 215, 0, 0.15), rgba(255, 140, 0, 0.1)); 
                        border: 1px solid rgba(255, 215, 0, 0.4); 
                        border-radius: 12px; 
                        padding: 15px 20px; 
                        margin: 15px 0;
                        text-align: center;">
                <p style="color: #FFD700; font-family: 'Noto Serif SC', serif; font-size: 1.1rem; margin: 0;">
                    🙏 请在心中默念您的问题三遍后，再投掷铜钱
                </p>
                <p style="color: #CCCCCC; font-size: 0.9rem; margin-top: 8px; margin-bottom: 0;">
                    诚心诚意，心诚则灵
                </p>
            </div>
            ''', unsafe_allow_html=True)
            
            # Progress display
            shake_progress = "🪙" * st.session_state.oracle_shake_count + "⚪" * (3 - st.session_state.oracle_shake_count)
            st.markdown(f"### 进度：{shake_progress} ({st.session_state.oracle_shake_count}/3)")
            st.caption("点击下方按钮 3 次，或摇动手机（移动端）完成起卦")
            
            # Shake button
            if st.button("🪙 投掷铜钱", key=f"shake_{st.session_state.oracle_shake_count}", use_container_width=True):
                st.session_state.oracle_shake_count += 1
                if st.session_state.oracle_shake_count >= 3:
                    # Cast hexagram
                    calculator = ZhouyiCalculator()
                    st.session_state.oracle_hex_result = calculator.cast_hexagram()
                st.rerun()
            
            # Mobile shake detection (JavaScript injection with iOS permission handling)
            shake_js = f'''
            <script>
            (function() {{
                // Prevent duplicate initialization
                if (window.shakeHandlerInitialized) return;
                window.shakeHandlerInitialized = true;
                
                var lastShakeTime = 0;
                var shakeThreshold = 20;
                
                function handleMotion(event) {{
                    var acceleration = event.accelerationIncludingGravity;
                    if (!acceleration) return;
                    
                    var total = Math.abs(acceleration.x || 0) + Math.abs(acceleration.y || 0) + Math.abs(acceleration.z || 0);
                    
                    if (total > shakeThreshold && Date.now() - lastShakeTime > 600) {{
                        lastShakeTime = Date.now();
                        // Find the coin toss button using multiple selectors for reliability
                        var btn = null;
                        var buttons = document.querySelectorAll('button');
                        for (var i = 0; i < buttons.length; i++) {{
                            if (buttons[i].textContent.includes('投掷铜钱')) {{
                                btn = buttons[i];
                                break;
                            }}
                        }}
                        if (btn) {{
                            btn.click();
                        }}
                    }}
                }}
                
                // Check if DeviceMotionEvent requires permission (iOS 13+)
                if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {{
                    // iOS 13+ - need to request permission on user gesture
                    // Create a one-time button to request permission
                    if (!window.motionPermissionRequested) {{
                        window.motionPermissionRequested = true;
                        // Automatically try to add listener after any user interaction
                        document.addEventListener('click', function requestMotionPermission() {{
                            DeviceMotionEvent.requestPermission()
                                .then(function(permissionState) {{
                                    if (permissionState === 'granted') {{
                                        window.addEventListener('devicemotion', handleMotion);
                                    }}
                                }})
                                .catch(console.error);
                            document.removeEventListener('click', requestMotionPermission);
                        }}, {{ once: true }});
                    }}
                }} else if (window.DeviceMotionEvent) {{
                    // Non-iOS or older iOS - can add listener directly
                    window.addEventListener('devicemotion', handleMotion);
                }}
            }})();
            </script>
            '''
            components.html(shake_js, height=0)
            
            # Cancel button
            if st.button("❌ 取消卜卦", key="cancel_oracle", use_container_width=True):
                st.session_state.oracle_mode = False
                st.session_state.oracle_question = ""
                st.session_state.oracle_shake_count = 0
                st.rerun()
        
        # Step 3: Display hexagram result and get LLM interpretation
        else:
            hex_result = st.session_state.oracle_hex_result
            if hex_result:
                st.success("✨ 起卦成功！")
                
                # Display hexagram SVG
                st.markdown("#### 🔮 卦象")
                col_hex1, col_hex2 = st.columns(2)
                
                with col_hex1:
                    st.markdown(f"**本卦：{hex_result['original_hex']}**")
                    st.markdown(f'<p style="color: #ffd700; font-size: 0.9em;">{hex_result["original_meaning"]}</p>', unsafe_allow_html=True)
                    hex_svg = draw_hexagram_svg(hex_result['original_binary'])
                    st.markdown(f'<div style="text-align:center;">{hex_svg}</div>', unsafe_allow_html=True)
                
                with col_hex2:
                    if hex_result['has_change']:
                        st.markdown(f"**变卦：{hex_result['future_hex']}**")
                        st.markdown(f'<p style="color: #ffd700; font-size: 0.9em;">{hex_result["future_meaning"]}</p>', unsafe_allow_html=True)
                        future_svg = draw_hexagram_svg(hex_result['future_binary'])
                        st.markdown(f'<div style="text-align:center;">{future_svg}</div>', unsafe_allow_html=True)
                    else:
                        st.markdown("**无变卦**")
                        st.caption("六爻皆静，本卦即是答案")
                
                # Hexagram details
                with st.expander("📜 卦象详情"):
                    st.markdown(f"**上卦（外卦）**：{hex_result['upper_trigram']}")
                    st.markdown(f"**下卦（内卦）**：{hex_result['lower_trigram']}")
                    if hex_result['changing_lines']:
                        st.markdown(f"**动爻**：第 {', '.join(map(str, hex_result['changing_lines']))} 爻")
                    st.markdown("---")
                    for detail in hex_result['details']:
                        st.caption(detail)
                
                # Build bazi context for oracle
                bazi_data_for_oracle = {
                    "day_pillar": st.session_state.bazi_result.split()[2] if st.session_state.bazi_result else ("?", "?"),
                    "pattern_name": getattr(st.session_state, 'pattern_info', {}).get('name', '普通格局'),
                    "strength": getattr(st.session_state, 'pattern_info', {}).get('strength', '未知'),
                    "joy_elements": getattr(st.session_state, 'pattern_info', {}).get('joy_elements', '未知')
                }
                
                # Try to get better bazi data from user_context if available
                if hasattr(st.session_state, 'pattern_info') and st.session_state.pattern_info:
                    pattern_info = st.session_state.pattern_info
                    bazi_data_for_oracle = {
                        "day_pillar": (pattern_info.get('day_master', '?'), pattern_info.get('day_branch', '?')),
                        "pattern_name": pattern_info.get('name', '普通格局'),
                        "strength": pattern_info.get('strength', '未知'),
                        "joy_elements": pattern_info.get('joy_elements', '未知')
                    }
                
                # Trigger LLM interpretation
                st.markdown("---")
                st.markdown("### 🧙 大师解卦")
                
                # Build oracle prompt
                oracle_prompt = build_oracle_prompt(
                    user_question=st.session_state.oracle_question,
                    hex_data=hex_result,
                    bazi_data=bazi_data_for_oracle
                )
                
                # Get API config
                api_config = st.session_state.api_config
                
                # Rate limiting check
                if st.session_state.using_default_api:
                    if st.session_state.default_api_usage_count >= DEFAULT_API_DAILY_LIMIT:
                        st.error(f"⚠️ 默认 API 本次会话已达到 {DEFAULT_API_DAILY_LIMIT} 次使用限制。")
                    elif not DEFAULT_API_KEY:
                        st.error("⚠️ 服务器未配置默认 API Key。")
                    else:
                        # Stream LLM response
                        with st.spinner("大师正在解读卦象..."):
                            try:
                                if st.session_state.using_default_api:
                                    client = get_llm_client(DEFAULT_API_KEY, DEFAULT_BASE_URL)
                                    model = DEFAULT_MODEL
                                else:
                                    client = get_llm_client(api_config['api_key'], api_config['base_url'])
                                    model = api_config['model']
                                
                                response = client.chat.completions.create(
                                    model=model,
                                    messages=[
                                        {"role": "system", "content": "你是一位精通《周易》六爻与《子平八字》的国学大师。"},
                                        {"role": "user", "content": oracle_prompt}
                                    ],
                                    stream=True,
                                    max_tokens=4000
                                )
                                
                                oracle_response = ""
                                response_placeholder = st.empty()
                                
                                for chunk in response:
                                    if chunk.choices[0].delta.content:
                                        oracle_response += chunk.choices[0].delta.content
                                        cleaned = clean_markdown_for_display(oracle_response)
                                        response_placeholder.markdown(
                                            f'<div class="fortune-text">{cleaned}</div>',
                                            unsafe_allow_html=True
                                        )
                                
                                # Save response and mark daily usage
                                st.session_state.clicked_topics.add("oracle")
                                st.session_state.responses.append(("oracle", f"🎴 {st.session_state.oracle_question}", oracle_response))
                                st.session_state.oracle_used_today = True
                                st.session_state.oracle_usage_date = datetime.now().strftime("%Y-%m-%d")
                                st.session_state.default_api_usage_count += 1
                                
                                # Consume daily quota in database (if profile loaded)
                                if st.session_state.loaded_profile_id:
                                    consume_daily_quota(st.session_state.loaded_profile_id)
                                
                                # Auto-save session data if profile is loaded
                                if st.session_state.loaded_profile_id:
                                    update_session_data(st.session_state.loaded_profile_id, serialize_session_state())
                                
                            except Exception as e:
                                st.error(f"❌ 解卦失败：{str(e)}")
                
                # Reset button
                if st.button("🔄 完成", key="finish_oracle", use_container_width=True):
                    st.session_state.oracle_mode = False
                    st.session_state.oracle_question = ""
                    st.session_state.oracle_shake_count = 0
                    st.session_state.oracle_hex_result = None
                    st.rerun()

    # Process pending topic
    if hasattr(st.session_state, 'pending_topic') and st.session_state.pending_topic:
        topic = st.session_state.pending_topic
        custom_q = getattr(st.session_state, 'pending_custom_question', None)
        
        # Clear pending
        st.session_state.pending_topic = None
        st.session_state.pending_custom_question = None
        
        # Build conversation history from previous responses (for context continuity)
        conversation_history = []
        if st.session_state.responses:
            for prev_topic_key, prev_topic_display, prev_response in st.session_state.responses:
                # Extract topic name without emoji prefix
                topic_name = prev_topic_display.replace("📌 ", "").replace("💬 ", "")
                # Use full response for better context continuity
                conversation_history.append((topic_name, prev_response))
        
        # Stream response
        response_text = ""
        topic_key = topic if topic != "大师解惑" else f"custom_{st.session_state.custom_question_count}"
        topic_display = f"💬 {custom_q}" if topic == "大师解惑" and custom_q else f"📌 {topic}"
        
        api_config = st.session_state.api_config
        
        # Rate limiting check for default API key
        if st.session_state.using_default_api:
            if st.session_state.default_api_usage_count >= DEFAULT_API_DAILY_LIMIT:
                st.error(f"⚠️ 默认 API 本次会话已达到 {DEFAULT_API_DAILY_LIMIT} 次使用限制。请在「AI 模型设置」中配置您自己的 API Key 后继续使用。")
                st.session_state.is_generating = False
                st.rerun()
            # Check if default API key is configured
            if not DEFAULT_API_KEY:
                st.error("⚠️ 服务器未配置默认 API Key。请在「AI 模型设置」中配置您自己的 API Key。")
                st.session_state.is_generating = False
                st.rerun()
        
        # ========== Special handling for Compatibility Mode topics ==========
        COUPLE_TOPICS = ["缘分契合度", "婚姻前景", "避雷指南", "对方旺我吗"]
        if topic in COUPLE_TOPICS and st.session_state.compatibility_mode:
            # Build person_a data (甲方)
            pattern_a = st.session_state.pattern_info
            person_a = {
                "gender": st.session_state.gender,
                "year_pillar": pattern_a.get("year_pillar", "??"),
                "month_pillar": pattern_a.get("month_pillar", "??"),
                "day_pillar": pattern_a.get("day_pillar", "??"),
                "hour_pillar": pattern_a.get("hour_pillar", "??"),
                "pattern_name": pattern_a.get("pattern_name", "普通格局"),
                "strength": pattern_a.get("strength_result", {}).get("strength", "未知"),
                "joy_elements": ", ".join(pattern_a.get("strength_result", {}).get("joy_elements", [])) or "未知"
            }
            
            # Build person_b data (乙方)
            pattern_b = st.session_state.partner_pattern_info
            person_b = {
                "gender": st.session_state.stored_partner_gender,
                "year_pillar": pattern_b.get("year_pillar", "??"),
                "month_pillar": pattern_b.get("month_pillar", "??"),
                "day_pillar": pattern_b.get("day_pillar", "??"),
                "hour_pillar": pattern_b.get("hour_pillar", "??"),
                "pattern_name": pattern_b.get("pattern_name", "普通格局"),
                "strength": pattern_b.get("strength_result", {}).get("strength", "未知"),
                "joy_elements": ", ".join(pattern_b.get("strength_result", {}).get("joy_elements", [])) or "未知"
            }
            
            # Get compatibility result
            comp_data = st.session_state.compatibility_result
            
            # Get focus instruction (stored when button was clicked)
            focus_instruction = getattr(st.session_state, 'pending_focus_instruction', "")
            st.session_state.pending_focus_instruction = ""  # Clear after use
            
            # Retrieve stored relation type
            relation_type = getattr(st.session_state, 'stored_relation_type', "恋人/伴侣")
            
            # Build special couple prompt with focus instruction and relation type
            couple_prompt = build_couple_prompt(
                person_a, 
                person_b, 
                comp_data, 
                relation_type=relation_type, 
                focus_instruction=focus_instruction
            )
            
            # Use couple prompt instead of generic user_context
            with st.spinner("正在解析二人的红线羁绊..."):
                response_placeholder = st.empty()
                try:
                    for chunk in get_fortune_analysis(
                        topic,
                        couple_prompt,  # Use couple prompt instead of user_context
                        custom_question=None,
                        api_key=api_config['api_key'],
                        base_url=api_config['base_url'],
                        model=api_config['model'],
                        is_first_response=st.session_state.is_first_response,
                        conversation_history=conversation_history if not st.session_state.is_first_response else None
                    ):
                        response_text += chunk
                        response_placeholder.markdown(response_text)
                        
                except Exception as e:
                    response_text = f"分析时出错: {str(e)}"
                    response_placeholder.error(response_text)
                finally:
                    # Force reset loading state even if error occurs
                    st.session_state.is_generating = False
            
            # Store response and update state
            st.session_state.responses.append((topic_key, topic_display, response_text))
            st.session_state.is_first_response = False
            
            if st.session_state.using_default_api:
                st.session_state.default_api_usage_count += 1
            
            # Auto-save session data if profile is loaded
            if st.session_state.loaded_profile_id:
                update_session_data(st.session_state.loaded_profile_id, serialize_session_state())
            st.rerun()
        
        with st.spinner(f"正在分析 {topic}..."):
            response_placeholder = st.empty()
            try:
                for chunk in get_fortune_analysis(
                    topic,
                    st.session_state.user_context,
                    custom_question=custom_q,
                    api_key=api_config['api_key'],
                    base_url=api_config['base_url'],
                    model=api_config['model'],
                    is_first_response=st.session_state.is_first_response,
                    conversation_history=conversation_history if not st.session_state.is_first_response else None
                ):
                    response_text += chunk
                    
                    # Check for quota error
                    if "quota" in response_text.lower() or "limit" in response_text.lower() or "429" in response_text:
                        response_text = "⚠️ 默认 API 已达到使用限额。请在输入页面的「AI 模型设置」中配置您自己的 API Key 后重试。"
                        break
                    
                    # For first response, show full text; for subsequent, we'll strip intro later
                    display_text = clean_markdown_for_display(response_text)
                    response_placeholder.markdown(
                        f'<div class="topic-header">{topic_display}</div><div class="fortune-text">{display_text}</div>',
                        unsafe_allow_html=True
                    )
            except Exception as e:
                error_str = str(e).lower()
                if "quota" in error_str or "limit" in error_str or "429" in error_str:
                    response_text = "⚠️ 默认 API 已达到使用限额。请在输入页面的「AI 模型设置」中配置您自己的 API Key 后重试。"
                else:
                    response_text = f"⚠️ 调用 LLM 时出错: {str(e)}"
                response_placeholder.markdown(
                    f'<div class="topic-header">{topic_display}</div><div class="fortune-text">{clean_markdown_for_display(response_text)}</div>',
                    unsafe_allow_html=True
                )
            finally:
                # Force reset loading state
                st.session_state.is_generating = False
        
        # Store response and update flags
        st.session_state.responses.append((topic_key, topic_display, response_text))
        st.session_state.is_first_response = False
        
        # Increment usage counter if using default API
        if st.session_state.using_default_api:
            st.session_state.default_api_usage_count += 1
        # Auto-save session data if profile is loaded
        if st.session_state.loaded_profile_id:
            update_session_data(st.session_state.loaded_profile_id, serialize_session_state())
        # Scroll to the newly added response
        st.session_state.scroll_to_topic = topic_key
        st.rerun()
    
    # Display all previous responses
    if st.session_state.responses:
        st.markdown("---")
        st.markdown("### 📜 分析记录")
        
        # Get scroll target before clearing it
        scroll_target = st.session_state.scroll_to_topic
        scroll_anchor_id = None
        
        for topic_key, topic_display, response in st.session_state.responses:
            # Create anchor for scrolling - use topic_key directly
            anchor_id = f"response_{topic_key}".replace(" ", "_")
            
            # Check if this is the scroll target
            is_scroll_target = scroll_target and topic_key == scroll_target
            
            if is_scroll_target:
                scroll_anchor_id = anchor_id
                cleaned_response = clean_markdown_for_display(response)
                st.markdown(
                    f'<div id="{anchor_id}" class="topic-header" style="background: rgba(255, 215, 0, 0.2); padding: 10px; border-radius: 8px; scroll-margin-top: 100px;">{topic_display} 👈</div><div class="fortune-text">{cleaned_response}</div>',
                    unsafe_allow_html=True
                )
            else:
                cleaned_response = clean_markdown_for_display(response)
                st.markdown(
                    f'<div id="{anchor_id}" class="topic-header">{topic_display}</div><div class="fortune-text">{cleaned_response}</div>',
                    unsafe_allow_html=True
                )
        
        # Use components.html to execute JavaScript for scrolling
        if scroll_anchor_id:
            # Add timestamp to make each script unique and force execution
            scroll_ts = getattr(st.session_state, 'scroll_timestamp', 0)
            components.html(f'''
                <script>
                    // Timestamp: {scroll_ts} - ensures fresh execution on repeated clicks
                    (function() {{
                        const targetElement = window.parent.document.getElementById("{scroll_anchor_id}");
                        if (targetElement) {{
                            // Small delay to ensure DOM is ready
                            setTimeout(function() {{
                                targetElement.scrollIntoView({{behavior: "smooth", block: "start"}});
                            }}, 100);
                        }}
                    }})();
                </script>
            ''', height=0)
            # Clear scroll target after rendering
            st.session_state.scroll_to_topic = None
            st.session_state.scroll_timestamp = None
        
        # ========== PDF Download & Save Profile (Aligned) ==========
        st.markdown("---")
        st.markdown("### 📥 保存报告")
        
        # Generate PDF and create download link
        try:
            pdf_bytes = generate_report_pdf(
                bazi_result=st.session_state.bazi_result,
                time_info=st.session_state.time_info,
                gender=getattr(st.session_state, 'gender', '未知'),
                birthplace=getattr(st.session_state, 'birthplace', '未指定'),
                responses=st.session_state.responses,
                birth_datetime=getattr(st.session_state, 'birth_datetime', None),
            )
            
            # Use base64 data URL to bypass iframe sandboxing issues on mobile browsers
            import base64
            b64_pdf = base64.b64encode(pdf_bytes).decode()
            pdf_filename = f"命理报告_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
            
            # Create styled download link
            download_html = f'''
            <a href="data:application/pdf;base64,{b64_pdf}" 
               download="{pdf_filename}"
               style="
                   display: inline-flex;
                   align-items: center;
                   justify-content: center;
                   padding: 10px 20px;
                   background: linear-gradient(145deg, #4A90D9, #357ABD);
                   color: white;
                   text-decoration: none;
                   border-radius: 8px;
                   font-size: 16px;
                   font-weight: 500;
                   box-shadow: 0 4px 15px rgba(74, 144, 217, 0.3);
                   transition: all 0.3s ease;
                   width: 100%;
                   border: none;
               ">
                📄 下载 PDF 报告
            </a>
            '''
            
            # Layout buttons side-by-side using Streamlit columns
            col_save, col_download = st.columns([1, 1], vertical_alignment="bottom")
            
            with col_save:
                # Button to trigger save dialog
                if st.button("💾 保存档案", key="btn_save_result_bottom", use_container_width=True):
                    # Capture current form values if they exist, or use defaults from data
                    st.session_state["_save_gender"] = st.session_state.get("gender", "男")
                    
                    # Try to parse year/month/day from birth_datetime string
                    b_dt = st.session_state.get("birth_datetime", "")
                    try:
                        match = re.search(r'(\d+)年(\d+)月(\d+)日', b_dt)
                        if match:
                            st.session_state["_save_year"] = int(match.group(1))
                            st.session_state["_save_month"] = int(match.group(2))
                            st.session_state["_save_day"] = int(match.group(3))
                    except:
                        pass
                        
                    st.session_state["_save_hour"] = st.session_state.get("time_info", "").split()[0] if st.session_state.get("time_info") else "12:00"
                    st.session_state["_save_city"] = st.session_state.get("birthplace", None)
                    st.session_state["_save_is_lunar"] = st.session_state.get("calendar_mode") == "lunar"
                    
                    save_profile_dialog()
            
            with col_download:
                st.markdown(download_html, unsafe_allow_html=True)
            
        except Exception as e:
            st.error(f"生成 PDF 时出错: {str(e)}")

# Save data to localStorage whenever we have responses
if st.session_state.bazi_calculated and st.session_state.responses:
    # Prepare data to save
    save_data = {
        "bazi_calculated": st.session_state.bazi_calculated,
        "bazi_result": st.session_state.bazi_result,
        "time_info": st.session_state.time_info,
        "user_context": st.session_state.user_context,
        "clicked_topics": list(st.session_state.clicked_topics),
        "responses": [list(r) for r in st.session_state.responses],
        "birthplace": getattr(st.session_state, 'birthplace', '未指定'),
        "gender": getattr(st.session_state, 'gender', '男'),
        "is_first_response": st.session_state.is_first_response,
        "custom_question_count": st.session_state.custom_question_count
    }
    json_data = json.dumps(save_data, ensure_ascii=False)
    # Escape for JavaScript
    escaped_json = json_data.replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n')
    
    components.html(f'''
        <script>
            localStorage.setItem('fortune_teller_data', '{escaped_json}');
        </script>
    ''', height=0)

# On initial page load (no bazi calculated and not loaded from storage), check localStorage
if not st.session_state.bazi_calculated and not st.session_state.data_loaded_from_storage:
    components.html('''
        <script>
            const savedData = localStorage.getItem('fortune_teller_data');
            if (savedData) {
                // Redirect with data as query parameter
                const encodedData = encodeURIComponent(savedData);
                const currentUrl = window.parent.location.href.split('?')[0];
                window.parent.location.href = currentUrl + '?fortune_data=' + encodedData;
            }
        </script>
    ''', height=0)
    st.session_state.data_loaded_from_storage = True
