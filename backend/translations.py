# -*- coding: utf-8 -*-
"""
Translations module for Fortune Teller backend.
Provides Chinese to English/Pinyin mappings for Bazi terminology.
"""

# Pattern names: Chinese -> "Pinyin Destiny Pattern"
PATTERN_TRANSLATIONS = {
    # 八格 (Eight Patterns)
    "正官格": "Zhengguan Destiny Pattern",
    "偏官格": "Pianguan Destiny Pattern",
    "七杀格": "Qisha Destiny Pattern",
    "正印格": "Zhengyin Destiny Pattern",
    "偏印格": "Pianyin Destiny Pattern",
    "枭印格": "Xiaoyin Destiny Pattern",
    "正财格": "Zhengcai Destiny Pattern",
    "偏财格": "Piancai Destiny Pattern",
    "食神格": "Shishen Destiny Pattern",
    "伤官格": "Shangguan Destiny Pattern",
    "建禄格": "Jianlu Destiny Pattern",
    "羊刃格": "Yangren Destiny Pattern",
    
    # 特殊杂格 (Special Patterns)
    "日禄归时格": "Riluguishi Destiny Pattern",
    "飞天禄马格": "Feitianlu Ma Destiny Pattern",
    "井栏叉马格": "Jinglancha Ma Destiny Pattern",
    "壬骑龙背格": "Renqi Longbei Destiny Pattern",
    "子遥巳格": "Ziyaosi Destiny Pattern",
    "丑遥巳格": "Chouyaosi Destiny Pattern",
    "六乙鼠贵格": "Liuyi Shugui Destiny Pattern",
    "六阴朝阳格": "Liuyin Chaoyang Destiny Pattern",
    "时墓之金格": "Shimu Zhijin Destiny Pattern",
    "刑合格": "Xinghe Destiny Pattern",
    "拱禄格": "Gonglu Destiny Pattern",
    "拱贵格": "Gonggui Destiny Pattern",
    "时上一位贵格": "Shishang Yiwei Gui Destiny Pattern",
    "曲直格": "Quzhi Destiny Pattern",
    "炎上格": "Yanshang Destiny Pattern",
    "稼穑格": "Jiase Destiny Pattern",
    "从革格": "Congge Destiny Pattern",
    "润下格": "Runxia Destiny Pattern",
    
    # Default
    "普通格局": "Standard Destiny Pattern",
}

# Ten Gods: Chinese -> English (Pinyin)
TEN_GODS_TRANSLATIONS = {
    "比肩": "Bijian (Shoulder)",
    "劫财": "Jiecai (Rob Wealth)",
    "食神": "Shishen (Eating God)",
    "伤官": "Shangguan (Hurting Officer)",
    "偏财": "Piancai (Side Wealth)",
    "正财": "Zhengcai (Direct Wealth)",
    "七杀": "Qisha (Seven Killings)",
    "正官": "Zhengguan (Direct Officer)",
    "偏印": "Pianyin (Side Seal)",
    "正印": "Zhengyin (Direct Seal)",
    "枭印": "Xiaoyin (Owl Seal)",
}

# Heavenly Stems: Chinese -> Pinyin
STEMS_TRANSLATIONS = {
    "甲": "Jia",
    "乙": "Yi",
    "丙": "Bing",
    "丁": "Ding",
    "戊": "Wu",
    "己": "Ji",
    "庚": "Geng",
    "辛": "Xin",
    "壬": "Ren",
    "癸": "Gui",
}

# Earthly Branches: Chinese -> Pinyin
BRANCHES_TRANSLATIONS = {
    "子": "Zi",
    "丑": "Chou",
    "寅": "Yin",
    "卯": "Mao",
    "辰": "Chen",
    "巳": "Si",
    "午": "Wu",
    "未": "Wei",
    "申": "Shen",
    "酉": "You",
    "戌": "Xu",
    "亥": "Hai",
}

# Five Elements: Chinese -> English
ELEMENTS_TRANSLATIONS = {
    "木": "Wood",
    "火": "Fire",
    "土": "Earth",
    "金": "Metal",
    "水": "Water",
}

# Strength descriptions
STRENGTH_TRANSLATIONS = {
    "身强": "Strong Day Master",
    "身弱": "Weak Day Master",
    "身旺": "Vigorous Day Master",
    "从强": "Following Strong",
    "从弱": "Following Weak",
    "中和": "Balanced",
    "极强": "Extremely Strong",
    "极弱": "Extremely Weak",
    "未知": "Unknown",
}

