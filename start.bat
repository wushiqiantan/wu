@echo off
chcp 65001 >nul
cls
echo ===========================================
echo  AI景观设计工作流平台 - 后端服务器启动
echo ===========================================
echo.

:: 检查 Node.js 是否安装
node -v >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo [✓] Node.js 已安装
node -v

:: 检查后端目录
cd /d "%~dp0\backend"
if not exist "package.json" (
    echo [错误] 未找到后端目录，请确保在正确位置运行
    pause
    exit /b 1
)

:: 检查 node_modules
if not exist "node_modules" (
    echo.
    echo [首次启动] 正在安装依赖...
    call npm install
    if errorlevel 1 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
) else (
    echo [✓] 依赖已安装
)

:: 检查 .env 文件
if not exist ".env" (
    echo.
    echo [警告] 未找到 .env 文件，正在从模板创建...
    copy .env.example .env >nul
    echo [请编辑 .env 文件填入你的 API Key，然后重新运行]
    pause
    exit /b 1
)

echo.
echo ===========================================
echo  正在启动后端服务器...
echo  默认地址: http://localhost:3000
echo ===========================================
echo.

node server.js
