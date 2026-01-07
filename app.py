"""
Fortune Teller Streamlit App.
"""
import streamlit as st
import streamlit.components.v1 as components
import json
import urllib.parse
import re
from datetime import date, datetime
import os
from logic import calculate_bazi, get_fortune_analysis, build_user_context, BaziChartGenerator
from china_cities import CHINA_CITIES, SHICHEN_HOURS, get_shichen_mid_hour
from lunar_python import Lunar, LunarYear
from dotenv import load_dotenv

load_dotenv()

# Daily limit for default API key (to prevent abuse)
DEFAULT_API_DAILY_LIMIT = 20


def clean_markdown_for_display(text: str) -> str:
    """
    Convert markdown formatting to HTML for proper display in Streamlit.
    Removes/converts: headers (#), bold (**), italic (*), bullet points, etc.
    """
    if not text:
        return text
    
    # Convert headers (## Title) to styled divs
    text = re.sub(r'^#{1,6}\s*(.+?)$', r'<div style="font-size: 1.2em; font-weight: bold; color: #ffd700; margin: 15px 0 10px 0;">\1</div>', text, flags=re.MULTILINE)
    
    # Convert bold (**text** or __text__)
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'__(.+?)__', r'<strong>\1</strong>', text)
    
    # Convert italic (*text* or _text_) - but not inside words
    text = re.sub(r'(?<!\w)\*([^*\n]+?)\*(?!\w)', r'<em>\1</em>', text)
    text = re.sub(r'(?<!\w)_([^_\n]+?)_(?!\w)', r'<em>\1</em>', text)
    
    # Convert bullet points to styled list items
    text = re.sub(r'^\s*[-*•]\s+', r'<span style="color: #ffd700;">▸</span> ', text, flags=re.MULTILINE)
    
    # Convert numbered lists
    text = re.sub(r'^\s*(\d+)\.\s+', r'<span style="color: #ffd700;">\1.</span> ', text, flags=re.MULTILINE)
    
    # Add line breaks for markdown paragraphs
    text = re.sub(r'\n\n', r'<br><br>', text)
    text = re.sub(r'\n', r'<br>', text)
    
    return text


# Default API configuration (Gemini) - Load from environment for security
# IMPORTANT: Set GEMINI_API_KEY in .env file, do NOT hardcode API keys!
DEFAULT_API_KEY = os.getenv("GEMINI_API_KEY", "")
DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai"
DEFAULT_MODEL = "gemini-3-flash-preview"

