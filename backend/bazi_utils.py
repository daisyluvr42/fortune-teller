"""
八字工具类 - 合盘分析等
"""
import re
import svgwrite


class BaziCompatibilityCalculator:
    """
    八字合盘计算器 - 分析两人之间的"化学反应"
    """
    
    def __init__(self):
        # 天干五合
        self.stem_combos = {
            frozenset(["甲", "己"]), frozenset(["乙", "庚"]), frozenset(["丙", "辛"]),
            frozenset(["丁", "壬"]), frozenset(["戊", "癸"])
        }
        # 地支六合
        self.branch_combos = {
            frozenset(["子", "丑"]), frozenset(["寅", "亥"]), frozenset(["卯", "戌"]),
            frozenset(["辰", "酉"]), frozenset(["巳", "申"]), frozenset(["午", "未"])
        }
        # 地支六冲
        self.branch_clashes = {
            frozenset(["子", "午"]), frozenset(["丑", "未"]), frozenset(["寅", "申"]),
            frozenset(["卯", "酉"]), frozenset(["辰", "戌"]), frozenset(["巳", "亥"])
        }

    def analyze_compatibility(self, person_a, person_b):
        """
        分析两人八字的兼容性
        
        :param person_a: 甲方四柱数据 (dict)
        :param person_b: 乙方四柱数据 (dict)
        :return: dict 包含 details (分析报告列表) 和 base_score (综合分数)
        """
        report = []
        score_bonus = 0
        
        # 1. 核心：日柱关系 (夫妻宫)
        # 日干关系
        dm_a = person_a['day_pillar'][0]
        dm_b = person_b['day_pillar'][0]
        if frozenset([dm_a, dm_b]) in self.stem_combos:
            report.append(f"❤️ **日干相合 ({dm_a}-{dm_b})**：灵魂吸引力极强，性格互补。")
            score_bonus += 30
            
        # 日支关系
        db_a = person_a['day_pillar'][1]
        db_b = person_b['day_pillar'][1]
        if frozenset([db_a, db_b]) in self.branch_combos:
            report.append(f"🤝 **日支六合 ({db_a}-{db_b})**：相处舒服，生活步调一致。")
            score_bonus += 20
        elif frozenset([db_a, db_b]) in self.branch_clashes:
            report.append(f"⚡ **日支相冲 ({db_a}-{db_b})**：容易有价值观冲突，需磨合。")
            score_bonus -= 10

        # 2. 五行互补 (简单的数量互补逻辑)
        # 假设 person_a 缺火，而 person_b 火多，这就是互补
        # (这里为了简化，仅作逻辑示例，你需要基于你的 count_wuxing 函数)
        # if person_a['lacking'] == '火' and person_b['strongest'] == '火':
        #     report.append("🔥 **五行互补**：对方的强项正好是你的弱项，旺你。")
        #     score_bonus += 20

        # 3. 天旋地克 (年柱/月柱的大冲)
        # ... 可以继续扩展 ...

        base_score = 60 + score_bonus  # 基础分60
        base_score = max(0, min(100, base_score))

        return {
            "details": report,
            "base_score": base_score
        }


