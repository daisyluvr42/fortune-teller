# 八字算命大师 (Fortune Teller Agent)

基于 Streamlit 的八字算命应用，使用 LLM 进行命理解读。集成 Python 精确排盘 + AI 智能分析。

## 技术栈

- **Python 3.9+** + **uv** (包管理)
- **Streamlit** (Web UI)
- **lunar_python** (八字计算)
- **OpenAI SDK** (LLM 调用，兼容 DeepSeek/Gemini 等)
- **svgwrite** (SVG 图表生成)
- **Tavily** (可选，Tool Use 搜索)

## 项目结构

```
.
├── app.py           # Streamlit 主应用
├── logic.py         # 八字计算 & LLM 调用 & 格局/调候/周易计算器
├── bazi_utils.py    # 合盘计算器 & 周易图表 & Prompt 构建器
├── db_utils.py      # Supabase 数据库工具 & 用户档案管理
├── pdf_generator.py # PDF 报告生成器 (ReportLab)
├── china_cities.py  # 350+ 中国城市经度数据
├── .env             # 环境变量 (API Key, Supabase)
└── pyproject.toml   # 项目配置
```

## 核心功能

### 输入项
| 项目 | 说明 |
|------|------|
| 性别 | 男/女 下拉框 |
| 出生日期 | 阳历 (日期选择器) 或 农历 (年/月/日下拉框，支持闰月)，使用单选按钮切换 |
| 出生时间 | 精确时间 (时:分) 或 时辰 (子时-亥时)，使用单选按钮切换 |
| 出生地点 | 350+ 中国城市，用于真太阳时计算 |
| AI 模型 | 可选，默认 Gemini API |
| 关系类型 | **合盘模式专用**：可选 恋人/事业合伙人/知己好友/尚未确定 |

### 分析按钮 (7个)
| 按钮 | 功能 |
|------|------|
| **整体命格** | 《人生剧本与灵魂底色报告》- 格局定名、人生角色、大运总评 |
| **事业运势** | 《深度事业发展规划》- 职场竞争力、黄金赛道、创业指数 |
| **感情运势** | 《专属情感命运报告》- 恋爱DNA、伴侣画像、桃花时间轴 |
| **喜用忌用** | 《五行能量管理与开运指南》- 能量维他命、能量过敏原、开运方案 |
| **健康建议** | 《身心能量调理指南》- 五色食疗、运动处方、流年健康备忘 |
| **开运建议** | 《全场景转运与能量提升方案》- 晶石饰品、工位风水、居家能量 |
| **大师解惑** | 自定义问题，支持共情式回答 |

### 合盘分析按钮 (4个) ⭐ NEW
| 按钮 | 功能 |
|------|------|
| **💖 缘分契合度** | 性格互补 + 灵魂羁绊，正缘vs孽缘判断 |
| **💍 婚姻前景** | 未来5年流年走势，结婚概率 + 最佳年份 |
| **💣 避雷指南** | 矛盾引爆点 + 心理学沟通建议 |
| **💰 对方旺我吗** | 五行能量互补，财运/事业运影响分析 |

### 核心特性
- ✅ **Python 精确排盘** - 八字四柱、格局、十神由后端精确计算
- ✅ **SVG 可视化排盘** - 五行配色、十神标注、藏干显示
- ✅ **格局自动判断** - 支持特殊格局 (飞天禄马/魁罡/化气格等) + 正格
- ✅ **调候用神计算** - 冬夏季节自动计算调候需求
- ✅ **真太阳时计算** - 基于出生地经度自动校正
- ✅ **流式响应** - Streaming 实时输出
- ✅ **多 AI 提供商** - Gemini/DeepSeek/OpenAI/Claude/Moonshot/智谱
- ✅ **会话连续性** - 后续分析包含完整历史问答记录
- ✅ **localStorage 持久化** - 自动保存/恢复分析记录
- ✅ **搜索增强** - Tavily Tool Use 搜索行业趋势、流行色等
- ✅ **双重安全防护** - 服务器端关键词拦截 + LLM 端安全结束符
- ✅ **API 速率限制** - 默认 API 每会话 20 次限制
- ✅ **周易起卦** - 金钱课起卦法 + 64卦完整映射 + 卦象 SVG 可视化（金色文字增强可视性）
- ✅ **命卜合参** - 八字 + 周易结合分析，决断在卦、策略在命（精准限制 800 字以内）

