#!/bin/bash
# =====================================================
# 命理大师 - 一键启动脚本
# =====================================================
# 同时启动 FastAPI 后端和 Next.js 前端
# =====================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}        命理大师 - 开发环境启动${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 检查 Python 虚拟环境
if [ ! -d ".venv" ]; then
    echo -e "${YELLOW}⚠ 未找到虚拟环境，正在创建...${NC}"
    python3 -m venv .venv
fi

# 启动后端
echo -e "${GREEN}▶ 启动 FastAPI 后端 (端口 8000)...${NC}"
source .venv/bin/activate
pip install -q -r requirements.txt 2>/dev/null

# 后台启动后端
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# 等待后端启动
sleep 2

# 启动前端
echo -e "${GREEN}▶ 启动 Next.js 前端 (端口 3001, 仅本机)...${NC}"
cd web
npm run dev -- --hostname 127.0.0.1 --port 3001 &
FRONTEND_PID=$!

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ 服务已启动${NC}"
echo -e "  后端: ${YELLOW}http://localhost:8000${NC}"
echo -e "  前端: ${YELLOW}http://127.0.0.1:3001${NC}"
echo -e "  API 文档: ${YELLOW}http://localhost:8000/docs${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "按 ${YELLOW}Ctrl+C${NC} 停止所有服务"
echo ""

# 捕获终止信号，同时停止两个服务
trap "echo ''; echo '正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# 等待进程
wait