# Predefined AI providers (updated 2026-01)
AI_PROVIDERS = {
    "默认 (Gemini)": {
        "base_url": DEFAULT_BASE_URL,
        "models": ["gemini-3-flash-preview", "gemini-2.0-flash-exp", "gemini-1.5-pro"]
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
        "models": ["gemini-3-flash-preview", "gemini-2.0-flash-exp", "gemini-1.5-pro"]
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
ANALYSIS_TOPICS = ["整体命格", "事业运势", "感情运势", "喜用忌用", "健康建议", "开运建议", "深聊一下"]

# Page Configuration
st.set_page_config(
    page_title="八字算命",
    page_icon="🔮",
    layout="centered"
)

# Initialize session state
if "bazi_calculated" not in st.session_state:
    st.session_state.bazi_calculated = False
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
        color: #ffd700;
        text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
        margin-bottom: 30px;
        font-size: 2.2rem;
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
        font-size: 0.9rem;
        text-align: center;
        color: #aaa;
        margin-top: -10px;
        margin-bottom: 20px;
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
        font-size: 1.3rem;
        color: #ffd700;
        border-left: 4px solid #ffd700;
        padding-left: 15px;
        margin-top: 25px;
        margin-bottom: 10px;
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
        color: #ffd700;
        font-size: 1rem;
        margin-bottom: 5px;
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
        display: flex;
        justify-content: center;
        align-items: center;
        margin-bottom: 20px;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
    }
    
    .bazi-chart-container svg {
        max-width: 100%;
        height: auto;
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
    }
    
    /* ===== Viewport meta optimization ===== */
    @viewport {
        width: device-width;
        zoom: 1;
    }
</style>
""", unsafe_allow_html=True)

# Sidebar for reset only
with st.sidebar:
    st.markdown('<p class="sidebar-title">⚙️ 设置</p>', unsafe_allow_html=True)
    
    # Reset button
    if st.button("🔄 重新开始", use_container_width=True):
        st.session_state.bazi_calculated = False
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
        st.rerun()
    
    # Clear storage button
    if st.button("🗑️ 清除保存记录", use_container_width=True):
        st.session_state.bazi_calculated = False
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
        st.session_state.clear_storage_requested = True
        st.rerun()
    
    st.markdown("---")
    st.markdown("""
    <small style="color: #888;">
    💡 默认 API 每会话限制 """ + str(DEFAULT_API_DAILY_LIMIT) + """ 次请求。如需无限制使用，请配置您自己的 API Key。
    </small>
    """, unsafe_allow_html=True)
    st.markdown("""
    <small style="color: #666;">
    💾 分析记录会自动保存在浏览器中
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

# Only show input form if Bazi not yet calculated
if not st.session_state.bazi_calculated:
    # Gender Selection
    st.markdown('<p class="section-label">👤 性别</p>', unsafe_allow_html=True)
    gender = st.selectbox(
        "性别",
        options=["男", "女"],
        index=0,
        label_visibility="collapsed"
    )

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
        # Solar calendar - use date picker
        birthday = st.date_input(
            "出生日期",
            value=date(1990, 1, 1),
            min_value=date(1900, 1, 1),
            max_value=date.today(),
            label_visibility="collapsed"
        )
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
                index=12,
                format_func=lambda x: f"{x:02d}"
            )
        with time_col_m:
            birth_minute = st.selectbox(
                "分钟",
                options=list(range(0, 60, 5)),
                index=0,
                format_func=lambda x: f"{x:02d}"
            )
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

    # Birthplace Input Section
    st.markdown('<p class="section-label">📍 出生地点 (用于真太阳时计算)</p>', unsafe_allow_html=True)

    city_list = ["不选择 (使用北京时间)"] + sorted(CHINA_CITIES.keys())
    birthplace = st.selectbox(
        "选择出生城市",
        options=city_list,
        index=0,
        label_visibility="collapsed"
    )

    if birthplace != "不选择 (使用北京时间)":
        longitude = CHINA_CITIES[birthplace]
        st.caption(f"📐 经度: {longitude}°E")
    else:
        longitude = None

    # API Configuration (Optional) - In main area
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

    # Calculate button
    st.markdown("")
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        start_button = st.button("🎴 开始算命", use_container_width=True)

    if start_button:
        # Calculate Bazi (now returns pattern_info as well)
        bazi_result, time_info, pattern_info = calculate_bazi(
            birthday.year,
            birthday.month,
            birthday.day,
            final_hour,
            final_minute,
            longitude
        )
        
        # Store in session state
        st.session_state.bazi_calculated = True
        st.session_state.bazi_result = bazi_result
        st.session_state.time_info = time_info
        st.session_state.pattern_info = pattern_info  # Store pattern info
        st.session_state.birthplace = birthplace if birthplace != "不选择 (使用北京时间)" else "未指定"
        st.session_state.gender = gender
        
        # Build user context with birth datetime and pattern info
        current_time = datetime.now().strftime("%Y年%m月%d日 %H:%M")
        birth_datetime = f"{birthday.year}年{birthday.month}月{birthday.day}日 {final_hour:02d}:{final_minute:02d}"
        st.session_state.birth_datetime = birth_datetime
        st.session_state.user_context = build_user_context(
            bazi_result,
            gender,
            st.session_state.birthplace,
            current_time,
            birth_datetime,
            pattern_info  # Pass pattern info to user context
        )
        
        # Generate SVG chart with detailed data (ten gods + hidden stems)
        chart_generator = BaziChartGenerator()
        
        # Extract ten_gods and hidden_stems from pattern_info
        ten_gods = pattern_info.get("ten_gods", {})
        hidden_stems_info = pattern_info.get("hidden_stems", {})
        day_master = pattern_info.get("day_master", "")
        
        # Helper function to get hidden stems with ten gods
        def get_hidden_with_gods(branch_name):
            """Get hidden stems list with ten god for each"""
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
                "hidden_stems": get_hidden_with_gods("年支")
            },
            "month": {
                "stem": pattern_info.get("month_pillar", "")[0] if pattern_info.get("month_pillar") else "?",
                "branch": pattern_info.get("month_pillar", "")[1] if len(pattern_info.get("month_pillar", "")) > 1 else "?",
                "stem_ten_god": ten_gods.get("月干", ""),
                "hidden_stems": get_hidden_with_gods("月支")
            },
            "day": {
                "stem": pattern_info.get("day_pillar", "")[0] if pattern_info.get("day_pillar") else "?",
                "branch": pattern_info.get("day_pillar", "")[1] if len(pattern_info.get("day_pillar", "")) > 1 else "?",
                "stem_ten_god": "日主",  # 日主本身
                "hidden_stems": get_hidden_with_gods("日支")
            },
            "hour": {
                "stem": pattern_info.get("hour_pillar", "")[0] if pattern_info.get("hour_pillar") else "?",
                "branch": pattern_info.get("hour_pillar", "")[1] if len(pattern_info.get("hour_pillar", "")) > 1 else "?",
                "stem_ten_god": ten_gods.get("时干", ""),
                "hidden_stems": get_hidden_with_gods("时支")
            }
        }
        st.session_state.bazi_svg = chart_generator.generate_chart(chart_data)
        
        st.rerun()