def build_couple_prompt(person_a, person_b, comp_data, relation_type="恋人/伴侣", focus_instruction="", language: str = "zh"):
    """
    构建双人合盘的最终 Prompt

    :param person_a: 甲方数据 (包含四柱、格局、强弱、喜用神)
    :param person_b: 乙方数据 (包含四柱、格局、强弱、喜用神)
    :param comp_data: Python算出的合盘硬指标 (包含 details 列表, base_score 等)
    :param relation_type: 关系类型 (恋人/伴侣, 事业合伙人, 知己好友, 尚未确定)
    :param focus_instruction: 用户的核心诉求，如有则重点回答
    """

    is_same_sex = (person_a.get("gender", "未知") == person_b.get("gender", "未知"))

    relation_type_display = relation_type
    if language == "en":
        relation_map = {
            "恋人/伴侣": "Romantic Partners",
            "事业合伙人": "Business Partners",
            "知己好友": "Close Friends",
            "尚未确定": "Relationship Exploratory",
        }
        relation_type_display = relation_map.get(relation_type, "Romantic Partners")

    def _gender_label(raw: str) -> str:
        if raw == "男":
            return "Male"
        if raw == "女":
            return "Female"
        return raw or "Unknown"

    role_instruction = ""
    role_instruction_en = ""

    if is_same_sex and relation_type == "恋人/伴侣":
        role_instruction = (
            "同性伴侣分析要求：不要使用丈夫、妻子、克妻、旺夫等传统异性恋术语。"
            "称呼请使用甲方、乙方、伴侣、对方或另一半。"
            "重点分析阴阳能量的互补与互动方式，不谈生理性别。"
        )
        role_instruction_en = (
            "Same sex couple guidance: do not use husband, wife, or gendered destiny terms. "
            "Use neutral labels such as Partner A, Partner B, partner, or the other person. "
            "Focus on Yin Yang energy dynamics and interaction styles, not biological gender."
        )
    elif relation_type == "事业合伙人":
        role_instruction = (
            "事业合伙分析要求：这是商业合作关系，不谈婚恋或桃花。"
            "请将日支合解读为协作默契，将日支冲解读为经营理念冲突。"
            "重点分析合财与互补，谁适合主导，谁适合执行。"
        )
        role_instruction_en = (
            "Business partnership guidance: do not mention romance or marriage. "
            "Interpret day branch harmony as collaboration synergy and clashes as operational conflict. "
            "Focus on money compatibility, complementary strengths, and leadership versus execution roles."
        )
    elif relation_type == "知己好友":
        role_instruction = (
            "友情分析要求：这是纯友谊关系。"
            "分析两人是否灵魂契合或更偏浅交，重点看性格投缘与情绪支持。"
        )
        role_instruction_en = (
            "Friendship guidance: this is a platonic relationship. "
            "Analyze personality resonance and emotional support, not romance."
        )
    elif relation_type == "尚未确定":
        role_instruction = (
            "关系探索分析要求：关系尚未明确，请从恋人、事业伙伴、朋友三个角度评估契合度，"
            "并建议更适合的关系类型。"
        )
        role_instruction_en = (
            "Relationship exploratory guidance: evaluate compatibility as romantic partners, business partners, and friends, "
            "then recommend which relationship type fits best."
        )
    else:
        role_instruction = "这是传统的异性伴侣分析，请按常规命理逻辑进行。"
        role_instruction_en = "This is a traditional romantic partnership. Follow standard compatibility logic."

    details = comp_data.get("details") or []
    hard_evidence = "；".join(details)

    if language == "en":
        hard_evidence_text = hard_evidence or "None. This indicates a relatively neutral relationship without strong unions or clashes."
        focus_text = focus_instruction if focus_instruction else "No specific focus. Provide a balanced analysis."
        focus_rule = (
            "At least half of the report should address the focus above. Other parts can be brief."
            if focus_instruction
            else "Use a balanced structure across the whole report."
        )
        prompt = f"""
You are a co reader of the life chart, grounded in classical BaZi and Sanming Tonghui, with modern empathy. Write in a warm, plainspoken tone like a friend sitting side by side. Avoid formal or professional openers. Use gentle hedging such as may, might, or perhaps. Your task is to produce a deep compatibility report for two people using the data below.

Partner A. Gender { _gender_label(person_a.get('gender', 'Unknown')) }. Four Pillars {person_a['year_pillar']} {person_a['month_pillar']} {person_a['day_pillar']} {person_a['hour_pillar']}. Core Pattern {person_a.get('pattern_name', 'Standard Pattern')}. Five Elements Energy {person_a.get('strength', 'Unknown')}. Favorable {person_a.get('joy_elements', 'Unknown')}. Na Yin imagery Year {person_a.get('nayin', {}).get('year', 'Unknown')}, Day {person_a.get('nayin', {}).get('day', 'Unknown')}. Personality snapshot should be one sentence based on Day Master and pattern.
Partner B. Gender { _gender_label(person_b.get('gender', 'Unknown')) }. Four Pillars {person_b['year_pillar']} {person_b['month_pillar']} {person_b['day_pillar']} {person_b['hour_pillar']}. Core Pattern {person_b.get('pattern_name', 'Standard Pattern')}. Five Elements Energy {person_b.get('strength', 'Unknown')}. Favorable {person_b.get('joy_elements', 'Unknown')}. Na Yin imagery Year {person_b.get('nayin', {}).get('year', 'Unknown')}, Day {person_b.get('nayin', {}).get('day', 'Unknown')}. Personality snapshot should be one sentence based on Day Master and pattern.

Relationship type {relation_type_display}. Gender pairing {_gender_label(person_a.get('gender', 'Unknown'))} and {_gender_label(person_b.get('gender', 'Unknown'))}. {role_instruction_en}

Hard evidence from calculation is {hard_evidence_text}

User focus is {focus_text}. {focus_rule}


Write four paragraphs in this order. The first gives an overall summary using a nature metaphor. The second explains deep chemistry, including personality collision, and must explicitly integrate the hard evidence. The third names the biggest hidden risk. The fourth gives two to three concrete suggestions and a luck boosting tip based on Favorable elements.

Do not claim destiny to divorce or break up. For clashes use phrasing like growth through friction or needs conscious effort. Use only the provided data. Output must be plain English text paragraphs with no headings, lists, bullets, emojis, brackets, or markdown symbols.

# STRICT LANGUAGE REQUIREMENT
1. **Output Language**: You must provide the ENTIRE response in ENGLISH.
2. **Translation**: Translate all Bazi terms (e.g., "Day Master" for 日主, "Wealth Star" for 财星) into appropriate English terms.
3. **Prohibition**: Do NOT output mixed Chinese/English sentences. Do NOT include Chinese characters unless specifically explaining a term.
"""
        return prompt

    hard_evidence_text = hard_evidence or "无。两人关系较为平稳，没有明显强合或强冲，请据此分析。"
    focus_text = focus_instruction if focus_instruction else "无特别指定，请全面分析"
    focus_rule = "至少一半篇幅回应用户的核心诉求，其余部分可简略带过。" if focus_instruction else "按标准结构进行全面分析。"

    prompt = f"""
你是人生命盘的共读者，熟读三命通会，也懂现代心理学的表达方式。语气要自然温暖，像朋友并肩而坐，不要用职业化或模板化开场，多用或许、可能、似乎保留空间。你的任务是为两位用户进行双人合盘深度分析。

甲方性别 {person_a.get('gender', '未知')}。八字 {person_a['year_pillar']} {person_a['month_pillar']} {person_a['day_pillar']} {person_a['hour_pillar']}。核心格局 {person_a.get('pattern_name', '普通格局')}。五行能量 {person_a.get('strength', '未知')}。喜用神 {person_a.get('joy_elements', '未知')}。纳音意象 年 {person_a.get('nayin', {}).get('year', '未知')} 日 {person_a.get('nayin', {}).get('day', '未知')}。本命画像用一句话描述甲方性格底色。
乙方性别 {person_b.get('gender', '未知')}。八字 {person_b['year_pillar']} {person_b['month_pillar']} {person_b['day_pillar']} {person_b['hour_pillar']}。核心格局 {person_b.get('pattern_name', '普通格局')}。五行能量 {person_b.get('strength', '未知')}。喜用神 {person_b.get('joy_elements', '未知')}。纳音意象 年 {person_b.get('nayin', {}).get('year', '未知')} 日 {person_b.get('nayin', {}).get('day', '未知')}。本命画像用一句话描述乙方性格底色。

关系类型 {relation_type_display}。性别组合 {person_a.get('gender', '未知')} 与 {person_b.get('gender', '未知')}。{role_instruction}

缘分硬指标为 {hard_evidence_text}

用户核心诉求为 {focus_text}。{focus_rule}

写四段正文。第一段给总体评价，用自然界比喻形容关系。第二段写深度化学反应，必须引用缘分硬指标并解释。第三段指出最大的潜在风险与雷区。第四段给出两到三条相处建议，并给出基于喜用神的共同活动建议。

不要断言离婚或分手。遇到刑冲用磨合或修炼等词。分析必须基于提供的八字数据。输出必须为纯文本段落，不要标题、序号、列表、符号、表情、括号或任何 markdown 标记。
"""

    return prompt