## 运行方式

```bash
uv run streamlit run app.py
```

访问 http://localhost:8501

## 在线访问

🌐 **Streamlit Cloud**: https://fortune-teller-bazi.streamlit.app

📦 **GitHub**: https://github.com/daisyluvr42/fortune-teller

## API 配置

默认使用环境变量中的 Gemini API。如需自定义：
1. 展开「AI 模型设置」
2. 选择提供商并输入 API Key

编辑 `.env` 文件：
```
GEMINI_API_KEY=your_gemini_key_here    # 默认 API
DEEPSEEK_API_KEY=your_key_here         # 可选
TAVILY_API_KEY=your_key_here           # 可选，用于 Tool Use 搜索功能
```

**安全说明**：默认 API Key 已移至 `.env` 文件，不再硬编码。每会话限制 20 次请求以防滥用。

## 版本规范

- 当前版本号存放在项目根目录的 `VERSION` 文件中（供 UI 与发布同步读取）。
- 如果新增/调整功能或用户可感知行为，必须顺次更新 `VERSION`。

## 主要类与函数

### logic.py - 格局计算器

#### BaziPatternCalculator
基础八字格局计算器，用于计算正格（八格）。
- `get_ten_god(day_master, target_stem)` - 计算十神关系
- `calculate_pattern(day_master, month_branch, all_stems)` - 计算格局
- `get_hidden_stems(branch)` - 获取地支藏干
- `get_all_ten_gods(day_master, pillars)` - 计算所有十神

#### BaziPatternAdvanced
高级特殊格局计算器，优先于正格判断。

支持的特殊格局：
| 类型 | 格局 |
|------|------|
| 冲奔类 | 飞天禄马格、井栏叉马格、壬骑龙背格 |
| 遥合类 | 子遥巳格、丑遥巳格 |
| 日时组合 | 六乙鼠贵格、六阴朝阳格、日禄归时格、刑合格、拱禄格、拱贵格 |
| 气质形象 | 魁罡格、金神格、天元一气格、地元一气格 |
| 化气格 | 化土格、化金格、化水格、化木格、化火格 |

#### BaziStrengthCalculator
身强身弱计算器，使用加权打分法判定日主旺衰。
- `get_wuxing(char)` - 获取干支的五行属性
- `calculate_strength(day_master, month_branch, pillars)` - 计算身强身弱
- `get_joy_elements(is_strong, dm_wx, resource_wx)` - 推导喜用神

**算法说明**：
- 月令权重最高 (40%)，决定得令/失令
- 根据同党得分 (比劫+印枭) 与动态阈值判断
- 得令时阈值=38，失令时阈值=48
- 输出：身旺/身弱 + 喜用神建议

#### BaziInteractionCalculator
地支互动计算器，计算藏干、三会、三合、六合、六冲。
- `get_zang_gan(branches)` - 获取四柱藏干 (本气/中气/余气)
- `get_interactions(branches)` - 计算地支合冲局势
- `calculate_all(branches)` - 综合计算

**支持的地支关系**：
| 类型 | 说明 | 力量 |
|------|------|------|
| 三会方局 | 亥子丑北方水局、寅卯辰东方木局等 | 最强 |
| 三合局 | 申子辰水局、亥卯未木局等 | 次强 |
| 六合 | 子丑合土、寅亥合木等 | 中等 |
| 六冲 | 子午冲、寅申冲等 | 破坏力 |

#### BaziAuxiliaryCalculator
辅助计算器，计算十二长生、空亡、神煞、刑冲合害。
- `get_12_stages(day_master, branches)` - 计算日主在四柱地支的长生状态
- `get_kong_wang(day_stem, day_branch)` - 计算日柱空亡
- `get_shen_sha(day_master, day_branch, all_branches)` - 核心神煞 (天乙贵人/桃花/驿马)
- `get_interactions(all_branches)` - 地支刑冲合害 (六冲/六合/三合)
- `calculate_all(...)` - 综合计算所有辅助信息

#### TiaoHouCalculator
调候用神计算器，根据月令季节计算调候需求。
- `get_tiao_hou(day_master, month_branch)` - 计算调候用神

**调候规则**：
| 季节 | 月令 | 总原则 | 急需五行 |
|------|------|--------|----------|
| 冬季 | 亥/子/丑 | 寒需暖 | 以火为主 |
| 夏季 | 巳/午/未 | 热需寒 | 以水为主 |
| 春秋 | 其他 | 气候平和 | 按强弱分析 |

