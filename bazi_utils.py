"""
八字工具类 - 合盘分析等
"""


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
    - **本命画像**：(请基于其日主和格局，用一句话描述甲方的性格底色，如"固执但有责任感的磐石")
    
    **【乙方 (User B)】**
    - **性别**：{person_b.get('gender', '未知')}
    - **八字**：{person_b['year_pillar']}  {person_b['month_pillar']}  {person_b['day_pillar']}  {person_b['hour_pillar']}
    - **核心格局**：{person_b.get('pattern_name', '普通格局')}
    - **五行能量**：{person_b.get('strength', '未知')} (喜：{person_b.get('joy_elements', '未知')})
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

    #### 1. 💑 缘分总评 (The Metaphor)
    * 不要直接说分数。请用一个**自然界的比喻**来形容这段关系。
    * *示例*："你们的关系就像**'藤蔓缠绕大树'**，甲方提供了稳定的依靠，而乙方带来了生机与情感的滋养。"
    * *逻辑参考*：结合双方的身强身弱（如一强一弱为互补）和五行喜忌（如互补则为救赎）。

    #### 2. 🧪 深度化学反应 (Interaction Analysis)
    * **性格碰撞**：结合【格局】分析。例如：七杀格（急躁）遇到正印格（包容），是谁在迁就谁？
    * **硬指标解读**：**必须引用**上述"缘分硬指标"中的内容。
        * 如果有**日支六合**，请强调"相处默契，甚至不用说话就知道对方想什么"。
        * 如果有**日支相冲**，请直言"容易在生活琐事上价值观不同"，并指出具体的冲突点（如：一个想安稳，一个想折腾）。

    #### 3. ⚠️ 潜在风险与雷区 (Risk Alert)
    * 不要只说好话。请敏锐地指出两人关系中最大的隐患。
    * *例如*：流年冲克、沟通方式的差异、或者一方对另一方的过度消耗。

    #### 4. 💡 经营建议 (Actionable Advice)
    * 给出 2-3 条具体的相处建议。
    * **开运建议**：基于两人的喜用神，推荐一个共同的活动（如：两人都喜火，建议多去南方旅游或一起露营）。

    ---
    **特别禁忌**：
    1.  严禁说"你们肯定会离婚"或"你们注定分手"。
    2.  遇到刑冲，请用"磨合"、"修炼"等词汇代替"克死"。
    3.  分析必须基于上述提供的八字数据，不可胡编乱造。
    """
    
    return prompt