def draw_hexagram_svg(binary_code):
    """
    绘制六爻卦象的 SVG 图
    
    :param binary_code: 6位二进制字符串，如 "111000" (从初爻到上爻，即从下到上)
    :return: SVG 字符串
    """
    dwg = svgwrite.Drawing(size=(100, 120))
    
    for i, bit in enumerate(binary_code):
        y = 100 - i * 18  # 从下往上画
        if bit == '1':  # 阳爻 (一条长线)
            dwg.add(dwg.rect(insert=(10, y), size=(80, 10), fill="black"))
        else:  # 阴爻 (两条短线，中间断开)
            dwg.add(dwg.rect(insert=(10, y), size=(35, 10), fill="black"))
            dwg.add(dwg.rect(insert=(55, y), size=(35, 10), fill="black"))
    
    return dwg.tostring()


def build_oracle_prompt(user_question, hex_data, bazi_data, language="zh"):
    """
    构建【命卜合参】的最终 Prompt
    
    :param user_question: 用户的问题 (str)
    :param hex_data: 周易起卦结果 (dict: original_hex, future_hex, changing_lines, details)
    :param bazi_data: 八字排盘结果 (dict: day_pillar, pattern_name, strength, joy_elements)
    :param language: 语言 ("zh" or "en")
    """
    
    # 1. 提炼八字核心画像 (Character Profile)
    # 我们不需要把四柱的所有细节都丢进去，只需要"性格"和"能量"
    bazi_profile = f"""
日主 {bazi_data['day_pillar'][0]} 能量状态 {bazi_data.get('strength', '未知')}。核心格局 {bazi_data.get('pattern_name', '普通格局')}。喜用神 {bazi_data.get('joy_elements', '未知')}。
    """

    # 2. 提炼卦象信息 (Divination Data)
    hex_info = f"""
本卦 {hex_data['original_hex']}。变卦 {hex_data['future_hex']}。动爻 {', '.join(map(str, hex_data.get('changing_lines', [])))}。爻辞细节 {', '.join(hex_data.get('details', []))}。
    """

    # 3. 构建 Prompt
    if language == "en":
        prompt = f"""
You are a co-reader of the life chart, grounded in I Ching (Zhouyi) and classical BaZi, with modern empathy. You are skilled at combining destiny philosophy with realistic decision-making. Your tone should be natural and warm, like a friend sitting side by side. Avoid formal or overly professional openers. Use gentle hedging such as 'may', 'might', or 'perhaps' to leave space.

Input Data:
User Profile (for coping strategy): {bazi_profile}
Divination Matter (User's specific confusion): {user_question}
Hexagram Information: {hex_info}

Please observe the hierarchy of weight:
- Success/Failure/Good/Bad is determined by the Hexagram. Even if the BaZi luck is poor, a highly auspicious Hexagram predicts a good outcome.
- BaZi is like the climate (long term), Hexagram is like the current weather (short term).
- Strategy and Action should be based on the BaZi (Pattern and Strength). If Hexagram is Good but Self is Weak, suggest steady cooperation and leveraging others. If Hexagram is Bad but Self is Strong, advise restraint and patience.

Output Strict Guidelines:
1. **Output Language**: You must provide the ENTIRE response in ENGLISH. Translate all terms.
2. Structure:
   - Paragraph 1: One sentence answer to the user's question. Directly judge Auspicious/Inauspicious or Neutral. No ambiguity.
   - Paragraph 2: Explain the Original Hexagram and Future Hexagram meanings, and focus on the Changing Lines as the breakthrough point.
   - Paragraph 3: Combine with BaZi pattern to give 1-2 concrete action suggestions. 
3. Length: Keep it concise (approx 300-400 words).
4. Safety: Be rational, objective, and warm. If the Hexagram is ominous, focus on risk avoidance or waiting, give hope, and strictly forbid fear-mongering.

Output must be plain English text paragraphs only. No Chinese.
"""
    else:
        prompt = f"""
你是人生命盘的共读者，熟读周易六爻与子平八字，也懂现代心理学的表达方式，擅长将命理哲学与现实决策结合。语气要自然温暖，像朋友并肩而坐，不要用职业化或模板化开场，多用或许、可能、似乎保留空间。

数据输入如下。案主档案用于判断应对策略，内容为 {bazi_profile}
占卜事项是用户当下的具体困惑，用户提问为 {user_question}。卦象信息如下。{hex_info}

请遵守权重原则。成败吉凶以卦象为准，即使八字显示运气不佳，卦象若为大吉也应断为吉。八字像气候，卦象像当下天气。策略与行动以八字为准，结合格局与强弱给出建议。若卦吉但身弱或七杀格，建议稳健合作与借力。若卦凶但身强或伤官格，提醒克制冲动，先忍耐再蓄势。

输出分三段。第一段用一句话回答用户问题，直接判断吉凶或平稳，不要模棱两可。第二段解释本卦与变卦含义，并重点解读动爻的突破口。第三段结合八字格局给出一到两条具体行动建议。总字数控制在六百到八百字之间，言简意赅。

安全合规。保持理性客观温暖。遇到凶卦，侧重避险或等待时机，给予希望，严禁制造恐慌。全文只用中文，不要出现英文或拼音。总回复不超过八百字。
    """
    
    return prompt


