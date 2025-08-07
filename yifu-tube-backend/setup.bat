@echo off
chcp 65001 >nul
echo.
echo ==========================================
echo 🎬 易弗YouTube视频下载器后端服务安装脚本
echo ==========================================
echo.

echo 📋 检查Node.js环境...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: Node.js未安装
    echo 💡 请先安装Node.js: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js已安装: 
node --version

echo.
echo 📦 安装npm依赖包...
call npm install
if %errorlevel% neq 0 (
    echo ❌ 错误: npm依赖安装失败
    pause
    exit /b 1
)

echo ✅ npm依赖安装完成

echo.
echo 🔍 检查yt-dlp...
yt-dlp --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  警告: yt-dlp未在系统PATH中找到
    echo 💡 请确保yt-dlp.exe在当前目录或系统PATH中
    echo.
    if exist yt-dlp.exe (
        echo ✅ 找到本地yt-dlp.exe文件
    ) else (
        echo ❌ 未找到yt-dlp.exe文件
        echo 📥 请下载yt-dlp.exe到当前目录
        echo 🔗 下载地址: https://github.com/yt-dlp/yt-dlp/releases
    )
) else (
    echo ✅ yt-dlp已安装: 
    yt-dlp --version
)

echo.
echo 📁 创建必要目录...
if not exist "downloads" mkdir downloads
if not exist "public" mkdir public
echo ✅ 目录创建完成

echo.
echo ==========================================
echo 🎉 安装完成！
echo ==========================================
echo.
echo 🚀 启动服务器命令:
echo    npm start
echo.
echo 🔧 开发模式启动:
echo    npm run dev
echo.
echo 📱 服务器访问地址:
echo    http://localhost:3000
echo.
echo 🧪 API测试地址:
echo    http://localhost:3000/api/test
echo.
echo ==========================================

pause