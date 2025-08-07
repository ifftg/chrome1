@echo off
echo =============================================
echo    易弗YouTube下载器 - 后端服务启动器
echo =============================================
echo.

cd /d "%~dp0"
echo 📂 当前目录: %CD%
echo.

echo 🔍 检查必要文件...
if not exist "server.js" (
    echo ❌ 错误: 找不到 server.js 文件
    pause
    exit /b 1
)

if not exist "package.json" (
    echo ❌ 错误: 找不到 package.json 文件
    pause
    exit /b 1
)

if not exist "yt-dlp.exe" (
    echo ❌ 错误: 找不到 yt-dlp.exe 文件
    echo 💡 请从 https://github.com/yt-dlp/yt-dlp/releases 下载最新版本
    pause
    exit /b 1
)

echo ✅ 所有文件检查完成
echo.

echo 🚀 正在启动后端服务...
echo 📝 提示: 请保持此窗口开启，关闭窗口将停止服务
echo ⚠️  使用 Ctrl+C 可以停止服务
echo.

npm start

echo.
echo 🛑 后端服务已停止
pause