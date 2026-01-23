"""
八字工具类 - 合盘分析等
"""
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

        return {
            "details": report,
            "base_score": 60 + score_bonus  # 基础分60
        }


def build_couple_prompt(person_a, person_b, comp_data, relation_type="恋人/伴侣", focus_instruction=""):
    """
    构建双人合盘的最终 Prompt
    
    :param person_a: 甲方数据 (包含四柱、格局、强弱、喜用神)
    :param person_b: 乙方数据 (包含四柱、格局、强弱、喜用神)
    :param comp_data: Python算出的合盘硬指标 (包含 'details' 列表, 'base_score' 等)
    :param relation_type: 关系类型 (恋人/伴侣, 事业合伙人, 知己好友, 尚未确定)
    :param focus_instruction: 用户的核心诉求，如有则重点回答
    """
    
    # 1. 检测性别组合
    is_same_sex = (person_a.get('gender', '未知') == person_b.get('gender', '未知'))
    
    # 2. 定制化 Role 指令
    role_instruction = ""
    
    if is_same_sex and relation_type == "恋人/伴侣":
        # 同性恋人：去性别化，强调角色互动
        role_instruction = """
    **⚠️ 特殊指令（同性伴侣分析）**：
    1.  **严禁使用**"丈夫"、"妻子"、"克妻"、"旺夫"等传统异性恋术语。
    2.  请使用"甲方/乙方"、"伴侣"、"对方"或"另一半"来称呼。
    3.  分析重点在于**阴阳能量的互补**（如一方阳刚一方阴柔，或双方都很强势），而非生理性别。
        """
    elif relation_type == "事业合伙人":
        # 事业伙伴：完全不谈感情，只谈钱和协作
        role_instruction = """
    **⚠️ 特殊指令（事业合伙分析）**：
    1.  这是商业合伙关系，**严禁提及**婚恋、桃花、夫妻宫等情感术语。
    2.  请将"日支合"解读为"协作默契"，将"日支冲"解读为"经营理念冲突"。
    3.  重点分析：两人合财吗？能否互补短板？谁适合主导（CEO），谁适合执行（COO）？
        """
    elif relation_type == "知己好友":
        # 朋友：谈性格共鸣
        role_instruction = """
    **⚠️ 特殊指令（友情分析）**：
    1.  这是纯友谊关系。请分析两人是否是"灵魂知己"或"酒肉朋友"。
    2.  重点看性格是否投缘，能否互相提供情绪价值。
        """
    elif relation_type == "尚未确定":
        # 尚未确定关系：全面分析各种可能性
        role_instruction = """
    **⚠️ 特殊指令（关系探索分析）**：
    1.  两人关系尚未明确，请从多角度分析他们的契合度。
    2.  请分别评估：作为恋人、作为事业伙伴、作为朋友的匹配程度。
    3.  给出建议：根据两人八字特点，哪种关系更适合他们？
        """
    else:
        # 默认异性恋人
        role_instruction = "这是传统的异性伴侣分析，请按常规命理逻辑进行。"
    
    # 将 Python 算出的列表转换为 Markdown 文本
    hard_evidence = "\n".join([f"- {item}" for item in comp_data['details']])
    
    prompt = f"""
    # Role & Persona
    你是一位精通《三命通会》与现代心理学的**资深情感命理师**。
    你现在的任务是为两位用户进行【双人合盘深度分析】。
    
    ---
    ### 📂 档案资料 (System Verified Data)
    
    **【甲方 (User A)】**
    - **性别**：{person_a.get('gender', '未知')}
    - **八字**：{person_a['year_pillar']}  {person_a['month_pillar']}  {person_a['day_pillar']}  {person_a['hour_pillar']}
    - **核心格局**：{person_a.get('pattern_name', '普通格局')}
    - **五行能量**：{person_a.get('strength', '未知')} (喜：{person_a.get('joy_elements', '未知')})
    - **纳音意象**：年-{person_a.get('nayin', {}).get('year', '未知')}, 日-{person_a.get('nayin', {}).get('day', '未知')}
    - **本命画像**：(请基于其日主和格局，用一句话描述甲方的性格底色，如"固执但有责任感的磐石")
    
    **【乙方 (User B)】**
    - **性别**：{person_b.get('gender', '未知')}
    - **八字**：{person_b['year_pillar']}  {person_b['month_pillar']}  {person_b['day_pillar']}  {person_b['hour_pillar']}
    - **核心格局**：{person_b.get('pattern_name', '普通格局')}
    - **五行能量**：{person_b.get('strength', '未知')} (喜：{person_b.get('joy_elements', '未知')})
    - **纳音意象**：年-{person_b.get('nayin', {}).get('year', '未知')}, 日-{person_b.get('nayin', {}).get('day', '未知')}
    - **本命画像**：(请基于其日主和格局，用一句话描述乙方的性格底色)

    ---
    ### 🎯 关系定义 (Relationship Context)
    - **关系类型**：{relation_type}
    - **性别组合**：{person_a.get('gender', '未知')} + {person_b.get('gender', '未知')}
    {role_instruction}

    ---
    ### 🔗 缘分硬指标 (Python Calculated)
    **⚠️ 系统检测到以下关键化学反应，请务必将其作为分析的核心依据：**
    {hard_evidence}
    
    *(如果此处为空，代表两人八字无明显的强冲或强合，属于平淡关系，请据此分析)*

    ---
    ### 🎯 用户核心诉求 (User Focus)
    **用户现在的疑问点是**：{focus_instruction if focus_instruction else "无特别指定，请全面分析"}
    **指令**：{'请在分析报告中，**用 50% 以上的篇幅** 专门回答这个问题。其他维度可简略带过。' if focus_instruction else '请按照标准结构进行全面分析。'}

    ---
    ### 📝 分析指令 (Instructions)
    
    请撰写一份**《双人灵魂契合度报告》**，语气要温暖、客观且具有洞察力。请严格按照以下结构输出 Markdown：

    #### 1. 💑 缘分总评
    * 请用一个**自然界的比喻**来形容这段关系。只使用中文标题。
    * *示例*："你们的关系就像**'藤蔓缠绕大树'**，甲方提供了稳定的依靠，而乙方带来了生机与情感的滋养。"
    * *逻辑参考*：结合双方的身强身弱（如一强一弱为互补）和五行喜忌（如互补则为救赎）。

    #### 2. 🧪 深度化学反应
    * **性格碰撞**：结合【格局】分析。例如：七杀格（急躁）遇到正印格（包容），是谁在迁就谁？
    * **硬指标解读**：**必须引用**上述"缘分硬指标"中的内容。
        * 如果有**日支六合**，请强调"相处默契，甚至不用说话就知道对方想什么"。
        * 如果有**日支相冲**，请直言"容易在生活琐事上价值观不同"，并指出具体的冲突点（如：一个想安稳，一个想折腾）。

    #### 3. ⚠️ 潜在风险与雷区
    * 不要只说好话。请敏锐地指出两人关系中最大的隐患。
    * *例如*：流年冲克、沟通方式的差异、或者一方对另一方的过度消耗。

    #### 4. 💡 经营建议
    * 给出 2-3 条具体的相处建议。
    * **开运建议**：基于两人的喜用神，推荐一个共同的活动（如：两人都喜火，建议多去南方旅游或一起露营）。

    ---
    **特别禁忌**：
    1.  严禁说"你们肯定会离婚"或"你们注定分手"。
    2.  遇到刑冲，请用"磨合"、"修炼"等词汇代替"克死"。
    3.  分析必须基于上述提供的八字数据，不可胡编乱造。
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


def build_oracle_prompt(user_question, hex_data, bazi_data):
    """
    构建【命卜合参】的最终 Prompt
    
    :param user_question: 用户的问题 (str)
    :param hex_data: 周易起卦结果 (dict: original_hex, future_hex, changing_lines, details)
    :param bazi_data: 八字排盘结果 (dict: day_pillar, pattern_name, strength, joy_elements)
    """
    
    # 1. 提炼八字核心画像 (Character Profile)
    # 我们不需要把四柱的所有细节都丢进去，只需要"性格"和"能量"
    bazi_profile = f"""
    - **日主 (本我)**：{bazi_data['day_pillar'][0]} (能量状态：{bazi_data.get('strength', '未知')})
    - **核心格局 (性格底色)**：{bazi_data.get('pattern_name', '普通格局')}
    - **喜用神 (能量需求)**：{bazi_data.get('joy_elements', '未知')}
    """

    # 2. 提炼卦象信息 (Divination Data)
    hex_info = f"""
    - **本卦 (现状)**：{hex_data['original_hex']}
    - **变卦 (趋势)**：{hex_data['future_hex']}
    - **动爻 (变数)**：{', '.join(map(str, hex_data.get('changing_lines', [])))} 
    - **爻辞细节**：{'; '.join(hex_data.get('details', []))}
    """

    # 3. 构建 Prompt
    prompt = f"""
    # Role & Persona
    你是一位精通《周易》六爻与《子平八字》的国学大师，擅长将"命理哲学"与"现实决策"结合。
    
    ---
    ### 📂 数据输入 (Data Input)

    **1. 案主档案 (Context - 仅作背景参考)**
    *这是用户的"出厂设置"与性格底色，用于决定"应对策略"。*
    {bazi_profile}

    **2. 占卜事项 (Focus - 核心决策依据)**
    *这是用户当下的具体困惑，用于决定"吉凶成败"。*
    * **用户提问**："{user_question}"
    {hex_info}

    ---
    ### 🧠 核心思考协议 (Priority Protocol) - 重要！
    请严格遵守以下**权重原则**进行分析，切勿混淆：

    **1. 决断权在卦 (Hexagram rules the Outcome)**
    * **成败吉凶，以卦象为准！**
    * 即使八字显示用户运气不好，如果卦象是大吉（如《乾为天》），请断为吉。
    * *逻辑*：八字是气候，卦象是当下的天气。气候差不代表今天不下雨。

    **2. 策略权在命 (Bazi rules the Strategy)**
    * **怎么做，以八字为准！**
    * 结合案主的【格局】与【强弱】给出建议。
    * *场景A*：若卦吉，但案主**身弱/七杀格**（抗压差） -> 建议："虽然机会很好，但不要单打独斗，需找人合作（印比帮身）"。
    * *场景B*：若卦凶，且案主**身强/伤官格**（心气高） -> 建议："目前时机未到，你才华虽高但容易冲动，现在最需要的是忍耐和蛰伏"。

    ---
    ### 📝 输出结构 (Output Format)
    请以 Markdown 格式输出。**严格限制总字数在 600-800 字以内**，言简意赅，不要铺陈废话。

    #### 1. 🔮 大师直断
    * 用一句话直接回答用户的问题（吉/凶/平/待定）。不要模棱两刻。只使用中文标题。（控制在 50 字以内）

    #### 2. 📜 卦象天机
    * **断语**：解释【本卦】和【变卦】的含义（结合用户的问题，不要掉书袋）。
    * **玄机**：重点解读【动爻】。动爻是事情的突破口，它暗示了什么？
    * （此段控制在 200 字以内）

    #### 3. 💡 命理锦囊
    * **话术要求**：必须结合用户的【八字格局】来谈。
    * *模板*："结合你的命盘来看，你是 [格局名] 的人，性格 [性格关键词]。面对这个卦象显示的局势，最佳策略是……"
    * **行动建议**：给出 1-2 条具体的行动指南。
    * （此段控制在 200 字以内）

    ---
    **安全合规指令**：
    保持理性、客观、温暖。遇到凶卦，请侧重于"如何避险"或"等待时机"，给予希望，严禁制造恐慌。
    
    **语言要求**：全文（包括标题）严禁出现任何英文或拼音。
    
    **长度红线**：总回复不超过 800 字。超过即为失败。
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
    "子": [("癸", 100)],
    "丑": [("己", 60), ("癸", 30), ("辛", 10)],
    "寅": [("甲", 60), ("丙", 30), ("戊", 10)],
    "卯": [("乙", 100)],
    "辰": [("戊", 60), ("乙", 30), ("癸", 10)],
    "巳": [("丙", 60), ("戊", 30), ("庚", 10)],
    "午": [("丁", 70), ("己", 30)],
    "未": [("己", 60), ("丁", 30), ("乙", 10)],
    "申": [("庚", 60), ("壬", 30), ("戊", 10)],
    "酉": [("辛", 100)],
    "戌": [("戊", 60), ("辛", 30), ("丁", 10)],
    "亥": [("壬", 70), ("甲", 30)]
}


