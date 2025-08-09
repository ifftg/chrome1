/**
 * 易弗YouTube视频下载器后端服务 - 专业版
 * 架构重构版本：专注于视频信息解析，下载逻辑移至前端
 * 
 * 核心职责：
 * 1. 提供视频信息解析服务（唯一核心功能）
 * 2. 服务器状态检查
 * 3. yt-dlp工具状态检查
 * 
 * 已移除功能：
 * - 视频下载接口（/api/download-video）
 * - 下载进度查询（/api/download-progress）
 * - 下载文件管理（/api/downloads）
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// 创建 Express 应用
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors()); // 允许跨域请求
app.use(express.json()); // 解析 JSON 请求体
app.use(express.static('public')); // 静态文件服务

// 创建必要的目录（仅用于日志和缓存）
const publicDir = path.join(__dirname, 'public');

if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    console.log(`📁 创建目录: ${publicDir}`);
}

// ============================================================================
// API 路由定义
// ============================================================================

/**
 * 服务器状态检查路由
 */
app.get('/api/test', (req, res) => {
    res.json({
        message: '易弗YouTube下载器后端服务运行正常！',
        timestamp: new Date().toLocaleString('zh-CN'),
        status: 'success',
        version: '2.0.0-professional',
        architecture: 'parsing-only',
        api_endpoints: [
            'GET  /api/test - 服务器状态检查',
            'GET  /api/check-ytdlp - yt-dlp工具状态检查',
            'POST /api/parse-video - 视频信息解析（核心功能）'
        ],
        note: '专业版架构：后端专注解析，前端负责下载'
    });
});

/**
 * 检查yt-dlp工具是否可用
 */
app.get('/api/check-ytdlp', (req, res) => {
    console.log('🔍 检查yt-dlp工具状态...');
    
    const ytDlpProcess = spawn('yt-dlp', ['--version']);
    
    let version = '';
    ytDlpProcess.stdout.on('data', (data) => {
        version += data.toString();
    });
    
    ytDlpProcess.on('close', (code) => {
        if (code === 0) {
            console.log('✅ yt-dlp可用，版本:', version.trim());
            res.json({
                status: 'success',
                message: 'yt-dlp可用',
                version: version.trim()
            });
        } else {
            console.log('❌ yt-dlp不可用，退出码:', code);
            res.status(500).json({
                status: 'error',
                message: 'yt-dlp不可用，请检查安装'
            });
        }
    });
    
    ytDlpProcess.on('error', (error) => {
        console.log('❌ yt-dlp未找到:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'yt-dlp未安装',
            error: error.message
        });
    });
});

/**
 * 视频信息解析路由 - 核心功能
 * 这是后端的唯一核心职责：解析视频信息并返回给前端
 */
app.post('/api/parse-video', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({
                error: '请提供YouTube视频URL',
                status: 'error'
            });
        }

        console.log('🔍 开始解析视频:', url);

        // 使用优化的yt-dlp参数解析视频信息
        const ytDlpProcess = spawn('yt-dlp', [
            '--dump-json',
            '--no-playlist',
            '--no-warnings',
            '--ignore-config',
            '--geo-bypass',
            '--force-ipv4',
            '--no-check-certificate',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
            '--referer', 'https://www.youtube.com',
            '--add-header', 'Accept-Language: zh-CN,zh;q=0.9',
            '--extractor-args', 'youtube:player_client=android',
            url
        ]);

        let stdout = '';
        let stderr = '';

        ytDlpProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        ytDlpProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        ytDlpProcess.on('close', (code) => {
            if (code === 0 && stdout) {
                try {
                    const videoInfo = JSON.parse(stdout);
                    console.log('✅ 视频信息解析成功:', videoInfo.title);
                    
                    // 处理和优化格式信息
                    const processedData = processVideoInfo(videoInfo, url);
                    
                    res.json({
                        status: 'success',
                        data: processedData
                    });

                } catch (parseError) {
                    console.error('❌ 解析JSON失败:', parseError);
                    res.status(500).json({
                        error: '解析视频信息失败',
                        status: 'error'
                    });
                }
            } else {
                console.error('❌ yt-dlp执行失败:', stderr);
                
                // 如果是403等权限问题，尝试使用浏览器Cookie重试
                if (/403|forbidden|permission|denied/i.test(stderr || '')) {
                    console.warn('⚠️ 权限问题，尝试使用浏览器Cookie重试...');
                    retryWithCookies(url, res);
                    return;
                }
                
                res.status(500).json({
                    error: '无法获取视频信息，请检查URL是否正确或视频是否可访问',
                    status: 'error',
                    details: stderr
                });
            }
        });

        ytDlpProcess.on('error', (error) => {
            console.error('❌ 启动yt-dlp失败:', error);
            res.status(500).json({
                error: 'yt-dlp未安装或配置错误',
                status: 'error',
                details: error.message
            });
        });

    } catch (error) {
        console.error('❌ 解析视频时出错:', error);
        res.status(500).json({
            error: '服务器内部错误',
            status: 'error'
        });
    }
});

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 使用浏览器Cookie重试解析
 */