# ============================================================
# 五行能量计算器 (Five Elements Energy Calculator)
# ============================================================

# 天干 -> 五行映射
STEM_WUXING_MAP = {
    "甲": "木", "乙": "木",
    "丙": "火", "丁": "火",
    "戊": "土", "己": "土",
    "庚": "金", "辛": "金",
    "壬": "水", "癸": "水"
}

# 地支藏干权重表 (本气/中气/余气)
# 格式: {地支: [(藏干, 权重), ...]}
BRANCH_WEIGHT_MAP = {
    "子": [("癸", 15.0)],
    "丑": [("己", 10.0), ("癸", 3.5), ("辛", 1.5)],
    "寅": [("甲", 10.0), ("丙", 3.5), ("戊", 1.5)],
    "卯": [("乙", 15.0)],
    "辰": [("戊", 10.0), ("乙", 3.5), ("癸", 1.5)],
    "巳": [("丙", 10.0), ("庚", 3.5), ("戊", 1.5)],
    "午": [("丁", 10.0), ("己", 5.0)],
    "未": [("己", 10.0), ("丁", 3.5), ("乙", 1.5)],
    "申": [("庚", 10.0), ("壬", 3.5), ("戊", 1.5)],
    "酉": [("辛", 15.0)],
    "戌": [("戊", 10.0), ("辛", 3.5), ("丁", 1.5)],
    "亥": [("壬", 10.0), ("甲", 5.0)]
}