class BaziEnergyCalculator:
    """
    五行能量计算器 - 基于四柱计算五行能量分布
    
    算法说明:
    - 天干: 每个天干贡献 100 点到对应五行
    - 地支藏干: 按本气(60-100)、中气(30)、余气(10)的权重分配
    """
    
    def __init__(self):
        self.stem_map = STEM_WUXING_MAP
        self.branch_map = BRANCH_WEIGHT_MAP
    
    def calculate_energy(self, pillars):
        """
        计算五行能量分布
        
        :param pillars: 四柱列表, 如 ['甲子', '丙寅', '戊辰', '庚午']
        :return: dict 包含每个五行的分数和百分比
                 {'木': {'score': 250, 'pct': 0.25}, ...}
        """
        # 初始化五行分数
        scores = {"木": 0, "火": 0, "土": 0, "金": 0, "水": 0}
        
        for pillar in pillars:
            if len(pillar) != 2:
                continue
            
            stem, branch = pillar[0], pillar[1]
            
            # 1. 天干贡献 100 点
            if stem in self.stem_map:
                wuxing = self.stem_map[stem]
                scores[wuxing] += 100
            
            # 2. 地支藏干按权重贡献
            if branch in self.branch_map:
                for hidden_stem, weight in self.branch_map[branch]:
                    if hidden_stem in self.stem_map:
                        wuxing = self.stem_map[hidden_stem]
                        scores[wuxing] += weight
        
        # 计算总分和百分比
        total = sum(scores.values())
        if total == 0:
            total = 1  # 避免除零
        
        result = {}
        for element, score in scores.items():
            result[element] = {
                "score": score,
                "pct": round(score / total, 4)
            }
        
        return result
    
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

