# 网站图片资源说明

本文件夹用于存放宣传网站所需的图片资源。

## 需要的图片文件

### 1. Logo图标 (logo.png)
- 尺寸：200x200像素
- 格式：PNG（支持透明背景）
- 用途：网站导航栏和页脚的Logo显示
- 建议：使用与插件图标相似的设计风格

### 2. 网站图标 (favicon.ico)
- 尺寸：32x32像素
- 格式：ICO或PNG
- 用途：浏览器标签页图标
- 建议：与Logo保持一致的设计

### 3. 社交媒体图片 (可选)
- og-image.png (1200x630像素) - 用于社交媒体分享
- twitter-card.png (1200x675像素) - 用于Twitter卡片

## 临时解决方案

由于目前没有实际的图片文件，网站会：

1. **Logo显示**：使用CSS创建的文字Logo
2. **图标显示**：使用emoji或CSS图形
3. **背景效果**：使用CSS渐变和图案

## 创建Logo建议

### 设计元素
- 主色调：红色 (#ff4757) 与蓝色渐变 (#667eea → #764ba2)
- 图标元素：下载箭头、播放按钮、YouTube相关元素
- 字体：现代无衬线字体，如 Segoe UI 或 Roboto

### 在线Logo制作工具
1. **Canva** - https://www.canva.com/
2. **LogoMaker** - https://www.logomaker.com/
3. **Hatchful** - https://hatchful.shopify.com/
4. **FreeLogoDesign** - https://www.freelogodesign.org/

### DIY创建步骤
1. 打开图像编辑软件（如GIMP、Photoshop或在线工具）
2. 创建200x200像素的画布
3. 添加圆形背景（使用红色渐变）
4. 添加白色下载箭头图标
5. 可选：添加小的播放三角形暗示视频功能
6. 保存为PNG格式，保持透明背景

## 使用插件SVG图标

您也可以将插件的SVG图标转换为网站Logo：

```bash
# 如果安装了ImageMagick
convert ../yifu-youtube-downloader/icons/icon.svg -resize 200x200 logo.png
convert ../yifu-youtube-downloader/icons/icon.svg -resize 32x32 favicon.ico
```

## 当前状态

- ✅ 网站已配置为在没有图片时正常显示
- ✅ 使用CSS创建的视觉效果替代图片
- ⏳ 等待实际图片文件上传到此文件夹

## 上传图片后的步骤

1. 将logo.png上传到此文件夹
2. 将favicon.ico上传到此文件夹
3. 更新index.html中的图片路径（如果需要）
4. 测试网站显示效果
5. 优化图片大小以提高加载速度

---

**注意**：所有图片应符合相关版权要求，建议使用原创或免费商用素材。