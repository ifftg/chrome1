@echo off
echo ========================================
echo 易弗YouTube视频下载器 - 安装包创建工具
echo ========================================
echo.

:: 检查是否存在插件文件夹
if not exist "yifu-youtube-downloader" (
    echo 错误：找不到插件文件夹 "yifu-youtube-downloader"
    echo 请确保此脚本位于项目根目录
    pause
    exit /b 1
)

:: 创建输出目录
if not exist "dist" mkdir dist

:: 检查是否有7zip或WinRAR
set ZIPPER=
where 7z >nul 2>&1
if %errorlevel% == 0 (
    set ZIPPER=7z
    echo 找到 7-Zip，使用 7-Zip 创建压缩包...
) else (
    where winrar >nul 2>&1
    if %errorlevel% == 0 (
        set ZIPPER=winrar
        echo 找到 WinRAR，使用 WinRAR 创建压缩包...
    ) else (
        echo 警告：未找到 7-Zip 或 WinRAR
        echo 请手动压缩 yifu-youtube-downloader 文件夹
        pause
        exit /b 1
    )
)

:: 创建压缩包
echo.
echo 正在创建插件安装包...

if "%ZIPPER%"=="7z" (
    7z a -tzip "dist\yifu-youtube-downloader.zip" "yifu-youtube-downloader\*" -x!*.md
) else if "%ZIPPER%"=="winrar" (
    winrar a -afzip "dist\yifu-youtube-downloader.zip" "yifu-youtube-downloader\*" -x*.md
)

if %errorlevel% == 0 (
    echo.
    echo ✅ 成功创建安装包：dist\yifu-youtube-downloader.zip
    echo.
    echo 安装包包含以下文件：
    echo - manifest.json     (插件配置文件)
    echo - popup.html        (插件界面)
    echo - popup.css         (界面样式)
    echo - popup.js          (交互逻辑)
    echo - background.js     (后台服务)
    echo - icons\            (图标文件夹)
    echo.
    echo 📋 安装步骤：
    echo 1. 解压 yifu-youtube-downloader.zip
    echo 2. 打开 Chrome 浏览器
    echo 3. 访问 chrome://extensions/
    echo 4. 开启"开发者模式"
    echo 5. 点击"加载已解压的扩展程序"
    echo 6. 选择解压后的文件夹
    echo.
    echo ⚠️  重要提醒：
    echo - 图标文件需要转换为PNG格式（参考icons文件夹的README.md）
    echo - 本插件仅供学习使用，请遵守相关法律法规
    echo.
) else (
    echo ❌ 创建安装包失败，请检查权限或手动压缩文件夹
)

:: 创建网站部署包
echo 正在创建网站部署包...

if "%ZIPPER%"=="7z" (
    7z a -tzip "dist\yifu-website.zip" "yifu-website\*"
) else if "%ZIPPER%"=="winrar" (
    winrar a -afzip "dist\yifu-website.zip" "yifu-website\*"
)

if %errorlevel% == 0 (
    echo ✅ 成功创建网站部署包：dist\yifu-website.zip
    echo.
    echo 网站部署包包含：
    echo - index.html         (主页面)
    echo - css\style.css      (样式文件)
    echo - js\main.js         (交互脚本)
    echo - images\            (图片资源文件夹)
    echo.
    echo 🌐 部署步骤：
    echo 1. 解压 yifu-website.zip 到 Web 服务器
    echo 2. 添加实际的 Logo 图片到 images 文件夹
    echo 3. 配置域名和 SSL 证书
    echo 4. 更新下载链接指向实际的插件文件
    echo.
) else (
    echo ❌ 创建网站部署包失败
)

echo ========================================
echo 打包完成！输出文件位于 dist 文件夹中
echo ========================================
pause