BAZI_CONFIG = {
    "STEM_COMBINATIONS": {
        ("甲", "己"): "土",
        ("乙", "庚"): "金",
        ("丙", "辛"): "水",
        ("丁", "壬"): "木",
        ("戊", "癸"): "火"
    },
    "BRANCH_TRIPLE_COMBOS": {
        ("申", "子", "辰"): "水",
        ("寅", "午", "戌"): "火",
        ("亥", "卯", "未"): "木",
        ("巳", "酉", "丑"): "金"
    },
    "BRANCH_SIX_COMBOS": {
        ("子", "丑"): "土",
        ("寅", "亥"): "木",
        ("卯", "戌"): "火",
        ("辰", "酉"): "金",
        ("巳", "申"): "水",
        ("午", "未"): "火"
    },
    "ELEMENT_RESTRAINTS": {
        "木": "土",
        "土": "水",
        "水": "火",
        "火": "金",
        "金": "木"
    }
}


def _normalize_pillars(pillars):
    if pillars is None:
        return []
    if isinstance(pillars, (list, tuple)):
        cleaned = []
        for item in pillars:
            if not isinstance(item, str):
                continue
            item = item.strip()
            if len(item) >= 2:
                token = item[:2]
                cleaned.append(token)
        return cleaned
    if isinstance(pillars, str):
        chars = re.sub(r"[^甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]", "", pillars)
        return [chars[i:i + 2] for i in range(0, len(chars), 2) if i + 1 < len(chars)]
    return []


