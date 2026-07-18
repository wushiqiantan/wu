#!/bin/bash

# AI景观设计工作流平台 - 后端服务器启动脚本
# macOS / Linux 适用

set -e

echo "==========================================="
echo " AI景观设计工作流平台 - 后端服务器启动"
echo "==========================================="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "[错误] 未检测到 Node.js，请先安装"
    echo "下载地址: https://nodejs.org/"
    exit 1
fi

echo "[✓] Node.js 已安装: $(node -v)"

# 进入后端目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/backend"

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo ""
    echo "[首次启动] 正在安装依赖..."
    npm install
else
    echo "[✓] 依赖已安装"
fi

# 检查 .env
if [ ! -f ".env" ]; then
    echo ""
    echo "[警告] 未找到 .env 文件，正在从模板创建..."
    cp .env.example .env
    echo "[请编辑 .env 文件填入你的 API Key，然后重新运行]"
    exit 1
fi

echo ""
echo "==========================================="
echo " 正在启动后端服务器..."
echo " 默认地址: http://localhost:3000"
echo "==========================================="
echo ""

node server.js