**返回值**：`{"status": "...", "needs": "...", "advice": "...", "is_urgent": True/False}`

#### ZhouyiCalculator ⭐ NEW
周易起卦计算器，实现金钱课起卦法。
- `cast_hexagram()` - 模拟3枚硬币摇6次起卦
- `get_hexagram_by_binary(binary_str)` - 根据二进制获取卦象信息
- `format_hexagram_display(result)` - 格式化卦象文本输出

**64卦映射**：完整的二进制码到卦名映射，按八宫分类（乾/兑/离/震/巽/坎/艮/坤）。

**起卦逻辑**：
| 硬币和 | 爻类型 | 变爻 | 说明 |
|--------|--------|------|------|
| 6 | 老阴 | ✓ | 阴爻动，变阳 |
| 7 | 少阳 | ✗ | 阳爻静 |
| 8 | 少阴 | ✗ | 阴爻静 |
| 9 | 老阳 | ✓ | 阳爻动，变阴 |

**返回值**：
```python
{
    "original_hex": "乾为天",      # 本卦全名
    "future_hex": "天风姤",        # 变卦全名 (有动爻时)
    "changing_lines": [6],         # 动爻列表 (1-6)
    "details": [...],              # 每爻详情
    "upper_trigram": "☰ 乾(天)",  # 上卦
    "lower_trigram": "☰ 乾(天)",  # 下卦
    "has_change": True             # 是否有变卦
}
```

#### BaziChartGenerator
八字排盘 SVG 图表生成器，生成专业美观的可视化排盘。
- `get_color(char)` - 根据干支获取五行颜色
- `generate_chart(bazi_data, filename)` - 生成 SVG 字符串
- `save_chart(bazi_data, filepath)` - 保存 SVG 到文件

**功能特点**：
- 五行配色：木(翠绿)、火(朱红)、土(土黄)、金(金色)、水(湛蓝)
- 显示内容：标题(乾造/坤造)、四柱名、十神、天干、地支、藏干
- 布局：米黄色背景 + 标题栏 + 行标签

### bazi_utils.py - 合盘计算器 & 周易工具

#### BaziCompatibilityCalculator
双人合盘计算器，分析两人之间的"化学反应"。
- `analyze_compatibility(person_a, person_b)` - 计算两人八字兼容性

**检测项目**：
| 类型 | 说明 | 分数影响 |
|------|------|----------|
| 日干相合 | 甲己/乙庚/丙辛/丁壬/戊癸 | +30 |
| 日支六合 | 子丑/寅亥/卯戌等 | +20 |
| 日支相冲 | 子午/丑未/寅申等 | -10 |

**返回值**：`{"details": [分析报告列表], "base_score": 60+加分}`

#### build_couple_prompt(person_a, person_b, comp_data, relation_type="恋人/伴侣", focus_instruction="")
构建双人合盘的 LLM Prompt。
- `person_a` - 甲方数据 (四柱/格局/强弱/喜用神)
- `person_b` - 乙方数据
- `comp_data` - Python算出的合盘硬指标
- `relation_type` - 关系类型，影响角色指令 (Role Instruction)
- `focus_instruction` - 用户核心诉求，如有则重点回答

**Prompt 动态逻辑**：
1. **同性伴侣**：自动去性别化，禁用"丈夫/妻子"，侧重阴阳能量互补。
2. **事业合伙**：禁用情感术语，聚焦财富协作与职能分工（CEO/COO）。
3. **知己好友**：侧重性格共鸣、情感价值与灵魂契合度。
4. **尚未确定**：多角度评估，建议最适合的发展方向。

#### draw_hexagram_svg(binary_code) ⭐ NEW
绘制六爻卦象的 SVG 图。
- `binary_code` - 6位二进制字符串 (如 "111000"，从初爻到上爻)
- 返回 SVG 字符串

**图形说明**：
- 阳爻 (1)：一条完整横线
- 阴爻 (0)：中间断开的两条短线

#### build_oracle_prompt(user_question, hex_data, bazi_data) ⭐ NEW
构建【命卜合参】的 LLM Prompt，将八字与周易结合分析。

