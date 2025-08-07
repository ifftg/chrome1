// 修复版本的popup.js - 确保基础功能正常工作
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== 插件启动 ===');
    
    // 获取页面元素
    const urlInput = document.getElementById('urlInput');
    const parseBtn = document.getElementById('parseBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const errorMessage = document.getElementById('errorMessage');
    const loading = document.getElementById('loading');
    const videoInfo = document.getElementById('videoInfo');
    const qualitySelect = document.getElementById('qualitySelect');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');

    // 调试：检查关键元素
    console.log('元素检查:');
    console.log('- urlInput:', !!urlInput);
    console.log('- parseBtn:', !!parseBtn);
    console.log('- downloadBtn:', !!downloadBtn);

    // 当前解析的视频数据
    let currentVideoData = null;
    
    // YouTube解析器实例
    let youtubeParser = null;

    // 初始化插件
    init();

    /**
     * 初始化函数
     */
    function init() {
        console.log('开始初始化...');
        
        // 检查并初始化解析器
        if (typeof YouTubeParser === 'undefined') {
            console.error('YouTubeParser类未找到，请检查youtube-parser.js');
            showError('插件初始化失败：解析器未加载');
            return;
        }

        try {
            youtubeParser = new YouTubeParser();
            console.log('解析器初始化成功');
        } catch (error) {
            console.error('解析器初始化失败:', error);
            showError('插件初始化失败：' + error.message);
            return;
        }

        // 绑定事件监听器
        if (parseBtn) {
            parseBtn.addEventListener('click', function() {
                console.log('解析按钮被点击');
                parseVideo();
            });
            console.log('解析按钮事件绑定成功');
        } else {
            console.error('解析按钮未找到');
        }

        if (downloadBtn) {
            downloadBtn.addEventListener('click', downloadVideo);
        }

        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', clearHistory);
        }

        if (qualitySelect) {
            qualitySelect.addEventListener('change', updateFileSize);
        }

        // 支持回车键解析
        if (urlInput) {
            urlInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    console.log('回车键触发解析');
                    parseVideo();
                }
            });
        }

        // 加载历史记录
        loadHistory();

        // 监听来自background script的消息
        chrome.runtime.onMessage.addListener(handleBackgroundMessage);
        
        console.log('初始化完成');
    }

    /**
     * 解析YouTube视频信息
     */
    async function parseVideo() {
        console.log('=== 开始解析视频 ===');
        
        if (!urlInput) {
            console.error('URL输入框未找到');
            showError('界面错误：输入框未找到');
            return;
        }

        const url = urlInput.value.trim();
        console.log('输入的URL:', url);

        if (!url) {
            showError('请输入YouTube视频URL');
            return;
        }

        // 验证URL格式
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
        if (!youtubeRegex.test(url)) {
            console.log('URL格式验证失败');
            showError('请输入有效的YouTube视频URL');
            return;
        }

        console.log('URL验证通过');

        // 显示加载状态
        showLoading(true);
        hideError();
        hideVideoInfo();

        try {
            console.log('调用解析器...');
            
            if (!youtubeParser) {
                throw new Error('解析器未初始化');
            }

            const videoData = await youtubeParser.parseVideo(url);
            console.log('解析成功:', videoData);

            // 转换数据格式
            const adaptedVideoData = {
                id: videoData.videoId,
                title: videoData.title,
                description: videoData.description,
                thumbnail: videoData.thumbnail,
                uploadDate: videoData.uploadDate,
                channelName: videoData.channelName,
                duration: videoData.duration,
                formats: videoData.formats.map(format => ({
                    quality: format.quality,
                    format: format.format,
                    size: format.fileSize,
                    url: format.url,
                    itag: format.itag,
                    type: format.type,
                    hasAudio: format.hasAudio,
                    note: format.note
                }))
            };

            // 保存当前视频数据
            currentVideoData = adaptedVideoData;

            // 显示视频信息
            displayVideoInfo(adaptedVideoData);
            
            console.log('视频信息显示完成');

        } catch (error) {
            console.error('解析失败:', error);
            showError('解析失败: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * 显示视频信息
     */
    function displayVideoInfo(videoData) {
        console.log('显示视频信息:', videoData.title);
        
        if (!videoInfo) {
            console.error('videoInfo元素未找到');
            return;
        }

        // 设置基本信息
        const thumbnail = document.getElementById('thumbnail');
        const title = document.getElementById('title');
        const description = document.getElementById('description');
        const uploadDate = document.getElementById('uploadDate');

        if (thumbnail) thumbnail.src = videoData.thumbnail || `https://img.youtube.com/vi/${videoData.id}/mqdefault.jpg`;
        if (title) title.textContent = videoData.title;
        if (description) description.textContent = videoData.description;
        if (uploadDate) uploadDate.textContent = videoData.uploadDate;

        // 清空并填充清晰度选项
        if (qualitySelect) {
            qualitySelect.innerHTML = '<option value="">请选择清晰度</option>';
            
            videoData.formats.forEach((format, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${format.quality} ${format.format} (${format.size})`;
                if (format.type === 'fallback') {
                    option.textContent += ' - 需要外部工具';
                    option.style.color = '#999';
                }
                qualitySelect.appendChild(option);
            });
        }

        // 显示视频信息区域
        videoInfo.style.display = 'block';
        if (downloadBtn) {
            downloadBtn.disabled = true;
        }
        
        console.log('视频信息显示完成');
    }

    /**
     * 下载视频
     */
    function downloadVideo() {
        console.log('下载按钮被点击');
        
        if (!currentVideoData || !qualitySelect || qualitySelect.value === '') {
            showError('请先选择视频清晰度');
            return;
        }

        const selectedFormat = currentVideoData.formats[qualitySelect.value];
        console.log('选择的格式:', selectedFormat);

        // 检查格式类型
        if (selectedFormat.type === 'fallback') {
            showError('此格式需要外部下载工具。建议使用yt-dlp等专业工具。');
            return;
        }

        // 显示进度条
        if (progressContainer) {
            progressContainer.style.display = 'flex';
        }
        if (progressBar) {
            progressBar.style.width = '0%';
        }
        if (progressText) {
            progressText.textContent = '准备下载...';
        }

        // 禁用下载按钮
        if (downloadBtn) {
            downloadBtn.disabled = true;
            downloadBtn.textContent = '下载中...';
        }

        try {
            // 生成安全的文件名
            const safeTitle = currentVideoData.title.replace(/[^\w\s-]/g, '').trim();
            const extension = selectedFormat.format.toLowerCase() === 'webm' ? 'webm' : 'mp4';
            const filename = `${safeTitle}.${extension}`;

            console.log('准备下载:', filename);

            // 发送下载请求到background script
            chrome.runtime.sendMessage({
                action: 'downloadVideo',
                data: {
                    url: selectedFormat.url,
                    filename: filename,
                    videoData: currentVideoData,
                    format: selectedFormat
                }
            });

        } catch (error) {
            console.error('下载失败:', error);
            showError('下载失败: ' + error.message);
            onDownloadError(error.message);
        }
    }

    /**
     * 更新文件大小显示
     */
    function updateFileSize() {
        const selectedIndex = qualitySelect.value;
        const fileSizeElement = document.getElementById('fileSize');
        
        if (selectedIndex !== '' && currentVideoData && fileSizeElement) {
            const format = currentVideoData.formats[selectedIndex];
            fileSizeElement.textContent = format.size;
            if (downloadBtn) {
                downloadBtn.disabled = false;
            }
        } else {
            if (fileSizeElement) {
                fileSizeElement.textContent = '-';
            }
            if (downloadBtn) {
                downloadBtn.disabled = true;
            }
        }
    }

    /**
     * 处理来自background script的消息
     */
    function handleBackgroundMessage(message) {
        console.log('收到background消息:', message);
        
        switch (message.action) {
            case 'downloadProgress':
                updateProgress(message.progress);
                break;
            case 'downloadComplete':
                onDownloadComplete(message.data);
                break;
            case 'downloadError':
                onDownloadError(message.error);
                break;
        }
    }

    /**
     * 更新下载进度
     */
    function updateProgress(progress) {
        if (progressBar) {
            progressBar.style.width = progress + '%';
        }
        if (progressText) {
            progressText.textContent = Math.round(progress) + '%';
        }
    }

    /**
     * 下载完成处理
     */
    function onDownloadComplete(data) {
        console.log('下载完成:', data);
        
        // 重置UI状态
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.textContent = '下载视频';
        }

        // 显示成功消息
        showError('下载完成！文件已保存到下载文件夹。');
        
        // 添加到历史记录
        addToHistory(currentVideoData);
        
        // 显示通知
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: '下载完成',
            message: `视频"${currentVideoData.title}"下载完成`
        });
    }

    /**
     * 下载错误处理
     */
    function onDownloadError(error) {
        console.error('下载错误:', error);
        
        // 重置UI状态
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.textContent = '下载视频';
        }

        showError('下载失败: ' + error);
    }

    /**
     * 显示错误信息
     */
    function showError(message) {
        console.log('显示错误:', message);
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
        }
    }

    /**
     * 隐藏错误信息
     */
    function hideError() {
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
    }

    /**
     * 显示加载状态
     */
    function showLoading(show) {
        if (loading) {
            loading.style.display = show ? 'block' : 'none';
        }
        if (parseBtn) {
            parseBtn.disabled = show;
            parseBtn.textContent = show ? '解析中...' : '解析视频';
        }
    }

    /**
     * 隐藏视频信息
     */
    function hideVideoInfo() {
        if (videoInfo) {
            videoInfo.style.display = 'none';
        }
        currentVideoData = null;
    }

    /**
     * 加载历史记录
     */
    function loadHistory() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['downloadHistory'], function(result) {
                const history = result.downloadHistory || [];
                displayHistory(history);
            });
        }
    }

    /**
     * 显示历史记录
     */
    function displayHistory(history) {
        if (!historyList) return;
        
        historyList.innerHTML = '';
        if (history.length === 0) {
            historyList.innerHTML = '<div class="history-empty">暂无下载记录</div>';
            return;
        }

        history.slice(-10).reverse().forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <div class="history-title">${item.title}</div>
                <div class="history-date">${item.date}</div>
            `;
            historyList.appendChild(historyItem);
        });
    }

    /**
     * 添加到历史记录
     */
    function addToHistory(videoData) {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['downloadHistory'], function(result) {
                const history = result.downloadHistory || [];
                history.push({
                    title: videoData.title,
                    url: `https://www.youtube.com/watch?v=${videoData.id}`,
                    date: new Date().toLocaleString('zh-CN')
                });
                
                chrome.storage.local.set({ downloadHistory: history }, function() {
                    loadHistory();
                });
            });
        }
    }

    /**
     * 清除历史记录
     */
    function clearHistory() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.remove(['downloadHistory'], function() {
                loadHistory();
            });
        }
    }

    console.log('=== 插件脚本加载完成 ===');
});