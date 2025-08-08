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

// 创建必要的目录
const downloadDir = path.join(__dirname, 'downloads');
const publicDir = path.join(__dirname, 'public');

[downloadDir, publicDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 创建目录: ${dir}`);
    }
});

// 测试路由 - 检查服务器是否正常运行
app.get('/api/test', (req, res) => {
    res.json({
        message: '易弗YouTube下载器后端服务运行正常！',
        timestamp: new Date().toLocaleString('zh-CN'),
        status: 'success',
        version: '1.0.0',
        api_endpoints: [
            'GET  /api/test - 服务器状态检查',
            'POST /api/parse-video - 解析视频信息',
            'POST /api/download-video - 下载视频',
            'GET  /api/download-progress - 获取下载进度'
        ]
    });
});

// 检查yt-dlp是否可用
app.get('/api/check-ytdlp', (req, res) => {
    const ytDlpProcess = spawn('yt-dlp', ['--version']);
    
    let version = '';
    ytDlpProcess.stdout.on('data', (data) => {
        version += data.toString();
    });
    
    ytDlpProcess.on('close', (code) => {
        if (code === 0) {
            res.json({
                status: 'success',
                message: 'yt-dlp可用',
                version: version.trim()
            });
        } else {
            res.status(500).json({
                status: 'error',
                message: 'yt-dlp不可用，请检查安装'
            });
        }
    });
    
    ytDlpProcess.on('error', (error) => {
        res.status(500).json({
            status: 'error',
            message: 'yt-dlp未安装',
            error: error.message
        });
    });
});

// 解析视频信息的路由
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

        // 使用 yt-dlp 获取视频信息（增强参数，降低403/地区/UA限制）
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
                    
                    // 提取并处理格式信息 - 修复版本
                    const allFormats = videoInfo.formats || [];
                    
                    // 分离不同类型的格式
                    const directFormats = allFormats.filter(f => 
                        f.protocol === 'https' && 
                        f.vcodec !== 'none' && 
                        f.height &&
                        f.url &&
                        !f.url.includes('manifest.googlevideo.com')
                    );
                    
                    const streamFormats = allFormats.filter(f => 
                        f.protocol === 'm3u8_native' && 
                        f.vcodec !== 'none' && 
                        f.height &&
                        f.__working !== false
                    );
                    
                    // 处理直接下载格式（优先）
                    const processedDirectFormats = directFormats.map(f => ({
                        quality: f.height ? `${f.height}p` : '未知',
                        format: f.ext ? f.ext.toUpperCase() : 'MP4',
                        fileSize: f.filesize ? formatFileSize(f.filesize) : 
                                 f.filesize_approx ? formatFileSize(f.filesize_approx) : '未知大小',
                        fps: f.fps || 30,
                        hasAudio: f.acodec !== 'none',
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
                    
                    // 提取需要的视频信息
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
                        originalUrl: url
                    };

                    console.log('✅ 视频解析成功:', extractedInfo.title);
                    console.log(`📊 找到 ${formats.length} 个格式选项`);
                    
                    res.json({
                        status: 'success',
                        data: extractedInfo
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
                // 403 或权限问题时，尝试携带浏览器Cookie重试一次
                if (/403|forbidden|permission|denied/i.test(stderr || '')) {
                    console.warn('⚠️ 首次解析失败，尝试 --cookies-from-browser chrome 重试...');
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
                                const allFormats = videoInfo.formats || [];
                                const directFormats = allFormats.filter(f => f.protocol === 'https' && f.vcodec !== 'none' && f.height && f.url && !f.url.includes('manifest.googlevideo.com'));
                                const streamFormats = allFormats.filter(f => f.protocol === 'm3u8_native' && f.vcodec !== 'none' && f.height && f.__working !== false);
                                const processedDirectFormats = directFormats.map(f => ({
                                    quality: f.height ? `${f.height}p` : '未知',
                                    format: f.ext ? f.ext.toUpperCase() : 'MP4',
                                    fileSize: f.filesize ? formatFileSize(f.filesize) : f.filesize_approx ? formatFileSize(f.filesize_approx) : '未知大小',
                                    fps: f.fps || 30,
                                    hasAudio: f.acodec !== 'none',
                                    format_id: f.format_id,
                                    url: f.url,
                                    downloadType: 'direct',
                                    bitrate: f.tbr || null,
                                    isRecommended: true
                                }));
                                const processedStreamFormats = streamFormats.slice(0, 3).map(f => ({
                                    quality: f.height ? `${f.height}p` : '未知',
                                    format: f.ext ? f.ext.toUpperCase() : 'MP4',
                                    fileSize: '流媒体格式',
                                    fps: f.fps || 30,
                                    hasAudio: f.acodec !== 'none',
                                    format_id: f.format_id,
                                    url: f.url,
                                    downloadType: 'stream',
                                    bitrate: f.tbr || null,
                                    isRecommended: false
                                }));
                                const formats = [...processedDirectFormats, ...processedStreamFormats].sort((a, b) => {
                                    if (a.isRecommended && !b.isRecommended) return -1;
                                    if (!a.isRecommended && b.isRecommended) return 1;
                                    return parseInt(b.quality) - parseInt(a.quality);
                                });
                                const extractedInfo = {
                                    videoId: videoInfo.id || 'unknown',
                                    title: videoInfo.title || '未知标题',
                                    description: videoInfo.description ? videoInfo.description.substring(0, 200) + '...' : '暂无描述',
                                    thumbnail: videoInfo.thumbnail || 'https://via.placeholder.com/300x200/667eea/ffffff?text=无封面',
                                    uploadDate: videoInfo.upload_date ? `${videoInfo.upload_date.substring(0, 4)}-${videoInfo.upload_date.substring(4, 6)}-${videoInfo.upload_date.substring(6, 8)}` : '未知日期',
                                    channelName: videoInfo.uploader || '未知频道',
                                    duration: videoInfo.duration ? formatDuration(videoInfo.duration) : '未知时长',
                                    formats,
                                    originalUrl: url
                                };
                                console.log('✅ 重试解析成功:', extractedInfo.title);
                                return res.json({ status: 'success', data: extractedInfo });
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
                    return; // 等待重试回调
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

// 下载视频的路由
app.post('/api/download-video', async (req, res) => {
    try {
        const { url, title, format_id } = req.body;
        
        if (!url) {
            return res.status(400).json({
                error: '请提供YouTube视频URL',
                status: 'error'
            });
        }

        console.log('📥 开始下载视频:', url);
        if (format_id) {
            console.log('🎯 指定格式:', format_id);
        }

        // 构建yt-dlp命令参数 - 修复版本
        const ytDlpArgs = [
            '-o', path.join(downloadDir, '%(title)s.%(ext)s'),
            '--progress-template', 'download:%(progress.downloaded_bytes)s/%(progress.total_bytes)s',
            '--no-warnings',
            '--no-playlist'
        ];

        // 智能格式选择策略
        if (format_id) {
            // 首先尝试指定格式，如果失败则回退到自动选择
            ytDlpArgs.push('-f', `${format_id}/best[height<=720]/best`);
            console.log('🎯 使用指定格式:', format_id, '备选: best[height<=720]');
        } else {
            // 没有指定格式时，使用智能选择
            ytDlpArgs.push('-f', 'best[height<=720]/best');
            console.log('🤖 使用自动格式选择: best[height<=720]');
        }

        ytDlpArgs.push(url);

        const ytDlpProcess = spawn('yt-dlp', ytDlpArgs);

        let downloadProgress = {
            downloaded: 0,
            total: 0,
            percentage: 0
        };

        ytDlpProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('📊 下载输出:', output);
            
            // 解析进度信息
            const progressMatch = output.match(/download:(\d+)\/(\d+)/);
            if (progressMatch) {
                downloadProgress.downloaded = parseInt(progressMatch[1]);
                downloadProgress.total = parseInt(progressMatch[2]);
                downloadProgress.percentage = Math.round((downloadProgress.downloaded / downloadProgress.total) * 100);
                console.log(`📈 下载进度: ${downloadProgress.percentage}%`);
            }
        });

        let stderrOutput = '';

        ytDlpProcess.stderr.on('data', (data) => {
            const errorText = data.toString();
            stderrOutput += errorText;
            console.log('⚠️ 下载信息:', errorText);
        });

        ytDlpProcess.on('close', (code) => {
            if (code === 0) {
                console.log('✅ 视频下载完成');
                
                // 检查downloads目录中的新文件
                const files = fs.readdirSync(downloadDir);
                const latestFile = files
                    .filter(file => file.includes(title) || file.includes(videoInfo?.id || ''))
                    .sort((a, b) => {
                        const statsA = fs.statSync(path.join(downloadDir, a));
                        const statsB = fs.statSync(path.join(downloadDir, b));
                        return statsB.mtime - statsA.mtime;
                    })[0];

                res.json({
                    status: 'success',
                    message: '视频下载成功！',
                    progress: 100,
                    downloadPath: downloadDir,
                    fileName: latestFile || 'unknown',
                    fileSize: latestFile ? formatFileSize(fs.statSync(path.join(downloadDir, latestFile)).size) : 'unknown'
                });
            } else {
                console.error('❌ 下载失败，退出码:', code);
                console.error('❌ 错误详情:', stderrOutput);
                
                // 分析错误原因
                const errorAnalysis = analyzeDownloadError(stderrOutput, code);
                
                res.status(500).json({
                    error: '视频下载失败',
                    status: 'error',
                    exitCode: code,
                    errorType: errorAnalysis.type,
                    errorReason: errorAnalysis.reason,
                    suggestion: errorAnalysis.suggestion,
                    details: stderrOutput
                });
            }
        });

        ytDlpProcess.on('error', (error) => {
            console.error('❌ 启动下载失败:', error);
            res.status(500).json({
                error: 'yt-dlp未安装或配置错误',
                status: 'error',
                details: error.message
            });
        });

    } catch (error) {
        console.error('❌ 下载视频时出错:', error);
        res.status(500).json({
            error: '服务器内部错误',
            status: 'error'
        });
    }
});

// 获取下载进度的路由
app.get('/api/download-progress', (req, res) => {
    // 这里可以实现实时进度查询
    res.json({
        status: 'success',
        progress: 0,
        message: '进度查询功能待实现'
    });
});

// 获取下载列表
app.get('/api/downloads', (req, res) => {
    try {
        const files = fs.readdirSync(downloadDir);
        const downloads = files.map(file => {
            const filePath = path.join(downloadDir, file);
            const stats = fs.statSync(filePath);
            return {
                filename: file,
                size: formatFileSize(stats.size),
                created: stats.birthtime.toLocaleString('zh-CN'),
                path: filePath
            };
        });

        res.json({
            status: 'success',
            downloads: downloads,
            totalFiles: downloads.length
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: '无法读取下载目录'
        });
    }
});

// 工具函数：格式化时长
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

// 工具函数：格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 错误分析函数
function analyzeDownloadError(stderr, exitCode) {
    const errorText = stderr.toLowerCase();
    
    if (errorText.includes('403') || errorText.includes('forbidden')) {
        return {
            type: 'NETWORK_FORBIDDEN',
            reason: '访问被拒绝（403错误）',
            suggestion: '这通常是因为YouTube的地区限制或反爬虫保护。建议稍后重试或使用VPN。'
        };
    }
    
    if (errorText.includes('fragment') && errorText.includes('not found')) {
        return {
            type: 'FRAGMENT_ERROR',
            reason: 'HLS流媒体片段丢失',
            suggestion: '选择的格式可能是流媒体格式，建议选择直接下载格式或让系统自动选择。'
        };
    }
    
    if (errorText.includes('private video') || errorText.includes('sign in')) {
        return {
            type: 'ACCESS_RESTRICTED',
            reason: '视频需要登录或是私有视频',
            suggestion: '该视频可能需要登录YouTube账户或是私有视频，无法下载。'
        };
    }
    
    if (errorText.includes('video unavailable') || errorText.includes('not available')) {
        return {
            type: 'VIDEO_UNAVAILABLE',
            reason: '视频不可用',
            suggestion: '视频可能已被删除、私有化或在您的地区不可用。'
        };
    }
    
    if (errorText.includes('too many requests') || errorText.includes('rate limit')) {
        return {
            type: 'RATE_LIMITED',
            reason: '请求过于频繁',
            suggestion: '触发了YouTube的速率限制，请等待几分钟后重试。'
        };
    }
    
    if (errorText.includes('network') || errorText.includes('connection')) {
        return {
            type: 'NETWORK_ERROR',
            reason: '网络连接问题',
            suggestion: '请检查网络连接是否正常，或稍后重试。'
        };
    }
    
    // 默认错误分析
    return {
        type: 'UNKNOWN_ERROR',
        reason: `下载失败（退出码: ${exitCode}）`,
        suggestion: '建议尝试选择其他格式或让系统自动选择最佳格式。如问题持续，请检查yt-dlp版本是否为最新。'
    };
}

// 启动服务器
app.listen(PORT, () => {
    console.log('🎬 易弗YouTube视频下载器后端服务');
    console.log('='.repeat(50));
    console.log(`🚀 服务器已启动！`);
    console.log(`📱 访问地址: http://localhost:${PORT}`);
    console.log(`🔧 API测试地址: http://localhost:${PORT}/api/test`);
    console.log(`🔍 yt-dlp检查: http://localhost:${PORT}/api/check-ytdlp`);
    console.log(`📁 静态文件目录: public/`);
    console.log(`📥 下载目录: downloads/`);
    console.log('='.repeat(50));
    
    // 检查yt-dlp是否可用
    const testProcess = spawn('yt-dlp', ['--version']);
    testProcess.on('close', (code) => {
        if (code === 0) {
            console.log('✅ yt-dlp 已准备就绪');
        } else {
            console.log('⚠️  警告: yt-dlp 可能未正确安装');
        }
    });
    testProcess.on('error', () => {
        console.log('❌ 错误: yt-dlp 未找到，请检查安装');
    });
});

// 优雅关闭服务器
process.on('SIGINT', () => {
    console.log('\n🛑 正在关闭服务器...');
    console.log('👋 感谢使用易弗YouTube视频下载器！');
    process.exit(0);
});