**核心思考协议**：
| 权重 | 依据 | 说明 |
|------|------|------|
| 决断权在卦 | 卦象 | 成败吉凶以卦象为准 |
| 策略权在命 | 八字 | 怎么做以八字格局为准 |

**输出结构**：
1. 🔮 **大师直断** - 一句话回答吉凶（50字内）
2. 📜 **卦象天机** - 解读本卦/变卦/动爻含义（200字内）
3. 💡 **命理锦囊** - 结合八字格局给出行动建议（200字内）
- **长度约束**：严格控制在 800 字以内，适配显示区域。

### logic.py - 安全函数

#### is_safe_input(user_text)
服务器端输入安全检查，防止 Prompt 注入攻击。
- 中英文双语敏感词库
- 检测到恶意输入返回 `False`
- 在 API 调用前拦截

### logic.py - 核心函数
- `calculate_bazi(year, month, day, hour, minute, longitude)` - 计算八字 + 格局 + 十神 + 身强身弱
- `calculate_true_solar_time(...)` - 真太阳时校正
- `build_user_context(bazi, gender, birthplace, current_time, birth_datetime, pattern_info)` - 构建用户上下文 (含调候 + 地支互动)
- `get_fortune_analysis(topic, user_context, ...)` - LLM 分析 (含安全检查 + 速率限制)
- `search_bazi_info(query, search_type)` - Tavily 搜索
- `get_optimal_temperature(model)` - 获取模型最佳温度

### china_cities.py
- `CHINA_CITIES` - 城市经度字典
- `SHICHEN_HOURS` - 时辰对应小时
- `get_shichen_mid_hour(shichen)` - 获取时辰中间值

## LLM System Instruction

系统指令核心要点：
1. **Data Protocol** - 信任后端计算的八字/格局，禁止重排
2. **Voice & Tone** - Gemini 3 Pro 风格：现代、睿智、温暖但不油腻，禁止老气表达
3. **Search Grounding** - 搜索用于行业趋势、流行色等"建议落地"，隐匿搜索痕迹
4. **Output Constraints** - Markdown 格式、禁止连续 3+ 个 bullet points
5. **Safety & Ethics** - 非宿命论、禁止预测死亡/医疗诊断/赌博
6. **Security Protocol** - 防 Prompt 注入，禁止泄露系统指令，拒绝回复"天机不可泄露"

## 安全机制 ⭐ NEW

### 双重防护
1. **服务器端拦截** (`is_safe_input`)
   - 中英文敏感词库检测
   - 恶意请求不发送给 LLM
   - 返回："天机不可泄露，请勿试探。"

2. **LLM 端安全结束符**
   - 在 user prompt 末尾添加安全指令
   - 提示 LLM 忽略任何注入命令
   - 返回："大师正在静心推演，请勿打扰。"

### API 速率限制
- 默认 API 每会话限制 **20 次**请求
- 用户自有 API Key **无限制**
- 达到限额时提示用户配置自己的 Key

## 侧边栏功能

| 按钮 | 功能 |
|------|------|
| 🔄 重新开始 | 清空当前会话，保留 localStorage |
| 🗑️ 清除保存记录 | 清空当前会话 + 清除 localStorage |

## 更新日志

### 2026-01-10 (Supabase 云端数据库迁移) ⭐ NEW
- ⭐ **全量迁移至 Supabase** - 解决 Profiles 数据丢失问题 (Ghost Writes)
  - 弃用 SQLite (`profiles.db`)，全面拥抱云原生 PostgreSQL
  - **严格写入验证**：`upsert` 后立即进行 `select` 回读校验，确保数据真实持久化
  - **RLS 策略支持**：适配 Supabase Row Level Security，防止未授权写入
- 📦 **技术栈更新**：
  - 新增依赖 `supabase>=2.3.0`
  - 重构 `db_utils.py`，移除所有 SQLite 代码
  - 环境变量新增 `SUPABASE_URL` 和 `SUPABASE_KEY`

### 2026-01-10 (智能年龄分层逻辑) ⭐ NEW
- ⭐ **Prompt 逻辑重构** - 基于用户年龄段动态调整分析侧重点
  - **儿童/少年 (0-15岁)**：[事业]重定向为"学业与天赋"，[感情]重定向为"亲子与家庭"
  - **青年/学生 (16-22岁)**：[事业]重定向为"学业与职业探索"，[感情]重定向为"恋爱与人际"
  - **成年人 (23-59岁)**：保持标准分析 (职场/婚恋)
  - **长者 (60+岁)**：[事业]重定向为"守成与声望"，[感情]重定向为"伴侣与晚景"