# Show results if Bazi is calculated
else:
    # Display SVG Chart if available (centered, mobile-responsive)
    if hasattr(st.session_state, 'bazi_svg') and st.session_state.bazi_svg:
        centered_svg = f'''
        <div class="bazi-chart-container" style="display: flex; justify-content: center; align-items: center; margin-bottom: 20px; overflow-x: auto; -webkit-overflow-scrolling: touch; padding: 10px 0;">
            <div style="transform-origin: center; max-width: 100%;">
                {st.session_state.bazi_svg}
            </div>
        </div>
        '''
        st.markdown(centered_svg, unsafe_allow_html=True)
    else:
        # Fallback to text display
        st.markdown(f'<div class="bazi-display">{st.session_state.bazi_result}</div>', unsafe_allow_html=True)
    
    if st.session_state.time_info:
        st.markdown(f'<div class="time-info">📐 {st.session_state.time_info} | 出生地: {st.session_state.birthplace} | 性别: {st.session_state.gender}</div>', unsafe_allow_html=True)
    
    st.markdown("---")
    st.markdown("### 🌟 选择想要了解的内容")
    
    # Check if currently generating
    is_generating = st.session_state.is_generating
    
    # Button array - buttons are disabled during generation
    cols = st.columns(4)
    
    for i, topic in enumerate(ANALYSIS_TOPICS[:4]):
        with cols[i]:
            is_clicked = topic in st.session_state.clicked_topics
            button_label = f"✓ {topic}" if is_clicked else topic
            if st.button(button_label, key=f"btn_{topic}", use_container_width=True, disabled=is_generating):
                if topic in st.session_state.clicked_topics:
                    # Already clicked - scroll to existing response
                    st.session_state.scroll_to_topic = topic
                    st.rerun()
                else:
                    # First click - request new analysis
                    st.session_state.clicked_topics.add(topic)
                    st.session_state.pending_topic = topic
                    st.session_state.is_generating = True
                    st.rerun()
    
    cols2 = st.columns(3)
    for i, topic in enumerate(ANALYSIS_TOPICS[4:]):
        with cols2[i]:
            if topic == "深聊一下":
                if st.button(topic, key=f"btn_{topic}", use_container_width=True, disabled=is_generating):
                    st.session_state.show_custom_input = True
                    st.rerun()
            else:
                is_clicked = topic in st.session_state.clicked_topics
                button_label = f"✓ {topic}" if is_clicked else topic
                if st.button(button_label, key=f"btn_{topic}", use_container_width=True, disabled=is_generating):
                    if topic in st.session_state.clicked_topics:
                        st.session_state.scroll_to_topic = topic
                        st.rerun()
                    else:
                        st.session_state.clicked_topics.add(topic)
                        st.session_state.pending_topic = topic
                        st.session_state.is_generating = True
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
                    st.session_state.pending_topic = "深聊一下"
                    st.session_state.pending_custom_question = custom_question
                    st.session_state.custom_question_count += 1
                    st.session_state.show_custom_input = False
                    st.session_state.is_generating = True
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
        topic_key = topic if topic != "深聊一下" else f"custom_{st.session_state.custom_question_count}"
        topic_display = f"💬 {custom_q}" if topic == "深聊一下" and custom_q else f"📌 {topic}"
        
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
        
        # Store response and update flags
        st.session_state.responses.append((topic_key, topic_display, response_text))
        st.session_state.is_first_response = False
        st.session_state.is_generating = False
        # Increment usage counter if using default API
        if st.session_state.using_default_api:
            st.session_state.default_api_usage_count += 1
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
            components.html(f'''
                <script>
                    const targetElement = window.parent.document.getElementById("{scroll_anchor_id}");
                    if (targetElement) {{
                        targetElement.scrollIntoView({{behavior: "smooth", block: "start"}});
                    }}
                </script>
            ''', height=0)
            # Clear scroll target after rendering
            st.session_state.scroll_to_topic = None

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
