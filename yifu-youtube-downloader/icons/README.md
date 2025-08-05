# 图标文件说明

此文件夹包含Chrome插件所需的图标文件。

## 文件列表：
- icon.svg - 主图标SVG源文件 (128x128)
- icon16.svg - 16x16尺寸SVG文件
- icon48.svg - 48x48尺寸SVG文件

## 转换为PNG格式：

由于Chrome插件需要PNG格式的图标，您需要将SVG文件转换为PNG格式。

### 方法1：使用在线转换工具
1. 访问 https://convertio.co/svg-png/ 或类似的在线转换网站
2. 上传SVG文件
3. 设置输出尺寸：
   - icon16.svg → icon16.png (16x16)
   - icon48.svg → icon48.png (48x48)  
   - icon.svg → icon128.png (128x128)

### 方法2：使用Photoshop或GIMP
1. 打开SVG文件
2. 设置相应的像素尺寸
3. 导出为PNG格式

### 方法3：使用命令行工具（如果安装了ImageMagick）
```bash
convert icon16.svg icon16.png
convert icon48.svg icon48.png
convert icon.svg -resize 128x128 icon128.png
```

## 图标设计说明：
- 红色圆形背景代表YouTube的品牌色调
- 白色下载箭头表示下载功能
- 底部横线表示文件存储到本地
- 小三角形暗示视频播放功能

转换完成后，请确保以下文件存在：
- icons/icon16.png
- icons/icon48.png  
- icons/icon128.png