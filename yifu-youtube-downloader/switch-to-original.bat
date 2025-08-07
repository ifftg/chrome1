@echo off
chcp 65001 >nul
echo.
echo ==========================================
echo 🔙 切换回原始版本
echo ==========================================
echo.

echo 📋 正在恢复原始文件...

:: 检查备份是否存在
if not exist popup.html.backup (
    echo ❌ 错误: 未找到备份文件
    echo 💡 请确保之前已运行过 switch-to-backend.bat
    pause
    exit /b 1
)

:: 恢复原始文件
echo 🔄 恢复原始版本...
copy popup.html.backup popup.html >nul
copy popup.js.backup popup.js >nul
copy background.js.backup background.js >nul

echo.
echo ✅ 恢复完成！
echo.
echo ==========================================
echo 📋 后续步骤：
echo ==========================================
echo.
echo 1. 🔄 重新加载Chrome插件：
echo    - 打开 chrome://extensions/
echo    - 点击插件的"重新加载"按钮
echo.
echo 2. 🎯 现在使用原始的前端解析版本
echo.
echo ==========================================

pause