---
description: 一键启动前后端开发服务器
---

# 启动命理大师开发环境

此工作流将同时启动 FastAPI 后端和 Next.js 前端。

## 步骤

// turbo
1. 运行一键启动脚本：
```bash
cd /Users/daisyluvr/Documents/fortune-teller && ./start.sh
```

## 手动启动（分开）

如果需要分开启动：

### 启动后端
```bash
cd /Users/daisyluvr/Documents/fortune-teller
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

### 启动前端
```bash
cd /Users/daisyluvr/Documents/fortune-teller/web
npm run dev
```

## 访问地址

- 前端: http://localhost:3000
- 后端: http://localhost:8000
- API 文档: http://localhost:8000/docs
