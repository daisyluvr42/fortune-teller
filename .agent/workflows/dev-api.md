---
description: 仅启动 FastAPI 后端
---

# 启动后端

// turbo
1. 激活虚拟环境并启动 FastAPI：
```bash
cd /Users/daisyluvr/Documents/fortune-teller && source .venv/bin/activate && uvicorn main:app --reload --port 8000
```

访问:
- API: http://localhost:8000
- 文档: http://localhost:8000/docs