def _check_combinations(scores, stems, branches, branch_contribs, month_element):
    used_stems = set()
    used_branches = set()

    stem_indices = {}
    for idx, stem in stems:
        stem_indices.setdefault(stem, []).append(idx)

    def consume_stem(stem_char):
        items = stem_indices.get(stem_char, [])
        while items:
            idx = items.pop(0)
            if idx not in used_stems:
                used_stems.add(idx)
                return idx
        return None

    if month_element:
        for pair, combo_element in BAZI_CONFIG["STEM_COMBINATIONS"].items():
            if combo_element != month_element:
                continue
            a, b = pair
            idx_a = consume_stem(a)
            idx_b = consume_stem(b)
            if idx_a is None or idx_b is None:
                if idx_a is not None:
                    used_stems.discard(idx_a)
                if idx_b is not None:
                    used_stems.discard(idx_b)
                continue
            scores[STEM_WUXING_MAP[a]] -= 10.0
            scores[STEM_WUXING_MAP[b]] -= 10.0
            scores[combo_element] += 20.0

    branch_indices = {}
    for idx, branch in branches:
        branch_indices.setdefault(branch, []).append(idx)

    def consume_branch(branch_char):
        items = branch_indices.get(branch_char, [])
        while items:
            idx = items.pop(0)
            if idx not in used_branches:
                used_branches.add(idx)
                return idx
        return None

    def remove_branch_contrib(idx):
        contrib = branch_contribs.get(idx, {})
        for element, value in contrib.items():
            scores[element] -= value

    for triple, combo_element in BAZI_CONFIG["BRANCH_TRIPLE_COMBOS"].items():
        a, b, c = triple
        available = [branch_indices.get(a, []), branch_indices.get(b, []), branch_indices.get(c, [])]
        if month_element == combo_element and all(len(items) > 0 for items in available):
            idxs = [consume_branch(a), consume_branch(b), consume_branch(c)]
            if None not in idxs:
                for idx in idxs:
                    remove_branch_contrib(idx)
                scores[combo_element] += 45.0
                continue
        present = [(a, branch_indices.get(a, [])), (b, branch_indices.get(b, [])), (c, branch_indices.get(c, []))]
        present = [item for item in present if len(item[1]) > 0]
        if len(present) >= 2:
            idxs = []
            for branch_char, _ in present[:2]:
                idxs.append(consume_branch(branch_char))
            if None not in idxs:
                for idx in idxs:
                    remove_branch_contrib(idx)
                scores[combo_element] += 22.5

    for pair, combo_element in BAZI_CONFIG["BRANCH_SIX_COMBOS"].items():
        a, b = pair
        if len(branch_indices.get(a, [])) == 0 or len(branch_indices.get(b, [])) == 0:
            continue
        idx_a = consume_branch(a)
        idx_b = consume_branch(b)
        if idx_a is None or idx_b is None:
            if idx_a is not None:
                used_branches.discard(idx_a)
            if idx_b is not None:
                used_branches.discard(idx_b)
            continue
        remove_branch_contrib(idx_a)
        remove_branch_contrib(idx_b)
        scores[combo_element] += 21.0


def calculate_bazi_energy(pillars):
    scores = {"金": 0.0, "木": 0.0, "水": 0.0, "火": 0.0, "土": 0.0}
    normalized = _normalize_pillars(pillars)[:4]
    if not normalized:
        return {k: {"score": 0.0, "pct": 0.0, "percent": 0.0} for k in scores}

    stems = []
    branches = []
    branch_contribs = {}

    for idx, pillar in enumerate(normalized):
        if len(pillar) != 2:
            continue
        stem, branch = pillar[0], pillar[1]
        stems.append((idx, stem))
        branches.append((idx, branch))
        if stem in STEM_WUXING_MAP:
            scores[STEM_WUXING_MAP[stem]] += 10.0
        if branch in BRANCH_WEIGHT_MAP:
            branch_contribs[idx] = {}
            for hidden_stem, weight in BRANCH_WEIGHT_MAP[branch]:
                element = STEM_WUXING_MAP.get(hidden_stem)
                if element:
                    scores[element] += weight
                    branch_contribs[idx][element] = branch_contribs[idx].get(element, 0.0) + weight

    month_branch = normalized[1][1] if len(normalized) > 1 and len(normalized[1]) == 2 else None
    month_element = None
    if month_branch in BRANCH_WEIGHT_MAP:
        main_stem = BRANCH_WEIGHT_MAP[month_branch][0][0]
        month_element = STEM_WUXING_MAP.get(main_stem)

    _check_combinations(scores, stems, branches, branch_contribs, month_element)

    if month_branch in BRANCH_WEIGHT_MAP:
        main_element = month_element
        if main_element:
            controlled = BAZI_CONFIG["ELEMENT_RESTRAINTS"].get(main_element)
            for element in list(scores.keys()):
                if element == main_element:
                    scores[element] *= 1.5
                elif controlled and element == controlled:
                    scores[element] *= 0.8

    total = sum(scores.values())
    if total <= 0:
        return {k: {"score": 0.0, "pct": 0.0, "percent": 0.0} for k in scores}

    raw_percent = {k: (v / total) * 100 for k, v in scores.items()}
    rounded = {k: round(v, 2) for k, v in raw_percent.items()}
    diff = round(100.0 - sum(rounded.values()), 2)
    if abs(diff) >= 0.01:
        target = max(scores.items(), key=lambda x: x[1])[0]
        rounded[target] = round(rounded[target] + diff, 2)

    result = {}
    for element, score in scores.items():
        percent = rounded[element]
        result[element] = {
            "score": round(score, 2),
            "pct": round(percent / 100, 4),
            "percent": percent
        }
    return result