- 📦 **技术实现**：
  - `logic.py`: `build_user_context` 新增 `birth_year` 参数，计算年龄并注入特定指令
  - `app.py`: 调用 `build_user_context` 时传入 `birthday.year`
  - 自动屏蔽不适宜的话题 (如对儿童谈职场/恋爱，对长者谈职场拼搏)

### 2026-01-09 (侧边栏保存档案 & UI 优化) ⭐ NEW
- ⭐ **侧边栏保存档案功能** - 新增 `💾 保存档案` 区域
  - 位于「查找档案」下方，可直接输入档案 ID 保存当前分析
  - 自动保存完整会话状态 (bazi_result, responses, clicked_topics 等)
  - 与主界面「保存档案」按钮功能一致
- ⭐ **加载档案自动跳转** - 修复加载后停留在首页的问题
  - `restore_session_state()` 现设置 `bazi_calculated = True`
  - 加载有完整记录的档案后直接显示分析结果页
  - 无需再次点击「开始算命」
- 🎨 **AI 模型设置位置调整** - 移至「保存档案」「开始算命」按钮下方
  - 优化 UX 流程：主操作按钮优先，可选设置置于次要位置

### 2026-01-09 (用户档案会话持久化) ⭐ NEW
- ⭐ **完整会话持久化** - 加载档案即刻恢复分析结果
  - 新增 `db_utils.py` - SQLite 用户档案管理
  - 新增 `session_data TEXT` 列存储 JSON 序列化会话状态
  - 保存 15+ 关键会话变量 (bazi_result, responses, clicked_topics, bazi_svg, energy_data 等)
- ⭐ **自动保存触发** - LLM 响应完成后自动更新数据库
  - 主分析响应、合盘分析、周易起卦三处触发点
  - 基于 `loaded_profile_id` 检测是否需要保存
- ⭐ **即刻恢复** - 加载档案时自动还原完整 UI 状态
  - `restore_session_state()` 反序列化 JSON
  - 设置 `bazi_calculated = True` 直接显示结果页
  - 无需重新点击"开始算命"
- ⭐ **Supabase 配置** - 新增云数据库环境变量
  - `.env` 新增 `SUPABASE_URL` / `SUPABASE_KEY`
  - `.streamlit/secrets.toml` 用于 Streamlit Cloud
  - 所有敏感文件已 gitignore
- 📦 新增函数位置：
  - `serialize_session_state()` → `app.py`
  - `restore_session_state()` → `app.py`
  - `update_session_data()` → `db_utils.py`

### 2026-01-09 (保存档案 UI 优化)
- 🎨 **按钮顺序调整** - 保存档案按钮移至左侧，开始算命按钮在右侧
- 🐛 **对话框自动关闭** - 保存成功后 0.5s 延迟后自动调用 `st.rerun()` 关闭弹窗

### 2026-01-09 (每日一卦配额系统) ⭐ NEW
- ⭐ **档案绑定** - 每日一卦功能需先加载/建立档案才能使用
- ⭐ **每日1次限额** - 基于北京时间 (UTC+8) 每日重置
- ⭐ **数据库配额检查** - 新增 `check_daily_quota()` / `consume_daily_quota()` 函数
- 🎨 **UI 反馈优化** - 未加载档案显示禁用按钮+提示；已用显示"🍵 今日已用"
- 📦 新增 `last_divination_date TEXT` 列 + 自动迁移

### 2026-01-08 (五行能量饼图) ⭐ NEW
- ⭐ **五行能量计算器** - 新增 `BaziEnergyCalculator` 类
  - 天干贡献 100 点到对应五行
  - 地支藏干按权重分配 (本气 60-100, 中气 30, 余气 10)
  - `BRANCH_WEIGHT_MAP` 完整的 12 地支藏干权重表
  - `get_dominant_element()` / `get_weakest_element()` - 获取最强/最弱五行
- ⭐ **五行能量饼图 SVG** - 新增 `EnergyPieChartGenerator` 类
  - 使用 `svgwrite` 绘制弧线路径饼图
  - 五行配色图例 + 分数/百分比显示
  - 画布尺寸: viewBox="0 0 400 250"
