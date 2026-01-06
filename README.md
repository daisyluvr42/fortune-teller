# 🔮 八字算命大师 (Fortune Teller)

基于 Streamlit 的八字算命应用，使用 LLM 进行命理解读。

## 功能特点

- ✅ Python 精确排盘（真太阳时校正）
- ✅ SVG 可视化排盘（五行配色）
- ✅ 多 AI 模型支持（Gemini/DeepSeek/OpenAI 等）
- ✅ 7 种专业分析模块
- ✅ 流式响应 + 会话连续性

## 本地运行

```bash
# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 添加你的 GEMINI_API_KEY

# 启动应用
streamlit run app.py
```

## 部署到 Streamlit Cloud

1. Fork 此仓库到你的 GitHub
2. 访问 [share.streamlit.io](https://share.streamlit.io)
3. 选择仓库和 `app.py` 作为入口
4. 在 Secrets 中添加: `GEMINI_API_KEY = "your_key_here"`

## 环境变量

| 变量名 | 必需 | 说明 |
|--------|------|------|
| GEMINI_API_KEY | ✅ | Google Gemini API Key |
| DEEPSEEK_API_KEY | ❌ | DeepSeek API Key (可选) |
| TAVILY_API_KEY | ❌ | Tavily 搜索 API (可选) |