function retryWithCookies(url, res) {
    console.log('🔄 使用浏览器Cookie重试解析...');
    
    const retry = spawn('yt-dlp', [
        '--dump-json',
        '--no-playlist',
        '--no-warnings',
        '--ignore-config',
        '--geo-bypass',
        '--force-ipv4',
        '--no-check-certificate',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        '--referer', 'https://www.youtube.com',
        '--add-header', 'Accept-Language: zh-CN,zh;q=0.9',
        '--extractor-args', 'youtube:player_client=android',
        '--cookies-from-browser', 'chrome',
        url
    ]);
    
    let rOut = '', rErr = '';
    retry.stdout.on('data', d => (rOut += d.toString()));
    retry.stderr.on('data', d => (rErr += d.toString()));
    
    retry.on('close', c => {
        if (c === 0 && rOut) {
            try {
                const videoInfo = JSON.parse(rOut);
                console.log('✅ 重试解析成功:', videoInfo.title);
                
                const processedData = processVideoInfo(videoInfo, url);
                
                return res.json({ 
                    status: 'success', 
                    data: processedData 
                });
            } catch (e) {
                console.error('❌ 重试解析JSON失败:', e);
            }
        }
        
        console.error('❌ 重试仍失败:', rErr);
        res.status(500).json({
            error: '无法获取视频信息，请检查URL是否正确或视频是否可访问',
            status: 'error',
            details: rErr
        });
    });
}

/**
 * 处理和优化视频信息
 */
