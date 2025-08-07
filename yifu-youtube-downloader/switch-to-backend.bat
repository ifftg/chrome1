@echo off
chcp 65001 >nul
echo.
echo ==========================================
echo 🚀 切换到后端API版本
echo ==========================================
echo.

echo 📋 正在切换文件...

:: 备份原始文件
if exist popup.html.backup (
    echo ⚠️  发现已有备份文件
) else (
    echo 📁 备份原始文件...
    copy popup.html popup.html.backup >nul
    copy popup.js popup.js.backup >nul
    copy background.js background.js.backup >nul
    echo ✅ 原始文件已备份
)

:: 切换到后端版本
echo 🔄 切换到后端API版本...
copy popup-backend.html popup.html >nul
copy popup-backend.js popup.js >nul
copy background-backend.js background.js >nul

echo.
echo ✅ 切换完成！
echo.
echo ==========================================
echo 📋 后续步骤：
echo ==========================================
echo.
echo 1. 🚀 启动后端服务器：
echo    cd yifu-tube-backend
echo    npm start
echo.
echo 2. 🔄 重新加载Chrome插件：
echo    - 打开 chrome://extensions/
echo    - 点击插件的"重新加载"按钮
echo.
echo 3. 🎯 测试插件功能：
echo    - 确保后端服务在 http://localhost:3000 运行
echo    - 使用插件解析和下载YouTube视频
echo.
echo ==========================================

pause