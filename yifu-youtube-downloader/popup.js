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
    
    // YouTube解析器实例
    let youtubeParser = null;

    // 初始化插件
    init();

    /**
     * 初始化函数 - 设置事件监听器和加载历史记录
     */
    function init() {
        // 初始化YouTube解析器
        youtubeParser = new YouTubeParser();
        
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
        if (!youtubeParser.isValidYouTubeUrl(url)) {
            showError('请输入有效的YouTube视频URL');
            return;
        }

        // 显示加载状态
        showLoading(true);
        hideError();
        hideVideoInfo();

        try {
            // 使用真实的YouTube解析器解析视频
            console.log('开始解析视频:', url);
            const videoData = await youtubeParser.parseVideo(url);
            
            console.log('解析结果:', videoData);
            console.log('找到格式数量:', videoData.formats.length);
            
            // 转换数据格式以适配现有的显示函数
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
            
            console.log('适配后的数据:', adaptedVideoData);
            
            // 保存当前视频数据
            currentVideoData = adaptedVideoData;
            
            // 显示视频信息
            displayVideoInfo(adaptedVideoData);
            
        } catch (error) {
            console.error('解析视频失败:', error);
            showError(`解析失败: ${error.message}`);
        } finally {
            showLoading(false);
        }
    }

    // 旧的模拟函数已被移除，现在使用YouTubeParser类中的真实解析功能

    /**
     * 显示视频信息
     * @param {Object} videoData - 视频数据对象
     */
    function displayVideoInfo(videoData) {
        // 设置基本信息
        document.getElementById('thumbnail').src = videoData.thumbnail || `https://img.youtube.com/vi/${videoData.id}/mqdefault.jpg`;
        document.getElementById('title').textContent = videoData.title;
        document.getElementById('description').textContent = videoData.description;
        document.getElementById('uploadDate').textContent = videoData.uploadDate;

        // 显示额外信息（如果有）
        if (videoData.channelName) {
            const channelInfo = document.createElement('div');
            channelInfo.className = 'channel-info';
            channelInfo.innerHTML = `<strong>频道:</strong> ${videoData.channelName}`;
            document.getElementById('description').parentNode.appendChild(channelInfo);
        }

        if (videoData.duration) {
            const durationInfo = document.createElement('div');
            durationInfo.className = 'duration-info';
            durationInfo.innerHTML = `<strong>时长:</strong> ${videoData.duration}`;
            document.getElementById('description').parentNode.appendChild(durationInfo);
        }

        // 清空并填充清晰度选项
        qualitySelect.innerHTML = '<option value="">请选择清晰度</option>';
        
        // 分类显示格式
        const realFormats = videoData.formats.filter(f => f.type !== 'fallback');
        const fallbackFormats = videoData.formats.filter(f => f.type === 'fallback');
        
        // 先显示真实格式
        if (realFormats.length > 0) {
            const realGroup = document.createElement('optgroup');
            realGroup.label = `真实可用格式 (${realFormats.length}个)`;
            realFormats.forEach((format, index) => {
                const option = document.createElement('option');
                option.value = videoData.formats.indexOf(format);
                const audioInfo = format.hasAudio ? '含音频' : '仅视频';
                option.textContent = `${format.quality} ${format.format} (${format.size}) - ${audioInfo}`;
                realGroup.appendChild(option);
            });
            qualitySelect.appendChild(realGroup);
        }
        
        // 再显示备用格式
        if (fallbackFormats.length > 0) {
            const fallbackGroup = document.createElement('optgroup');
            fallbackGroup.label = '备用格式 (需要外部工具)';
            fallbackFormats.forEach((format, index) => {
                const option = document.createElement('option');
                option.value = videoData.formats.indexOf(format);
                option.textContent = `${format.quality} ${format.format} - 需要外部下载器`;
                option.style.color = '#999';
                fallbackGroup.appendChild(option);
            });
            qualitySelect.appendChild(fallbackGroup);
        }

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
    async function downloadVideo() {
        if (!currentVideoData || qualitySelect.value === '') {
            showError('请先选择视频清晰度');
            return;
        }

        const selectedFormat = currentVideoData.formats[qualitySelect.value];
        
        // 检查是否为备用格式
        if (selectedFormat.type === 'fallback') {
            showError('此格式需要外部下载工具。请复制视频URL使用专门的YouTube下载器。');
            return;
        }
        
        // 显示进度条
        progressContainer.style.display = 'flex';
        progressBar.style.width = '0%';
        progressText.textContent = '准备下载...';
        
        // 禁用下载按钮
        downloadBtn.disabled = true;
        downloadBtn.textContent = '下载中...';

        try {
            // 生成安全的文件名
            const safeTitle = currentVideoData.title.replace(/[^\w\s-]/g, '').trim();
            const extension = selectedFormat.quality.includes('WebM') ? 'webm' : 'mp4';
            const filename = `${safeTitle}.${extension}`;

            // 如果有真实的下载URL，使用Chrome下载API
            if (selectedFormat.url && !selectedFormat.url.includes('example.com')) {
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
            } else {
                // 如果没有真实URL，尝试重新获取下载链接
                progressText.textContent = '获取下载链接...';
                
                const downloadUrl = await youtubeParser.getDownloadUrl(currentVideoData.id, selectedFormat.itag);
                
                chrome.runtime.sendMessage({
                    action: 'downloadVideo',
                    data: {
                        url: downloadUrl,
                        filename: filename,
                        videoData: currentVideoData,
                        format: selectedFormat
                    }
                });
            }
        } catch (error) {
            console.error('下载失败:', error);
            showError(`下载失败: ${error.message}`);
            onDownloadError(error.message);
        }
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