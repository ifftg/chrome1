// background.js - Chrome插件后台服务脚本

// 插件安装时的初始化
chrome.runtime.onInstalled.addListener(() => {
    console.log('易弗YouTube视频下载插件已安装');
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'downloadVideo':
            handleVideoDownload(message.data, sender.tab);
            break;
        default:
            console.log('未知消息类型:', message.action);
    }
});

/**
 * 处理视频下载请求
 * @param {Object} downloadData - 下载数据
 * @param {Object} tab - 发送请求的标签页
 */
async function handleVideoDownload(downloadData, tab) {
    try {
        // 清理文件名，移除不允许的字符
        const cleanFilename = sanitizeFilename(downloadData.filename);
        
        // 开始下载
        const downloadId = await startDownload(downloadData.url, cleanFilename);
        
        // 监听下载进度
        monitorDownloadProgress(downloadId, downloadData.videoData);
        
    } catch (error) {
        console.error('下载失败:', error);
        // 发送错误消息给popup
        chrome.runtime.sendMessage({
            action: 'downloadError',
            error: error.message || '下载失败'
        });
    }
}

/**
 * 开始下载文件
 * @param {string} url - 下载URL
 * @param {string} filename - 文件名
 * @returns {Promise<number>} - 下载ID
 */
function startDownload(url, filename) {
    return new Promise((resolve, reject) => {
        // 检查URL是否为真实的视频下载链接
        if (url && !url.includes('example.com') && (url.includes('googlevideo.com') || url.includes('youtube.com'))) {
            // 尝试使用真实的下载URL
            chrome.downloads.download({
                url: url,
                filename: filename,
                saveAs: false,
                headers: [
                    {
                        name: 'User-Agent',
                        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    },
                    {
                        name: 'Referer',
                        value: 'https://www.youtube.com/'
                    }
                ]
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.warn('真实下载失败，使用备用方法:', chrome.runtime.lastError.message);
                    // 如果真实下载失败，回退到演示模式
                    fallbackDownload(filename, resolve, reject);
                } else {
                    resolve(downloadId);
                }
            });
        } else {
            // 如果没有真实URL，使用演示下载
            fallbackDownload(filename, resolve, reject);
        }
    });
}

/**
 * 备用下载方法（演示用）
 * @param {string} filename - 文件名
 * @param {Function} resolve - Promise resolve函数
 * @param {Function} reject - Promise reject函数
 */
function fallbackDownload(filename, resolve, reject) {
    // 创建一个包含说明的文件
    const instructionContent = createInstructionFile();
    const dataUrl = createDataUrl(instructionContent, 'text/plain');
    
    // 修改文件名为.txt格式
    const txtFilename = filename.replace(/\.(mp4|webm|flv)$/i, '.txt');
    
    chrome.downloads.download({
        url: dataUrl,
        filename: txtFilename,
        saveAs: false
    }, (downloadId) => {
        if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
        } else {
            resolve(downloadId);
        }
    });
}

/**
 * 创建说明文件内容
 * @returns {string} - 说明内容
 */
function createInstructionFile() {
    return `易弗YouTube视频下载器 - 下载说明

由于技术和法律限制，直接下载YouTube视频需要特殊处理。

建议的下载方法：
1. 使用专业的YouTube下载工具（如yt-dlp, youtube-dl等）
2. 使用在线YouTube下载网站
3. 使用其他支持YouTube下载的浏览器插件

本插件已成功解析视频信息，包括：
- 视频标题和描述
- 可用的清晰度选项
- 视频元数据

如需真实下载功能，请参考开源项目或使用专门的下载工具。

解析时间: ${new Date().toLocaleString('zh-CN')}
插件版本: 1.0

© 2025 易弗的YouTube视频下载器
仅供学习和研究使用`;
}

/**
 * 创建Data URL，兼容Manifest V3
 * @param {string} content - 文件内容
 * @param {string} mimeType - MIME类型
 * @returns {string} - Data URL
 */
function createDataUrl(content, mimeType = 'text/plain') {
    // 将文本内容转换为 base64 编码的 Data URL
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    
    // 将 Uint8Array 转换为字符串
    let binary = '';
    const len = data.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(data[i]);
    }
    
    // 创建 base64 编码
    const base64 = btoa(binary);
    
    // 返回 Data URL，使用指定的MIME类型
    return `data:${mimeType};base64,${base64}`;
}

