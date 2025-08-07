# 🚀 快速启动指南

## 📋 完整操作步骤

### 步骤1：准备yt-dlp
```bash
# 下载yt-dlp.exe到项目目录
# 下载地址: https://github.com/yt-dlp/yt-dlp/releases
# 选择: yt-dlp.exe (Windows)
```

### 步骤2：自动安装（推荐）
```bash
# 双击运行
setup.bat
```

### 步骤3：手动安装（备选）
```bash
# 安装依赖
npm install

# 启动服务器
npm start
```

### 步骤4：验证服务
```bash
# 浏览器访问
http://localhost:3000
```

## 🎯 测试YouTube下载功能

访问 `http://localhost:3000` 然后：

1. 点击"测试视频解析"
2. 输入YouTube URL：`https://www.youtube.com/watch?v=HiQul9_vmsc`
3. 点击"解析视频"
4. 查看解析结果

## 📞 问题排除

### yt-dlp未找到
```bash
# 确保yt-dlp.exe在项目目录中
dir yt-dlp.exe

# 或测试系统PATH中的yt-dlp
yt-dlp --version
```

### 端口被占用
```bash
# 使用其他端口启动
set PORT=3001 && npm start
```

### 依赖安装失败
```bash
# 清除node_modules重新安装
rmdir /s node_modules
npm install
```

## ✅ 成功标志

看到以下输出表示成功：

```
🎬 易弗YouTube视频下载器后端服务
==================================================
🚀 服务器已启动！
📱 访问地址: http://localhost:3000
🔧 API测试地址: http://localhost:3000/api/test
✅ yt-dlp 已准备就绪
==================================================
```

## 📱 Chrome插件集成

后端服务启动后，修改Chrome插件的API地址：

```javascript
// 在Chrome插件中使用
const API_BASE = 'http://localhost:3000';

// 解析视频
fetch(`${API_BASE}/api/parse-video`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: youtubeUrl })
});
```

这样你的Chrome插件就可以使用真实的后端服务进行YouTube视频下载了！