- ⭐ **Streamlit 集成** - 排盘后显示五行能量分布
  - 居中标题: "📊 五行能量分布"
  - 饼图 SVG 使用 base64 编码渲染
  - ⬆️ 最强五行 / ⬇️ 最弱五行 指标卡片
  - LLM Prompt 注入五行分布数据
- 📦 新增函数位置：
  - `BaziEnergyCalculator` → `bazi_utils.py`
  - `EnergyPieChartGenerator` → `bazi_utils.py`
  - `generate_energy_pie_chart()` → `bazi_utils.py`
- 📱 **iOS 移动端同步** - 新增 `EnergyPieChartView.swift`
  - SwiftUI 饼图组件 + 图例
  - 最强/最弱五行指标
  - 集成到 `DashboardView.swift`

### 2026-01-08 (藏干显示修复) ⭐ NEW
- 🐛 **藏干 (Hidden Stems) 显示修复** - 解决藏干字符不可见问题
  - **根因**：`app.py` 中查询键名错误 (`"年支"` → `"年支藏干"`)
  - 修复 `get_hidden_with_gods()` 函数的四个查询键
  - 现在所有四柱的藏干及其十神正确显示在虚线下方
- 🎨 **SVG 标题颜色优化**
  - 排盘标题填充色改为纯白 (`#FFFFFF`)，对比度更强
- 📐 **画布高度自适应**
  - 高度从 380→550→420px，确保藏干区域完整显示
  - Y 坐标重新计算：`hidden_row_y = branch_bottom_y + 80`

### 2026-01-08 (排盘视觉优化)
- 🎨 **十神标签优化** - 提升视觉层次感
  - 徽章宽度增加 (36→42px)，增加内边距呼吸空间
  - 字体大小微调 (12→11px)，文字更不拥挤
  - **动态边框颜色**：边框颜色自动匹配天干的五行颜色 (木绿/火红/土黄/金金/水蓝)
  - 边框加粗 (1→1.5px) 使颜色更明显
- 📐 **分隔线与藏干间距优化**
  - 虚线分隔线下移 15px (Y: 268→283)，与地支方块保持更大间距
  - 藏干区域同步下移 15px (Y: 305→320)，保持整体比例
- 📱 **iOS App 同步更新** (`PillarView.swift`)
  - 十神标签改为填充背景 + 动态边框 (使用 `FiveElementColor.stemColor`)
  - 水平内边距增加 (6→10px)，与后端保持一致

### 2026-01-08 (FastAPI + iOS 移动端) ⭐ NEW
- ⭐ **FastAPI 后端 API** - 新增 `main.py` RESTful 后端
  - `POST /api/chart` - 返回结构化八字数据 (四柱/格局/身强身弱/喜用神)
  - `POST /api/analysis` - 调用 Gemini API 进行命理分析
  - `POST /api/compatibility` - 双人合盘分数与详情
  - Pydantic 数据验证 + CORS 跨域支持
  - 📦 新增依赖: `fastapi>=0.109.0`, `uvicorn>=0.27.0`
- ⭐ **iOS SwiftUI 移动端** - 新增 `/ios/FortuneTeller/` 目录
  - **数据模型** (`Models.swift`)：`UserInput`, `Pillar`, `BaziChartResponse`, `AnalysisResponse`
  - **网络层** (`NetworkManager.swift`)：单例模式 + async/await
  - **MVVM 架构**：`HomeViewModel` + `HomeView`
  - **五行配色** (`FiveElementColor.swift`)：木绿/火红/土黄/金金/水蓝
  - **八字柱组件** (`PillarView.swift`)：十神标签 + 天干圆形 + 地支方形
  - **四柱网格** (`ChartGridView.swift`)：四柱横排 + 格局徽章 + 摘要行
  - **仪表盘** (`DashboardView.swift`)：运势指数 + 进度条 + 功能网格 + FAB
  - **AI 对话** (`ChatView.swift`)：消息气泡 + 输入框 + 打字动画

### 2026-01-08 (周易起卦功能)
- ⭐ **周易起卦计算器** - 新增 `ZhouyiCalculator` 类
  - 金钱课起卦法 (3枚硬币摇6次)
  - 完整 64 卦二进制映射表 (按八宫分类)
  - 支持本卦/变卦/动爻计算
  - 上下卦 (内外卦) 信息解析
