/**
 * YouTube视频解析器
 * 实现真实的YouTube视频信息获取和下载链接解析
 */

class YouTubeParser {
    constructor() {
        this.apiKey = null; // 如果需要使用YouTube Data API
        this.corsProxy = 'https://api.allorigins.win/raw?url='; // CORS代理
    }

    /**
     * 从YouTube URL中提取视频ID
     */
    extractVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/v\/([^&\n?#]+)/,
            /youtube\.com\/watch\?.*v=([^&\n?#]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }
        return null;
    }

    /**
     * 验证YouTube URL是否有效
     */
    isValidYouTubeUrl(url) {
        return this.extractVideoId(url) !== null;
    }

    /**
     * 获取YouTube视频页面内容
     */
    async fetchVideoPage(videoId) {
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        try {
            // 使用Chrome的fetch API直接获取
            const response = await fetch(videoUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.text();
        } catch (error) {
            console.error('Failed to fetch video page:', error);
            throw new Error('无法获取视频页面，请检查网络连接');
        }
    }

    /**
     * 从页面HTML中解析视频信息
     */
    parseVideoInfo(html) {
        try {
            // 解析视频标题
            const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
            const title = titleMatch ? this.decodeHtml(titleMatch[1]) : '未知标题';

            // 解析视频描述
            const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
            const description = descMatch ? this.decodeHtml(descMatch[1]) : '无描述';

            // 解析缩略图
            const thumbMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
            const thumbnail = thumbMatch ? thumbMatch[1] : '';

            // 解析上传日期
            const dateMatch = html.match(/"datePublished":"([^"]+)"/);
            const uploadDate = dateMatch ? new Date(dateMatch[1]).toLocaleDateString('zh-CN') : '未知日期';

            // 解析频道名称
            const channelMatch = html.match(/"author":"([^"]+)"/);
            const channelName = channelMatch ? this.decodeHtml(channelMatch[1]) : '未知频道';

            // 解析视频时长
            const durationMatch = html.match(/"lengthSeconds":"(\d+)"/);
            const duration = durationMatch ? this.formatDuration(parseInt(durationMatch[1])) : '未知时长';

            return {
                title,
                description,
                thumbnail,
                uploadDate,
                channelName,
                duration,
                videoId: this.extractVideoIdFromHtml(html)
            };
        } catch (error) {
            console.error('Failed to parse video info:', error);
            throw new Error('解析视频信息失败');
        }
    }

    /**
     * 从HTML中提取视频ID
     */
    extractVideoIdFromHtml(html) {
        const match = html.match(/"videoId":"([^"]+)"/);
        return match ? match[1] : null;
    }

    /**
     * 解析视频格式和下载链接
     */
    async parseVideoFormats(html, videoId) {
        try {
            // 查找player response数据
            const playerResponseMatch = html.match(/var ytInitialPlayerResponse = ({.+?});/);
            if (!playerResponseMatch) {
                throw new Error('未找到播放器数据');
            }

            const playerResponse = JSON.parse(playerResponseMatch[1]);
            const streamingData = playerResponse.videoDetails?.streamingData || 
                                playerResponse.streamingData;

            if (!streamingData) {
                throw new Error('未找到流媒体数据');
            }

            const formats = [];

            // 处理自适应格式（音频+视频分离）
            if (streamingData.adaptiveFormats) {
                for (const format of streamingData.adaptiveFormats) {
                    if (format.mimeType && format.mimeType.includes('video')) {
                        formats.push({
                            itag: format.itag,
                            quality: format.qualityLabel || format.quality || '未知',
                            format: this.extractFormatFromMime(format.mimeType),
                            url: format.url,
                            fileSize: format.contentLength ? this.formatFileSize(format.contentLength) : '未知大小',
                            fps: format.fps || 30,
                            type: 'video'
                        });
                    }
                }
            }

            // 处理合并格式（音频+视频）
            if (streamingData.formats) {
                for (const format of streamingData.formats) {
                    formats.push({
                        itag: format.itag,
                        quality: format.qualityLabel || format.quality || '未知',
                        format: this.extractFormatFromMime(format.mimeType),
                        url: format.url,
                        fileSize: format.contentLength ? this.formatFileSize(format.contentLength) : '未知大小',
                        fps: format.fps || 30,
                        type: 'combined'
                    });
                }
            }

            // 按质量排序
            formats.sort((a, b) => {
                const qualityOrder = {'2160p': 4, '1440p': 3, '1080p': 2, '720p': 1, '480p': 0, '360p': -1, '240p': -2, '144p': -3};
                return (qualityOrder[b.quality] || -4) - (qualityOrder[a.quality] || -4);
            });

            return formats;
        } catch (error) {
            console.error('Failed to parse video formats:', error);
            // 返回备用格式列表
            return this.getFallbackFormats(videoId);
        }
    }

    /**
     * 获取备用格式列表（当解析失败时使用）
     */
    getFallbackFormats(videoId) {
        return [
            {
                itag: 22,
                quality: '720p',
                format: 'MP4',
                url: `https://www.youtube.com/watch?v=${videoId}`,
                fileSize: '未知大小',
                fps: 30,
                type: 'fallback',
                note: '需要外部工具下载'
            },
            {
                itag: 18,
                quality: '360p',
                format: 'MP4',
                url: `https://www.youtube.com/watch?v=${videoId}`,
                fileSize: '未知大小',
                fps: 30,
                type: 'fallback',
                note: '需要外部工具下载'
            }
        ];
    }

    /**
     * 从MIME类型中提取格式
     */
    extractFormatFromMime(mimeType) {
        if (mimeType.includes('mp4')) return 'MP4';
        if (mimeType.includes('webm')) return 'WebM';
        if (mimeType.includes('3gpp')) return '3GP';
        if (mimeType.includes('flv')) return 'FLV';
        return 'Unknown';
    }

    /**
     * 格式化文件大小
     */
    formatFileSize(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * 格式化视频时长
     */
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * HTML解码
     */
    decodeHtml(html) {
        const txt = document.createElement('textarea');
        txt.innerHTML = html;
        return txt.value;
    }

    /**
     * 完整的视频解析流程
     */
    async parseVideo(url) {
        // 验证URL
        if (!this.isValidYouTubeUrl(url)) {
            throw new Error('无效的YouTube URL');
        }

        // 提取视频ID
        const videoId = this.extractVideoId(url);
        if (!videoId) {
            throw new Error('无法提取视频ID');
        }

        // 获取视频页面
        const html = await this.fetchVideoPage(videoId);

        // 解析视频信息
        const videoInfo = this.parseVideoInfo(html);

        // 解析视频格式
        const formats = await this.parseVideoFormats(html, videoId);

        return {
            ...videoInfo,
            videoId,
            formats,
            originalUrl: url
        };
    }

    /**
     * 获取下载链接
     */
    async getDownloadUrl(videoId, itag) {
        try {
            // 这里实现获取特定格式的下载链接
            // 注意：实际的YouTube下载链接获取需要更复杂的处理
            const html = await this.fetchVideoPage(videoId);
            const formats = await this.parseVideoFormats(html, videoId);
            
            const targetFormat = formats.find(f => f.itag === itag);
            if (targetFormat && targetFormat.url) {
                return targetFormat.url;
            }
            
            throw new Error('未找到指定格式的下载链接');
        } catch (error) {
            console.error('Failed to get download URL:', error);
            throw error;
        }
    }
}

// 导出解析器类
window.YouTubeParser = YouTubeParser;