# Nayin (Na Yin) - use Pinyin for the poetic names
NAYIN_TRANSLATIONS = {
    "海中金": "Haizhong Jin (Gold in Sea)",
    "炉中火": "Luzhong Huo (Fire in Furnace)",
    "大林木": "Dalin Mu (Big Forest Wood)",
    "路旁土": "Lupang Tu (Roadside Earth)",
    "剑锋金": "Jianfeng Jin (Sword Edge Metal)",
    "山头火": "Shantou Huo (Mountain Top Fire)",
    "涧下水": "Jianxia Shui (Stream Water)",
    "城头土": "Chengtou Tu (City Wall Earth)",
    "白蜡金": "Baila Jin (White Wax Metal)",
    "杨柳木": "Yangliu Mu (Willow Wood)",
    "泉中水": "Quanzhong Shui (Spring Water)",
    "屋上土": "Wushang Tu (Rooftop Earth)",
    "霹雳火": "Pili Huo (Lightning Fire)",
    "松柏木": "Songbai Mu (Pine Wood)",
    "长流水": "Changliu Shui (Long River Water)",
    "砂中金": "Shazhong Jin (Sand Metal)",
    "山下火": "Shanxia Huo (Fire Under Mountain)",
    "平地木": "Pingdi Mu (Flatland Wood)",
    "壁上土": "Bishang Tu (Wall Earth)",
    "金箔金": "Jinbo Jin (Gold Leaf Metal)",
    "覆灯火": "Fudeng Huo (Lamp Fire)",
    "天河水": "Tianhe Shui (Milky Way Water)",
    "大驿土": "Dayi Tu (Courier Station Earth)",
    "钗钏金": "Chaichuan Jin (Hairpin Metal)",
    "桑柘木": "Sangzhe Mu (Mulberry Wood)",
    "大溪水": "Daxi Shui (Great Stream Water)",
    "沙中土": "Shazhong Tu (Sand Earth)",
    "天上火": "Tianshang Huo (Celestial Fire)",
    "石榴木": "Shiliu Mu (Pomegranate Wood)",
    "大海水": "Dahai Shui (Ocean Water)",
}

# Shen Sha (Spirit Stars)
SHENSHA_TRANSLATIONS = {
    "天乙贵人": "Tianyi Guiren (Heaven Noble)",
    "太极贵人": "Taiji Guiren (Taiji Noble)",
    "文昌贵人": "Wenchang Guiren (Literary Star)",
    "天德贵人": "Tiande Guiren (Heaven Virtue)",
    "月德贵人": "Yuede Guiren (Moon Virtue)",
    "驿马": "Yima (Post Horse)",
    "华盖": "Huagai (Canopy Star)",
    "桃花": "Taohua (Peach Blossom)",
    "将星": "Jiangxing (General Star)",
    "红鸾": "Hongluan (Red Phoenix)",
    "天喜": "Tianxi (Heaven Joy)",
    "禄神": "Lushen (Prosperity God)",
    "羊刃": "Yangren (Blade)",
    "劫煞": "Jiesha (Robbery)",
    "亡神": "Wangshen (Lost Spirit)",
    "孤辰": "Guchen (Lonely Star)",
    "寡宿": "Guasu (Widow Star)",
    "空亡": "Kongwang (Void)",
}

# Common UI terms
UI_TRANSLATIONS = {
    "喜用": "Favorable",
    "忌神": "Unfavorable",
    "日主": "Day Master",
    "年柱": "Year Pillar",
    "月柱": "Month Pillar",
    "日柱": "Day Pillar",
    "时柱": "Hour Pillar",
    "天干": "Heavenly Stems",
    "地支": "Earthly Branches",
    "藏干": "Hidden Stems",
    "纳音": "Na Yin",
    "神煞": "Spirit Stars",
    "大运": "Major Luck Cycle",
    "流年": "Annual Fortune",
    "流月": "Monthly Fortune",
    "五行能量": "Five Elements Energy",
}


def translate_pattern(pattern_name: str, language: str = "zh") -> str:
    """Translate pattern name based on language."""
    if language == "en":
        return PATTERN_TRANSLATIONS.get(pattern_name, f"{pattern_name} Destiny Pattern")
    return pattern_name


def translate_ten_god(ten_god: str, language: str = "zh") -> str:
    """Translate ten god name based on language."""
    if language == "en":
        return TEN_GODS_TRANSLATIONS.get(ten_god, ten_god)
    return ten_god


def translate_stem(stem: str, language: str = "zh") -> str:
    """Translate heavenly stem based on language."""
    if language == "en":
        return STEMS_TRANSLATIONS.get(stem, stem)
    return stem


def translate_branch(branch: str, language: str = "zh") -> str:
    """Translate earthly branch based on language."""
    if language == "en":
        return BRANCHES_TRANSLATIONS.get(branch, branch)
    return branch


def translate_element(element: str, language: str = "zh") -> str:
    """Translate five element based on language."""
    if language == "en":
        return ELEMENTS_TRANSLATIONS.get(element, element)
    return element


def translate_strength(strength: str, language: str = "zh") -> str:
    """Translate strength description based on language."""
    if language == "en":
        return STRENGTH_TRANSLATIONS.get(strength, strength)
    return strength


def translate_nayin(nayin: str, language: str = "zh") -> str:
    """Translate Nayin based on language."""
    if language == "en":
        return NAYIN_TRANSLATIONS.get(nayin, nayin)
    return nayin


def translate_shensha(shensha: str, language: str = "zh") -> str:
    """Translate Shen Sha based on language."""
    if language == "en":
        return SHENSHA_TRANSLATIONS.get(shensha, shensha)
    return shensha


def translate_ui_term(term: str, language: str = "zh") -> str:
    """Translate UI term based on language."""
    if language == "en":
        return UI_TRANSLATIONS.get(term, term)
    return term


def translate_pillar_ganzhi(gan: str, zhi: str, language: str = "zh") -> str:
    """
    Translate a pillar's Gan-Zhi combination.
    For Chinese: returns original like "甲子"
    For English: returns Pinyin like "Jia-Zi"
    """
    if language == "en":
        gan_pinyin = STEMS_TRANSLATIONS.get(gan, gan)
        zhi_pinyin = BRANCHES_TRANSLATIONS.get(zhi, zhi)
        return f"{gan_pinyin}-{zhi_pinyin}"
    return f"{gan}{zhi}"
