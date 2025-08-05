// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
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

    // 当前解析的视频数据
    let currentVideoData = null;

    // 初始化插件
    init();

    /**
     * 初始化函数 - 设置事件监听器和加载历史记录
     */
    function init() {
        // 绑定事件监听器
        parseBtn.addEventListener('click', parseVideo);
        downloadBtn.addEventListener('click', downloadVideo);
        clearHistoryBtn.addEventListener('click', clearHistory);
        qualitySelect.addEventListener('change', updateFileSize);
        
        // 支持回车键解析
        urlInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                parseVideo();
            }
        });

        // 加载历史记录
        loadHistory();

        // 监听来自background script的消息
        chrome.runtime.onMessage.addListener(handleBackgroundMessage);
    }

    /**
     * 解析YouTube视频信息
     */
    async function parseVideo() {
        const url = urlInput.value.trim();
        
        // 验证URL格式
        if (!isValidYouTubeUrl(url)) {
            showError('请输入有效的YouTube视频URL');
            return;
        }

        // 显示加载状态
        showLoading(true);
        hideError();
        hideVideoInfo();

        try {
            // 提取视频ID
            const videoId = extractVideoId(url);
            if (!videoId) {
                throw new Error('无法提取视频ID');
            }

            // 模拟获取视频信息（实际应用中需要使用YouTube API或其他方法）
            const videoData = await fetchVideoInfo(videoId);
            
            // 保存当前视频数据
            currentVideoData = videoData;
            
            // 显示视频信息
            displayVideoInfo(videoData);
            
        } catch (error) {
            console.error('解析视频失败:', error);
            showError('URL无效或解析失败，请检查视频链接是否正确');
        } finally {
            showLoading(false);
        }
    }

    /**
     * 验证YouTube URL格式
     * @param {string} url - 要验证的URL
     * @returns {boolean} - 是否为有效的YouTube URL
     */
    function isValidYouTubeUrl(url) {
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
        return youtubeRegex.test(url);
    }

    /**
     * 从URL中提取视频ID
     * @param {string} url - YouTube视频URL
     * @returns {string|null} - 视频ID或null
     */
    function extractVideoId(url) {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    /**
     * 获取视频信息（模拟函数，实际应用需要真实的API）
     * @param {string} videoId - 视频ID
     * @returns {Promise<Object>} - 视频信息对象
     */
    async function fetchVideoInfo(videoId) {
        // 模拟API延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 模拟视频信息（实际应用中应该调用真实的YouTube API或其他服务）
        const mockVideoData = {
            id: videoId,
            title: '示例视频标题 - 这是一个演示视频',
            description: '这是一个示例视频的描述。在实际应用中，这里会显示真实的视频描述信息。由于YouTube API的限制，这里使用模拟数据进行演示。',
            thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            uploadDate: '2024-01-15',
            formats: [
                { quality: '1080p MP4', size: '125.5 MB', url: `https://example.com/video_${videoId}_1080p.mp4` },
                { quality: '720p MP4', size: '78.2 MB', url: `https://example.com/video_${videoId}_720p.mp4` },
                { quality: '480p MP4', size: '45.8 MB', url: `https://example.com/video_${videoId}_480p.mp4` },
                { quality: '360p WebM', size: '28.3 MB', url: `https://example.com/video_${videoId}_360p.webm` }
            ]
        };

        return mockVideoData;
    }

    /**
     * 显示视频信息
     * @param {Object} videoData - 视频数据对象
     */
    function displayVideoInfo(videoData) {
        // 设置基本信息
        document.getElementById('thumbnail').src = videoData.thumbnail;
        document.getElementById('title').textContent = videoData.title;
        document.getElementById('description').textContent = videoData.description;
        document.getElementById('uploadDate').textContent = videoData.uploadDate;

        // 清空并填充清晰度选项
        qualitySelect.innerHTML = '<option value="">请选择清晰度</option>';
        videoData.formats.forEach((format, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = format.quality;
            qualitySelect.appendChild(option);
        });

        // 显示视频信息区域
        videoInfo.style.display = 'block';
        downloadBtn.disabled = true;
    }

    /**
     * 更新文件大小显示
     */
    function updateFileSize() {
        const selectedIndex = qualitySelect.value;
        if (selectedIndex !== '' && currentVideoData) {
            const format = currentVideoData.formats[selectedIndex];
            document.getElementById('fileSize').textContent = format.size;
            downloadBtn.disabled = false;
        } else {
            document.getElementById('fileSize').textContent = '-';
            downloadBtn.disabled = true;
        }
    }

    /**
     * 下载视频
     */
    function downloadVideo() {
        if (!currentVideoData || qualitySelect.value === '') {
            showError('请先选择视频清晰度');
            return;
        }

        const selectedFormat = currentVideoData.formats[qualitySelect.value];
        
        // 显示进度条
        progressContainer.style.display = 'flex';
        progressBar.style.width = '0%';
        progressText.textContent = '0%';
        
        // 禁用下载按钮
        downloadBtn.disabled = true;
        downloadBtn.textContent = '下载中...';

        // 发送下载请求到background script
        chrome.runtime.sendMessage({
            action: 'downloadVideo',
            data: {
                url: selectedFormat.url,
                filename: `${currentVideoData.title}.${selectedFormat.quality.includes('WebM') ? 'webm' : 'mp4'}`,
                videoData: currentVideoData
            }
        });
    }

    /**
     * 处理来自background script的消息
     * @param {Object} message - 消息对象
     */
    function handleBackgroundMessage(message) {
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
     * @param {number} progress - 进度百分比 (0-100)
     */
    function updateProgress(progress) {
        progressBar.style.width = progress + '%';
        progressText.textContent = Math.round(progress) + '%';
    }

    /**
     * 下载完成处理
     * @param {Object} data - 下载完成数据
     */
    function onDownloadComplete(data) {
        // 重置UI状态
        progressContainer.style.display = 'none';
        downloadBtn.disabled = false;
        downloadBtn.textContent = '下载视频';
        
        // 保存到历史记录
        saveToHistory(currentVideoData, urlInput.value);
        
        // 刷新历史记录显示
        loadHistory();
        
        // 清空输入框
        urlInput.value = '';
        hideVideoInfo();
    }

    /**
     * 下载错误处理
     * @param {string} error - 错误信息
     */
    function onDownloadError(error) {
        progressContainer.style.display = 'none';
        downloadBtn.disabled = false;
        downloadBtn.textContent = '下载视频';
        showError('下载失败: ' + error);
    }

    /**
     * 保存下载记录到历史
     * @param {Object} videoData - 视频数据
     * @param {string} url - 原始URL
     */
    async function saveToHistory(videoData, url) {
        try {
            const result = await chrome.storage.local.get(['downloadHistory']);
            const history = result.downloadHistory || [];
            
            const historyItem = {
                id: Date.now(),
                title: videoData.title,
                url: url,
                downloadDate: new Date().toLocaleString('zh-CN')
            };
            
            history.unshift(historyItem); // 添加到开头
            
            // 限制历史记录数量
            if (history.length > 50) {
                history.splice(50);
            }
            
            await chrome.storage.local.set({ downloadHistory: history });
        } catch (error) {
            console.error('保存历史记录失败:', error);
        }
    }

    /**
     * 加载历史记录
     */
    async function loadHistory() {
        try {
            const result = await chrome.storage.local.get(['downloadHistory']);
            const history = result.downloadHistory || [];
            
            historyList.innerHTML = '';
            
            if (history.length === 0) {
                historyList.innerHTML = '<div class="no-history">暂无下载记录</div>';
                return;
            }
            
            history.forEach(item => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                historyItem.innerHTML = `
                    <span class="history-title">${item.title}</span>
                    <a href="${item.url}" class="history-url" target="_blank">${item.url}</a>
                    <span class="history-date">${item.downloadDate}</span>
                `;
                historyList.appendChild(historyItem);
            });
        } catch (error) {
            console.error('加载历史记录失败:', error);
            historyList.innerHTML = '<div class="no-history">加载历史记录失败</div>';
        }
    }

    /**
     * 清除历史记录
     */
    async function clearHistory() {
        if (confirm('确定要清除所有历史记录吗？')) {
            try {
                await chrome.storage.local.set({ downloadHistory: [] });
                loadHistory();
            } catch (error) {
                console.error('清除历史记录失败:', error);
                showError('清除历史记录失败');
            }
        }
    }

    /**
     * 显示错误信息
     * @param {string} message - 错误消息
     */
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    /**
     * 隐藏错误信息
     */
    function hideError() {
        errorMessage.style.display = 'none';
    }

    /**
     * 显示或隐藏加载状态
     * @param {boolean} show - 是否显示加载状态
     */
    function showLoading(show) {
        loading.style.display = show ? 'flex' : 'none';
        parseBtn.disabled = show;
        parseBtn.textContent = show ? '解析中...' : '解析视频';
    }

    /**
     * 隐藏视频信息
     */
    function hideVideoInfo() {
        videoInfo.style.display = 'none';
        currentVideoData = null;
    }
});