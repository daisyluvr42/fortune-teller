# 命理大师 - Fortune Teller

现代简约中式风格的八字排盘应用，支持真太阳时校正、格局分析、十神推演。

## 🏢 公司与作者

- 公司：Monad-lab Works LLC（美国特拉华州注册）
- 创始人 / 作者：Xiangyu
- 联系方式：founder@monad-lab.com
- 标语：封装复杂性。

## 🏗️ 项目结构

```
fortune-teller/
├── main.py              # FastAPI 后端 (Python)
├── logic.py             # 八字计算核心逻辑
├── bazi_utils.py        # 辅助工具 (合盘、五行能量)
├── web/                 # Next.js 前端
│   ├── app/             # App Router 页面
│   ├── components/      # React 组件
│   └── lib/             # API 封装
└── ios/                 # iOS 原生客户端 (可选)
```

## 🚀 本地开发

### 前置要求
- Python 3.11+
- Node.js 18+
- npm 或 pnpm

### 1. 启动后端 (FastAPI)

```bash
# 进入项目根目录
cd fortune-teller

# 创建虚拟环境 (首次)
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 启动后端
uvicorn main:app --reload --port 8000
```

后端将在 `http://localhost:8000` 运行，API 文档: `http://localhost:8000/docs`

### 2. 启动前端 (Next.js)

```bash
# 进入前端目录
cd web

# 安装依赖 (首次)
npm install

# 启动开发服务器
npm run dev
```

前端将在 `http://127.0.0.1:3001` 运行

### 3. 一键启动脚本 (可选)

```bash
./start.sh
```

## 🌐 部署方案

### 推荐: Vercel (前端) + Railway (后端)

这是最快且成本最低的一键部署方案。

#### 1. 部署后端到 Railway

1. 访问 [railway.app](https://railway.app)，登录 GitHub
2. 点击 "New Project" → "Deploy from GitHub"
3. 选择 `fortune-teller` 仓库
4. 设置环境变量:
   - `GEMINI_API_KEY`: 你的 Gemini API Key
5. Railway 会自动检测 `requirements.txt` 并部署

获得后端 URL: `https://your-app.railway.app`

#### 2. 部署前端到 Vercel

1. 访问 [vercel.com](https://vercel.com)，登录 GitHub
2. 点击 "Import" → 选择 `fortune-teller` 仓库
3. **Root Directory** 设置为 `web`
4. 添加环境变量:
   - `NEXT_PUBLIC_API_URL`: `https://your-app.railway.app`
5. 点击 Deploy

### 备选: Docker 自托管

使用 `docker-compose.yml` 一键部署前后端：

```bash
docker-compose up -d
```

## 📁 环境变量

### 后端 (.env)
```
GEMINI_API_KEY=your_gemini_api_key_here
TAVILY_API_KEY=optional_for_search
```

### 前端 (web/.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🔧 API 接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/` | 健康检查 |
| POST | `/api/chart` | 八字排盘 |
| POST | `/api/analysis` | AI 命理分析 |
| POST | `/api/compatibility` | 合盘分析 |

## 📱 移动端

- **响应式 Web**: Next.js 前端已完美适配移动端
- **iOS 原生**: 查看 `ios/` 目录

## 📄 License

MIT License