- ⭐ **卦象 SVG 可视化** - 新增 `draw_hexagram_svg()` 函数
  - 阳爻 (一条长线) / 阴爻 (两条短线)
  - 从初爻到上爻 (从下往上) 绘制
- ⭐ **命卜合参 Prompt** - 新增 `build_oracle_prompt()` 函数
  - 八字 + 周易结合分析
  - 决断权在卦 (吉凶成败)、策略权在命 (应对方式)
  - 结构化输出：大师直断 → 卦象天机 → 命理锦囊
- ⭐ **可搜索城市下拉框** - 新增 `searchable_city_select()` 函数
  - 🔍 文本搜索框 + 动态过滤 342 个城市
  - 📱 移动端触摸友好 (min-height: 44px)
  - 💄 金色主题 CSS 样式
  - 📐 选择后自动显示城市经度
- 📦 新增类/函数位置：
  - `ZhouyiCalculator` → `logic.py`
  - `draw_hexagram_svg` → `bazi_utils.py`
  - `build_oracle_prompt` → `bazi_utils.py`
  - `searchable_city_select` → `app.py`
- ⭐ **起卦交互优化**：
  - **默念提醒**：在投掷铜钱前新增“心诚则灵”提醒框，引导用户默念问题三遍。
  - **手机端摇一摇修复**：支持 iOS 13+ 加速度计权限请求 (`DeviceMotionEvent.requestPermission`)，解决移动端无法触发起卦的问题。
  - **交互稳定性**：优化按钮选择器逻辑，防止脚本重复初始化，提高移动端响应成功率。

### 2026-01-07 (深度合盘更新)
- ⭐ **关系类型定制化** - 合盘模式支持多种关系场景
  - 新增“二位是什么关系？”下拉框选择
  - **定制化 Prompt 逻辑**：
    - **同性伴侣**：自动检测性别组合，启用“去性别化”指令，严禁异性恋术语。
    - **事业合伙**：剥离婚恋色彩，聚焦合财、协作默契与 CEO/COO 匹配。
    - **知己好友**：聚焦情绪价值与性格投缘。
    - **关系探索**：为尚未确定的关系提供多角度评估及建议。
- ⭐ **合盘数据流重构** - 确保关系上下文在多轮对话中持续生效
- 🎨 **UI 增强** - 优化合盘模式下的表单布局

### 2026-01-07 (下午更新)
- ⭐ **UI 文字清晰度优化** - 提升标题和标签可读性
  - 标题颜色调整为 #FFDD44 (更亮的金色)
  - 增强文字阴影效果 (双层阴影)
  - 标签颜色改为 #FFF5CC (奶油白)
  - 增加字重和字间距
- ⭐ **PDF 报告下载功能** - 一键保存分析结果
  - 新增 `pdf_generator.py` - ReportLab PDF 生成器
  - 使用 STSong-Light CID 字体 (无需外部字体文件)
  - 包含基本信息、八字排盘、所有分析记录
  - 下载按钮位于分析记录下方
- 📦 新增依赖: `reportlab>=4.0.0`
- ⭐ **合盘分析功能重构** - 新的专题按钮布局
  - 修复 `partner_birth_hour` 未定义 bug
  - 新增 `bazi_utils.py` - 合盘计算器 + Prompt 构建器
  - 2x2 按钮布局: 缘分契合度/婚姻前景/避雷指南/对方旺我吗
  - `build_couple_prompt` 支持 `focus_instruction` 参数
  - 每个按钮对应不同的分析重点

### 2026-01-07 (早间更新)
- ⭐ **移动端 UI 优化** - 全面适配手机屏幕
  - 响应式 CSS 媒体查询 (768px/375px 断点)
  - 按钮布局自适应 (2x2 网格)
  - SVG 排盘 viewBox 自适应缩放
  - 触摸友好的按钮尺寸 (min-height: 48px)
  - Radio 按钮和 Expander 文字改为白色，提高对比度
  - 标题缩短为「命理大师」适配小屏幕
- ⭐ **农历日期输入** - 支持阳历/农历切换，使用单选按钮
  - 农历年月日下拉框选择
  - 自动检测闰月并显示闰月选项
  - 中文农历日期显示 (初一、十五、廿三等)
  - 自动转换为阳历用于八字计算
