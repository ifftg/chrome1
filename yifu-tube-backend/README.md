# 易弗YouTube视频下载器后端服务

## 📋 项目概述

这是一个基于Node.js + Express + yt-dlp的YouTube视频下载后端服务，为Chrome插件提供真实的视频解析和下载功能。

## 🚀 快速开始

### 前置要求

- **Node.js** >= 14.0.0
- **npm** >= 6.0.0
- **yt-dlp** 可执行文件

### 步骤1：安装Node.js依赖

```bash
# 进入项目目录
cd yifu-tube-backend

# 安装所有依赖
npm install
```

### 步骤2：配置yt-dlp

#### 方法A：将yt-dlp.exe放在项目目录中
```bash
# 将yt-dlp.exe复制到项目根目录
cp path/to/yt-dlp.exe ./yt-dlp.exe
```

#### 方法B：全局安装yt-dlp
```bash
# 使用pip安装（推荐）
pip install yt-dlp

# 或者下载可执行文件到系统PATH
```

### 步骤3：启动服务器

```bash
# 生产模式启动
npm start

# 或开发模式启动（自动重启）
npm run dev
```

### 步骤4：验证服务

访问以下地址验证服务是否正常运行：

- **服务器状态**: http://localhost:3000/api/test
- **yt-dlp检查**: http://localhost:3000/api/check-ytdlp

## 📚 API接口文档

### 1. 服务器状态检查

```http
GET /api/test
```

**响应示例：**
```json
{
  "message": "易弗YouTube下载器后端服务运行正常！",
  "timestamp": "2025/8/7 10:30:15",
  "status": "success",
  "version": "1.0.0"
}
```

### 2. 检查yt-dlp状态

```http
GET /api/check-ytdlp
```

**响应示例：**
```json
{
  "status": "success",
  "message": "yt-dlp可用",
  "version": "2023.12.30"
}
```

### 3. 解析视频信息

```http
POST /api/parse-video
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=HiQul9_vmsc"
}
```

**响应示例：**
```json
{
  "status": "success",
  "data": {
    "videoId": "HiQul9_vmsc",
    "title": "视频标题",
    "description": "视频描述...",
    "thumbnail": "https://img.youtube.com/vi/HiQul9_vmsc/maxresdefault.jpg",
    "uploadDate": "2025-08-07",
    "channelName": "频道名称",
    "duration": "3:45",
    "formats": [
      {
        "quality": "1080p",
        "format": "MP4",
        "fileSize": "125.5 MB",
        "fps": 30,
        "hasAudio": true,
        "format_id": "137+140"
      }
    ]
  }
}
```

### 4. 下载视频

```http
POST /api/download-video
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=HiQul9_vmsc",
  "title": "视频标题",
  "format_id": "137+140"
}
```

**响应示例：**
```json
{
  "status": "success",
  "message": "视频下载成功！",
  "progress": 100,
  "downloadPath": "./downloads"
}
```

### 5. 获取下载列表

```http
GET /api/downloads
```

**响应示例：**
```json
{
  "status": "success",
  "downloads": [
    {
      "filename": "视频标题.mp4",
      "size": "125.5 MB",
      "created": "2025/8/7 10:30:15"
    }
  ],
  "totalFiles": 1
}
```

## 📁 项目结构

```
yifu-tube-backend/
├── server.js          # 主服务器文件
├── package.json        # 项目配置和依赖
├── README.md           # 项目说明文档
├── downloads/          # 下载文件存储目录（自动创建）
├── public/             # 静态文件目录（自动创建）
└── yt-dlp.exe         # yt-dlp可执行文件（可选）
```

## 🔧 配置选项

### 环境变量

- `PORT`: 服务器端口（默认3000）

### 自定义配置

可以修改`server.js`中的以下配置：

```javascript
const PORT = process.env.PORT || 3000;  // 端口号
const downloadDir = path.join(__dirname, 'downloads');  // 下载目录
```

## 🛠️ 故障排除

### 问题1：yt-dlp未找到

**错误信息：** `yt-dlp未安装或配置错误`

**解决方案：**
1. 确保yt-dlp.exe在项目目录中
2. 或者确保yt-dlp在系统PATH中
3. 测试命令：`yt-dlp --version`

### 问题2：端口被占用

**错误信息：** `EADDRINUSE: address already in use`

**解决方案：**
1. 更改端口：`PORT=3001 npm start`
2. 或杀死占用进程：`netstat -ano | findstr :3000`

### 问题3：下载失败

**可能原因：**
- 视频有地区限制
- 视频需要登录访问
- 网络连接问题

**解决方案：**
1. 检查视频URL是否可访问
2. 尝试更新yt-dlp版本
3. 检查网络连接

### 问题4：跨域问题

**解决方案：**
服务器已配置CORS，如果仍有问题，检查：
1. 前端请求URL是否正确
2. 是否使用了正确的HTTP方法

## 🧪 测试指南

### 手动测试

1. **启动服务器**
   ```bash
   npm start
   ```

2. **测试服务器状态**
   ```bash
   curl http://localhost:3000/api/test
   ```

3. **测试yt-dlp**
   ```bash
   curl http://localhost:3000/api/check-ytdlp
   ```

4. **测试视频解析**
   ```bash
   curl -X POST http://localhost:3000/api/parse-video \
     -H "Content-Type: application/json" \
     -d '{"url":"https://www.youtube.com/watch?v=HiQul9_vmsc"}'
   ```

### 使用Postman测试

导入以下请求到Postman：

1. **GET** `http://localhost:3000/api/test`
2. **GET** `http://localhost:3000/api/check-ytdlp`
3. **POST** `http://localhost:3000/api/parse-video`
   - Body (JSON): `{"url": "https://www.youtube.com/watch?v=HiQul9_vmsc"}`

## 🔒 安全注意事项

1. **生产环境部署**：
   - 使用环境变量管理敏感配置
   - 添加适当的错误处理和日志记录
   - 考虑添加认证和速率限制

2. **文件存储**：
   - 定期清理下载目录
   - 设置文件大小限制
   - 考虑使用云存储

3. **网络安全**：
   - 在反向代理后运行
   - 启用HTTPS
   - 配置防火墙规则

## 📄 许可证

MIT License - 仅供学习和研究使用

## 👥 贡献

欢迎提交Issue和Pull Request来改进这个项目！

## 📞 支持

如果遇到问题，请：
1. 查看故障排除部分
2. 检查服务器日志
3. 提交详细的Issue描述