class BaziEnergyCalculator:
    """
    五行能量计算器 - 基于四柱计算五行能量分布
    
    算法说明:
    - 天干: 每个天干贡献 10 点
    - 地支藏干: 按本气/中气/余气拆分
    - 月令: 主气同类 *1.5，被克 *0.8
    """
    
    def __init__(self):
        self.stem_map = STEM_WUXING_MAP
        self.branch_map = BRANCH_WEIGHT_MAP
    
    def calculate_energy(self, pillars):
        return calculate_bazi_energy(pillars)
    
    def get_dominant_element(self, pillars):
        """
        获取主导五行
        
        :param pillars: 四柱列表
        :return: (五行名, 百分比)
        """
        energy = self.calculate_energy(pillars)
        dominant = max(energy.items(), key=lambda x: x[1]['score'])
        return dominant[0], dominant[1]['pct']
    
    def get_weakest_element(self, pillars):
        """
        获取最弱五行
        
        :param pillars: 四柱列表
        :return: (五行名, 百分比)
        """
        energy = self.calculate_energy(pillars)
        weakest = min(energy.items(), key=lambda x: x[1]['score'])
        return weakest[0], weakest[1]['pct']


class EnergyPieChartGenerator:
    """
    五行能量饼图生成器 - 渲染 SVG 饼图
    
    功能:
    - 根据五行分数生成饼图切片
    - 显示五行配色图例
    - 百分比标签
    """
    
    def __init__(self):
        # 五行配色 (与 BaziChartGenerator 一致)
        self.colors = {
            "木": "#2E8B57",  # 翠绿
            "火": "#E74C3C",  # 朱红
            "土": "#D35400",  # 土黄
            "金": "#F1C40F",  # 金色
            "水": "#2980B9"   # 湛蓝
        }
        # 五行顺序 (相生序)
        self.element_order = ["木", "火", "土", "金", "水"]
    
    def generate_chart(self, energy_data, width=400, height=250):
        """
        生成五行能量饼图 SVG
        
        :param energy_data: BaziEnergyCalculator.calculate_energy() 返回的字典
                            {'木': {'score': 250, 'pct': 0.25}, ...}
        :param width: 画布宽度
        :param height: 画布高度
        :return: SVG 字符串
        """
        import math
        
        dwg = svgwrite.Drawing(size=(width, height), viewBox=f"0 0 {width} {height}")
        
        # 添加背景
        dwg.add(dwg.rect(insert=(0, 0), size=(width, height), fill="#1a1a2e", rx=10))
        
        # 饼图参数
        cx, cy = 120, 125  # 圆心
        radius = 90
        
        # 排序并计算角度
        current_angle = -90  # 从12点钟方向开始 (SVG 坐标系)
        
        for element in self.element_order:
            if element not in energy_data:
                continue
            
            pct = energy_data[element]['pct']
            if pct <= 0:
                continue
            
            sweep_angle = pct * 360
            
            # 计算弧线端点
            start_rad = math.radians(current_angle)
            end_rad = math.radians(current_angle + sweep_angle)
            
            x1 = cx + radius * math.cos(start_rad)
            y1 = cy + radius * math.sin(start_rad)
            x2 = cx + radius * math.cos(end_rad)
            y2 = cy + radius * math.sin(end_rad)
            
            # 大弧标志 (角度 > 180 度)
            large_arc = 1 if sweep_angle > 180 else 0
            
            # SVG 弧线路径
            path_data = f"M {cx},{cy} L {x1},{y1} A {radius},{radius} 0 {large_arc},1 {x2},{y2} Z"
            
            dwg.add(dwg.path(d=path_data, fill=self.colors[element], stroke="#1a1a2e", stroke_width=2))
            
            # 在扇形中间添加百分比标签 (如果 >= 8%)
            if pct >= 0.08:
                mid_angle = current_angle + sweep_angle / 2
                mid_rad = math.radians(mid_angle)
                label_r = radius * 0.65
                lx = cx + label_r * math.cos(mid_rad)
                ly = cy + label_r * math.sin(mid_rad)
                
                pct_text = f"{int(pct * 100)}%"
                dwg.add(dwg.text(pct_text, insert=(lx, ly + 4),
                                 font_size="13", font_weight="bold",
                                 fill="white", text_anchor="middle",
                                 style="font-family: 'Helvetica Neue', sans-serif"))
            
            current_angle += sweep_angle
        
        # 绘制图例 (右侧)
        legend_x = 250
        legend_y_start = 50
        
        # 图例标题
        dwg.add(dwg.text("五行能量", insert=(legend_x + 40, legend_y_start - 10),
                         font_size="14", font_weight="bold", fill="#FFD700",
                         text_anchor="middle", style="font-family: 'PingFang SC', sans-serif"))
        
        for i, element in enumerate(self.element_order):
            y_pos = legend_y_start + i * 35
            
            # 色块
            dwg.add(dwg.rect(insert=(legend_x, y_pos), size=(24, 24),
                            fill=self.colors[element], rx=4))
            
            # 五行名
            dwg.add(dwg.text(element, insert=(legend_x + 32, y_pos + 17),
                             font_size="16", font_weight="bold",
                             fill=self.colors[element],
                             style="font-family: 'PingFang SC', 'STKaiti', sans-serif"))
            
            # 分数和百分比
            if element in energy_data:
                score = energy_data[element]['score']
                pct = energy_data[element]['pct']
                info_text = f"{score}分 ({int(pct * 100)}%)"
                dwg.add(dwg.text(info_text, insert=(legend_x + 60, y_pos + 17),
                                 font_size="12", fill="#CCCCCC",
                                 style="font-family: 'Helvetica Neue', sans-serif"))
        
        return dwg.tostring()
    
    def save_chart(self, energy_data, filepath, width=400, height=250):
        """
        保存饼图到文件
        
        :param energy_data: 能量数据字典
        :param filepath: 保存路径
        :param width: 画布宽度
        :param height: 画布高度
        """
        svg_content = self.generate_chart(energy_data, width, height)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(svg_content)