function processVideoInfo(videoInfo, originalUrl) {
    console.log('🔧 处理视频信息...');
    
    // 提取并优化格式信息
    const allFormats = videoInfo.formats || [];
    console.log(`📊 原始格式数量: ${allFormats.length}`);
    
    // 分离不同类型的格式
    const directFormats = allFormats.filter(f => 
        f.protocol === 'https' && 
        f.vcodec !== 'none' && 
        f.height &&
        f.url &&
        !f.url.includes('manifest.googlevideo.com') &&
        f.acodec !== 'none' // 确保包含音频
    );
    
    const streamFormats = allFormats.filter(f => 
        f.protocol === 'm3u8_native' && 
        f.vcodec !== 'none' && 
        f.height &&
        f.acodec !== 'none' && // 确保包含音频
        f.__working !== false
    );
    
    console.log(`🎯 直接下载格式: ${directFormats.length}`);
    console.log(`📡 流媒体格式: ${streamFormats.length}`);
    
    // 处理直接下载格式（优先）
    const processedDirectFormats = directFormats.map(f => ({
        quality: f.height ? `${f.height}p` : '未知',
        format: f.ext ? f.ext.toUpperCase() : 'MP4',
        fileSize: f.filesize ? formatFileSize(f.filesize) : 
                 f.filesize_approx ? formatFileSize(f.filesize_approx) : '未知大小',
        fps: f.fps || 30,
        hasAudio: f.acodec !== 'none',
        vcodec: f.vcodec,
        acodec: f.acodec,
        format_id: f.format_id,
        url: f.url,
        downloadType: 'direct',
        bitrate: f.tbr || null,
        isRecommended: true
    }));
    
    // 处理流媒体格式（备用）
    const processedStreamFormats = streamFormats.slice(0, 3).map(f => ({
        quality: f.height ? `${f.height}p` : '未知',
        format: f.ext ? f.ext.toUpperCase() : 'MP4',
        fileSize: '流媒体格式',
        fps: f.fps || 30,
        hasAudio: f.acodec !== 'none',
        vcodec: f.vcodec,
        acodec: f.acodec,
        format_id: f.format_id,
        url: f.url,
        downloadType: 'stream',
        bitrate: f.tbr || null,
        isRecommended: false
    }));
    
    // 合并并排序格式
    const formats = [...processedDirectFormats, ...processedStreamFormats]
        .sort((a, b) => {
            // 优先推荐直接下载格式
            if (a.isRecommended && !b.isRecommended) return -1;
            if (!a.isRecommended && b.isRecommended) return 1;
            // 然后按质量排序
            return parseInt(b.quality) - parseInt(a.quality);
        });
    
    console.log(`✅ 最终处理格式数量: ${formats.length}`);
    
    // 构建返回的视频信息
    const extractedInfo = {
        videoId: videoInfo.id || 'unknown',
        title: videoInfo.title || '未知标题',
        description: videoInfo.description ? 
            videoInfo.description.substring(0, 200) + '...' : '暂无描述',
        thumbnail: videoInfo.thumbnail || 'https://via.placeholder.com/300x200/667eea/ffffff?text=无封面',
        uploadDate: videoInfo.upload_date ? 
            `${videoInfo.upload_date.substring(0, 4)}-${videoInfo.upload_date.substring(4, 6)}-${videoInfo.upload_date.substring(6, 8)}` : '未知日期',
        channelName: videoInfo.uploader || '未知频道',
        duration: videoInfo.duration ? 
            formatDuration(videoInfo.duration) : '未知时长',
        formats: formats,
        originalUrl: originalUrl,
        
        // 添加额外信息
        viewCount: videoInfo.view_count || 0,
        likeCount: videoInfo.like_count || 0,
        extractorInfo: {
            extractor: videoInfo.extractor,
            extractorKey: videoInfo.extractor_key
        }
    };

    return extractedInfo;
}

/**
 * 格式化时长
 */
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================================================
// 服务器启动
// ============================================================================

app.listen(PORT, () => {
    console.log('🎬 易弗YouTube视频下载器后端服务 - 专业版');
    console.log('='.repeat(60));
    console.log(`🚀 服务器已启动！`);
    console.log(`📱 访问地址: http://localhost:${PORT}`);
    console.log(`🔧 API测试地址: http://localhost:${PORT}/api/test`);
    console.log(`🔍 yt-dlp检查: http://localhost:${PORT}/api/check-ytdlp`);
    console.log(`📁 静态文件目录: public/`);
    console.log('');
    console.log('🎯 架构说明:');
    console.log('  - 后端专注: 视频信息解析');
    console.log('  - 前端负责: 直接下载文件');
    console.log('  - 优势: 稳定、快速、无服务器压力');
    console.log('='.repeat(60));
    
    // 检查yt-dlp是否可用
    const testProcess = spawn('yt-dlp', ['--version']);
    testProcess.on('close', (code) => {
        if (code === 0) {
            console.log('✅ yt-dlp 已准备就绪');
        } else {
            console.log('⚠️  警告: yt-dlp 可能未正确安装');
        }
        console.log('');
    });
    testProcess.on('error', () => {
        console.log('❌ 错误: yt-dlp 未找到，请检查安装');
        console.log('');
    });
});

// 优雅关闭服务器
process.on('SIGINT', () => {
    console.log('\n🛑 正在关闭服务器...');
    console.log('👋 感谢使用易弗YouTube视频下载器专业版！');
    process.exit(0);
});