- ⭐ **LLM 模型更新** - 切换至最新模型
  - 默认模型: `gemini-3-flash-preview`
  - OpenAI: 新增 `gpt-4.5-preview`, `o1`, `o1-mini`
  - Claude: 新增 `claude-3-5-haiku`, `claude-3-opus`
  - Moonshot: 默认使用 `moonshot-v1-128k`
- ⭐ **SVG 排盘视觉升级** - 高级精致版设计
  - 深棕色标题栏 + 米白色字体
  - 徽章样式十神标签（圆角背景框）
  - 藏干水平排列 + 十神小字在下方
  - 虚线分隔 + 居中标题（移除左侧标签）
- ⭐ **部署配置完成** - Streamlit Cloud 一键部署
  - 新增 `requirements.txt` - 依赖清单
  - 新增 `README.md` - 项目说明 + 部署指南
  - 新增 `.env.example` - 环境变量模板
- 🐛 修复 SVG 居中显示
- 🐛 修复 svgwrite 高度参数错误
- 🐛 修复手机端 SVG 图表溢出屏幕问题 (使用 width:100% + max-width 响应式约束)
- 🐛 修复手机端重复点击按钮无法自动跳转到对应内容的问题 (添加时间戳强制执行滚动)
- ✅ 代码同步至 GitHub (commit b0d7903)
- ✅ Streamlit Cloud 自动部署

### 2026-01-06 (晚间更新)
- ⭐ 新增 `TiaoHouCalculator` - 调候用神计算器 (冬暖夏凉)
- ⭐ 新增 `BaziChartGenerator` - SVG 可视化排盘 (五行配色+十神+藏干)
- ⭐ 新增 `is_safe_input()` - 服务器端 Prompt 注入防护
- ⭐ 新增安全结束符 - LLM 端防护层
- ⭐ 新增 API 速率限制 - 默认 API 每会话 20 次
- API Key 移至 `.env` - 不再硬编码
- 新增 `svgwrite` 依赖 - SVG 图表生成
- 集成调候分析到 user prompt - 冬夏季自动给出调候建议
- SVG 图表集成到前端 - 排盘结果可视化展示


### 2026-01-06 (傍晚更新)
- 新增 `clean_markdown_for_display()` - 将 Markdown 格式转换为 HTML 样式显示
- 修复年份占位符 - "202X" 改为 "今年"，动态适应当前年份
- 新增 Security Protocol - 防 Prompt 注入攻击，保护系统指令不被泄露
- 导入 `re` 模块 - 用于正则表达式处理 Markdown 格式

### 2026-01-06 (下午更新)
- 新增 `BaziInteractionCalculator` - 地支互动计算器 (藏干/三会/三合/六合/六冲)
- 集成地支互动到 `build_user_context` - 藏干详解 + 地支化学反应检测
- 更新 Voice & Tone - Gemini 3 Pro 风格，禁止"老先生"等老气表达
- 移除内部标签 - 去掉"【Search 落地】"、"冷读术"等不应出现在输出的标签
- 隐匿搜索痕迹 - 禁止"我为你搜索了..."等机械化表述
- 修正术语 - "神煎"统一改为"神煞"

### 2026-01-06 (上午更新)
- 新增 `BaziAuxiliaryCalculator` - 十二长生/空亡/神煞/刑冲合害计算
- 新增 `BaziStrengthCalculator` - 身强身弱计算 (加权打分法 + 喜用神推导)
- 新增 `BaziPatternCalculator` - 基础八格计算
- 新增 `BaziPatternAdvanced` - 特殊格局计算 (飞天禄马/魁罡/化气格等)
- 新增格局自动集成 - Python 计算格局后传给 LLM，禁止重排
- 新增五行能量分析 - 身强身弱+喜用神传给 LLM，避免重复计算
- 新增神煞能量细节 - 十二长生/空亡/神煞/刑冲合害传给 LLM
- 重构 System Instruction - 资深命理大师人设 + 数据协议 + 搜索策略
- 重构所有分析提示词 - 结构化输出、意象化表达、搜索落地
- 「转运建议」→「开运建议」
- 「我还想问」→「大师解惑」
- 对话历史改为完整问答记录 (非摘要)

### 2026-01-05 (晚间更新)
- 新增出生日期时间传递
- 新增模型最佳温度配置
- 新增对话连续性

### 2026-01-05
- 修复时间选择 bug
- 优化引导语逻辑
- 添加按钮锁定机制
- 新增 localStorage 持久化