def generate_energy_pie_chart(pillars):
    """
    便捷函数: 从四柱直接生成五行能量饼图
    
    :param pillars: 四柱列表, 如 ['甲子', '丙寅', '戊辰', '庚午']
    :return: SVG 字符串
    """
    calculator = BaziEnergyCalculator()
    energy_data = calculator.calculate_energy(pillars)
    
    generator = EnergyPieChartGenerator()
    return generator.generate_chart(energy_data)


# ============================================================
# 示例用法 (Example Usage)
# ============================================================
if __name__ == "__main__":
    # 示例四柱: 甲子年 丙寅月 戊辰日 庚午时
    sample_pillars = ["甲子", "丙寅", "戊辰", "庚午"]
    
    # 1. 计算五行能量
    calc = BaziEnergyCalculator()
    energy = calc.calculate_energy(sample_pillars)
    
    print("=" * 50)
    print("五行能量分布:")
    print("=" * 50)
    for element, data in energy.items():
        print(f"  {element}: {data['score']}分 ({data['pct']*100:.1f}%)")
    
    dominant, dom_pct = calc.get_dominant_element(sample_pillars)
    weakest, weak_pct = calc.get_weakest_element(sample_pillars)
    print(f"\n主导五行: {dominant} ({dom_pct*100:.1f}%)")
    print(f"最弱五行: {weakest} ({weak_pct*100:.1f}%)")
    
    # 2. 生成饼图 SVG
    svg = generate_energy_pie_chart(sample_pillars)
    
    # 保存到文件
    output_path = "/tmp/energy_pie_chart.svg"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(svg)
    
    print(f"\n饼图已保存到: {output_path}")
