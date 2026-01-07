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
fortune_teller_agent/
├── app.py           # Streamlit 主应用
├── logic.py         # 八字计算 & LLM 调用 & 格局/调候/图表计算器
├── china_cities.py  # 350+ 中国城市经度数据
├── .env             # 环境变量 (API Key)
└── pyproject.toml   # 项目配置
```

## 核心功能

### 输入项
| 项目 | 说明 |
|------|------|
| 性别 | 男/女 下拉框 |
| 出生日期 | 日期选择器 |
| 出生时间 | 精确时间 (时:分) 或 时辰 (子时-亥时)，使用单选按钮切换 |
| 出生地点 | 350+ 中国城市，用于真太阳时计算 |
| AI 模型 | 可选，默认 Gemini API |

### 分析按钮 (7个)
| 按钮 | 功能 |
|------|------|
| **整体命格** | 《人生剧本与灵魂底色报告》- 格局定名、人生角色、大运总评 |
| **事业运势** | 《深度事业发展规划》- 职场竞争力、黄金赛道、创业指数 |
| **感情运势** | 《专属情感命运报告》- 恋爱DNA、伴侣画像、桃花时间轴 |
| **喜用忌用** | 《五行能量管理与开运指南》- 能量维他命、能量过敏原、开运方案 |
| **健康建议** | 《身心能量调理指南》- 五色食疗、运动处方、流年健康备忘 |
| **开运建议** | 《全场景转运与能量提升方案》- 晶石饰品、工位风水、居家能量 |
| **深聊一下** | 自定义问题，支持共情式回答 |

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

## 运行方式

```bash
cd fortune_teller_agent
uv run streamlit run app.py
```

访问 http://localhost:8501

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

#### TiaoHouCalculator ⭐ NEW
调候用神计算器，根据月令季节计算调候需求。
- `get_tiao_hou(day_master, month_branch)` - 计算调候用神

**调候规则**：
| 季节 | 月令 | 总原则 | 急需五行 |
|------|------|--------|----------|
| 冬季 | 亥/子/丑 | 寒需暖 | 以火为主 |
| 夏季 | 巳/午/未 | 热需寒 | 以水为主 |
| 春秋 | 其他 | 气候平和 | 按强弱分析 |

**返回值**：`{"status": "...", "needs": "...", "advice": "...", "is_urgent": True/False}`

#### BaziChartGenerator ⭐ NEW
八字排盘 SVG 图表生成器，生成专业美观的可视化排盘。
- `get_color(char)` - 根据干支获取五行颜色
- `generate_chart(bazi_data, filename)` - 生成 SVG 字符串
- `save_chart(bazi_data, filepath)` - 保存 SVG 到文件

**功能特点**：
- 五行配色：木(翠绿)、火(朱红)、土(土黄)、金(金色)、水(湛蓝)
- 显示内容：标题(乾造/坤造)、四柱名、十神、天干、地支、藏干
- 布局：米黄色背景 + 标题栏 + 行标签

### logic.py - 安全函数 ⭐ NEW

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

### 2026-01-07
- ⭐ **SVG 排盘视觉升级** - 高级精致版设计
  - 深棕色标题栏 + 米白色字体
  - 徽章样式十神标签（圆角背景框）
  - 藏干水平排列 + 十神小字在下方
  - 虚线分隔 + 居中标题（移除左侧标签）
  - 更大字体：天干/地支 36px，藏干 18px
  - 阴影效果增加立体感
- ⭐ **修复 SVG 居中显示** - 使用单一 markdown 调用包裹 flexbox
- ⭐ **部署配置完成** - Streamlit Cloud 一键部署
  - 新增 `requirements.txt` - 依赖清单
  - 新增 `README.md` - 项目说明 + 部署指南
  - 新增 `.env.example` - 环境变量模板
  - 更新 `.gitignore` - 保护 API Key 安全
- ✅ 代码已推送至 GitHub: `daisyluvr42/fortune-teller`
- ✅ 可通过 Streamlit Cloud 部署分享

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
- 「我还想问」→「深聊一下」
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