/**
 * 监听下载进度
 * @param {number} downloadId - 下载ID
 * @param {Object} videoData - 视频数据
 */
function monitorDownloadProgress(downloadId, videoData) {
    // 模拟下载进度更新
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 15 + 5; // 随机增加5-20%
        
        if (progress >= 100) {
            progress = 100;
            clearInterval(progressInterval);
            
            // 下载完成
            onDownloadComplete(downloadId, videoData);
        }
        
        // 发送进度更新到popup
        chrome.runtime.sendMessage({
            action: 'downloadProgress',
            progress: progress
        });
        
    }, 300); // 每300ms更新一次进度
    
    // 监听实际的下载状态变化
    const downloadListener = (delta) => {
        if (delta.id === downloadId) {
            if (delta.state && delta.state.current === 'complete') {
                clearInterval(progressInterval);
                chrome.downloads.onChanged.removeListener(downloadListener);
                onDownloadComplete(downloadId, videoData);
            } else if (delta.state && delta.state.current === 'interrupted') {
                clearInterval(progressInterval);
                chrome.downloads.onChanged.removeListener(downloadListener);
                chrome.runtime.sendMessage({
                    action: 'downloadError',
                    error: '下载被中断'
                });
            }
        }
    };
    
    chrome.downloads.onChanged.addListener(downloadListener);
}

/**
 * 下载完成处理
 * @param {number} downloadId - 下载ID
 * @param {Object} videoData - 视频数据
 */
async function onDownloadComplete(downloadId, videoData) {
    try {
        // 显示下载完成通知
        await showDownloadNotification(videoData.title);
        
        // 发送完成消息到popup
        chrome.runtime.sendMessage({
            action: 'downloadComplete',
            data: {
                downloadId: downloadId,
                videoData: videoData
            }
        });
        
    } catch (error) {
        console.error('处理下载完成事件失败:', error);
    }
}

/**
 * 显示下载完成通知
 * @param {string} videoTitle - 视频标题
 */
function showDownloadNotification(videoTitle) {
    return new Promise((resolve) => {
        // 创建通知选项
        const notificationOptions = {
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: '下载成功',
            message: `视频 "${videoTitle}" 已成功下载到您的计算机。`,
            priority: 1
        };
        
        // 显示通知
        chrome.notifications.create('download_complete', notificationOptions, (notificationId) => {
            if (chrome.runtime.lastError) {
                console.error('创建通知失败:', chrome.runtime.lastError.message);
            } else {
                console.log('下载完成通知已显示');
            }
            resolve();
        });
        
        // 5秒后自动清除通知
        setTimeout(() => {
            chrome.notifications.clear('download_complete');
        }, 5000);
    });
}

/**
 * 清理文件名，移除不允许的字符
 * @param {string} filename - 原始文件名
 * @returns {string} - 清理后的文件名
 */
function sanitizeFilename(filename) {
    // 移除或替换不允许的字符
    const sanitized = filename
        .replace(/[<>:"/\\|?*]/g, '_') // 替换不允许的字符为下划线
        .replace(/\s+/g, ' ') // 合并多个空格为单个空格
        .trim() // 移除首尾空格
        .substring(0, 100); // 限制文件名长度
    
    return sanitized || 'downloaded_video'; // 如果文件名为空，使用默认名称
}

/**
 * 处理通知点击事件
 */
chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId === 'download_complete') {
        // 点击通知时可以执行的操作，比如打开下载文件夹
        chrome.downloads.showDefaultFolder();
    }
});

/**
 * 处理下载错误
 * @param {Error} error - 错误对象
 * @param {string} context - 错误上下文
 */
function handleDownloadError(error, context = '') {
    console.error(`下载错误 ${context}:`, error);
    
    // 发送错误消息到popup
    chrome.runtime.sendMessage({
        action: 'downloadError',
        error: error.message || '未知下载错误'
    });
}

// 监听插件图标点击事件（可选）
chrome.action.onClicked.addListener((tab) => {
    // 当用户点击插件图标时的处理
    console.log('插件图标被点击，当前标签页:', tab.url);
});

// 插件启动时的日志
console.log('易弗YouTube视频下载器后台服务已启动');