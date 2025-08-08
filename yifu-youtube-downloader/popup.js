// Chrome插件主脚本 - 后端API集成版本
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== 插件启动（后端API版本） ===');
    
    // 后端API配置
    const API_CONFIG = {
        BASE_URL: 'http://localhost:3000',
        ENDPOINTS: {
            PARSE_VIDEO: '/api/parse-video',
            DOWNLOAD_VIDEO: '/api/download-video',
            CHECK_STATUS: '/api/test',
            CHECK_YTDLP: '/api/check-ytdlp'
        }
    };
    
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

    // 初始化插件
    init();

    /**
     * 初始化函数
     */
    function init() {
        console.log('开始初始化...');
        
        // 检查后端服务状态
        checkBackendStatus();
        
        // 设置事件监听器
        setupEventListeners();
        
        // 加载历史记录
        loadDownloadHistory();
        
        console.log('插件初始化完成');
    }

    /**
     * 检查后端服务状态
     */
    async function checkBackendStatus() {
        try {
            console.log('检查后端服务状态...');
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHECK_STATUS}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                console.log('✅ 后端服务正常:', data.message);
                showSuccess('后端服务连接成功！');
                
                // 检查yt-dlp状态
                await checkYtDlpStatus();
            } else {
                throw new Error('后端服务响应异常');
            }
        } catch (error) {
            console.error('❌ 后端服务连接失败:', error);
            showError('后端服务连接失败，请确保后端服务器已启动 (http://localhost:3000)');
        }
    }

    /**
     * 检查yt-dlp状态
     */
    async function checkYtDlpStatus() {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHECK_YTDLP}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                console.log('✅ yt-dlp可用:', data.version);
            } else {
                console.warn('⚠️ yt-dlp不可用:', data.message);
                showWarning('yt-dlp不可用，下载功能可能受限');
            }
        } catch (error) {
            console.warn('⚠️ 无法检查yt-dlp状态:', error);
        }
    }

    /**
     * 设置事件监听器
     */
    function setupEventListeners() {
        // 解析按钮事件
        if (parseBtn) {
            parseBtn.addEventListener('click', function() {
                console.log('解析按钮被点击');
                parseVideo();
            });
        }

        // 下载按钮事件
        if (downloadBtn) {
            downloadBtn.addEventListener('click', function() {
                console.log('下载按钮被点击');
                downloadVideo();
            });
        }

        // 清除历史按钮事件
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', function() {
                clearDownloadHistory();
            });
        }

        // URL输入框回车事件
        if (urlInput) {
        urlInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                parseVideo();
            }
        });
        }

        // 格式选择器change事件 - 启用/禁用下载按钮
        if (qualitySelect) {
            qualitySelect.addEventListener('change', function() {
                const selectedValue = qualitySelect.value;
                console.log('格式选择改变:', selectedValue);
                
                if (selectedValue && selectedValue !== '') {
                    downloadBtn.disabled = false;
                    console.log('✅ 下载按钮已启用');
                } else {
                    downloadBtn.disabled = true;
                    console.log('❌ 下载按钮已禁用');
                }
            });
        }
    }

    /**
     * 解析YouTube视频 - 使用后端API
     */
    async function parseVideo() {
        const url = urlInput.value.trim();
        
        if (!url) {
            showError('请输入YouTube视频URL');
            return;
        }

        // 简单的YouTube URL验证
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/;
        if (!youtubeRegex.test(url)) {
            showError('请输入有效的YouTube视频URL');
            return;
        }

        console.log('开始解析视频:', url);

        // 显示加载状态
        showLoading(true);
        hideError();
        hideVideoInfo();
        updateProgressText('正在连接后端服务...');

        try {
            // 通过chrome.runtime.sendMessage向background.js发送解析请求
            console.log('📤 向background发送解析请求:', url);
            
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    {
                        action: 'parseVideo',
                        data: { url: url }
                    },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            console.error('❌ Chrome runtime错误:', chrome.runtime.lastError);
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            console.log('📥 收到background响应:', response);
                            resolve(response);
                        }
                    }
                );
            });
            
            if (response.success) {
                console.log('✅ 视频解析成功:', response.data);
                console.log('🎯 Formats数组:', response.data.formats);
                console.log('📊 Formats数量:', response.data.formats ? response.data.formats.length : 0);
                
                currentVideoData = response.data;
                currentVideoData.originalUrl = url; // 保存原始URL
                
                displayVideoInfo(currentVideoData);
                showSuccess('视频信息解析成功！');
                updateProgressText('解析完成');
            } else {
                throw new Error(response.error || '解析失败');
            }
            
        } catch (error) {
            console.error('❌ 解析失败:', error);
            showError(`解析失败: ${error.message}`);
            updateProgressText('解析失败');
        } finally {
            showLoading(false);
        }
    }

    /**
     * 显示视频信息
     */
    function displayVideoInfo(videoData) {
        if (!videoInfo) return;

        // 清除之前的信息
        videoInfo.innerHTML = '';

        // 创建完整的视频信息HTML，包含下载区域
        const infoHTML = `
            <div class="video-thumbnail">
                <img src="${videoData.thumbnail}" alt="视频缩略图" onerror="this.src='https://via.placeholder.com/300x200/667eea/ffffff?text=无封面'">
            </div>
            <div class="video-details">
                <h3 class="video-title">${videoData.title}</h3>
                <div class="video-meta">
                    <div class="meta-item">
                        <span class="meta-label">频道:</span>
                        <span class="meta-value">${videoData.channelName}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">时长:</span>
                        <span class="meta-value">${videoData.duration}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">上传日期:</span>
                        <span class="meta-value">${videoData.uploadDate}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">解析方式:</span>
                        <span class="meta-value backend-api">🚀 后端API解析</span>
                    </div>
                </div>
                <div class="video-description">
                    <p>${videoData.description}</p>
                </div>
            </div>
            
            <!-- 格式选择和下载区域 -->
            <div style="padding: 15px;">
                <select id="qualitySelect" style="width: 100%; padding: 10px; margin-bottom: 15px;">
                    <option value="">请选择下载格式</option>
                </select>
                
                <!-- 下载按钮 -->
                <button id="downloadBtn" class="download-btn" disabled>下载视频</button>
                
                <!-- 下载进度条 -->
                <div id="progressContainer" class="progress-container" style="display: none;">
                    <div class="progress-bar">
                        <div id="progressBar" class="progress-fill"></div>
                    </div>
                    <span id="progressText">0%</span>
                </div>
            </div>
        `;

        videoInfo.innerHTML = infoHTML;
        videoInfo.style.display = 'block';

        // 重新获取动态创建的元素
        const newQualitySelect = document.getElementById('qualitySelect');
        const newDownloadBtn = document.getElementById('downloadBtn');

        // 填充格式选择器
        populateQualitySelect(videoData.formats);

        // 重新绑定下载按钮事件监听器
        if (newDownloadBtn) {
            newDownloadBtn.addEventListener('click', function() {
                console.log('下载按钮被点击');
                downloadVideo();
            });
        }

        // 重新绑定格式选择器change事件
        if (newQualitySelect) {
            newQualitySelect.addEventListener('change', function() {
                const selectedValue = newQualitySelect.value;
                console.log('格式选择改变:', selectedValue);
                
                if (selectedValue && selectedValue !== '') {
                    newDownloadBtn.disabled = false;
                    console.log('✅ 下载按钮已启用');
        } else {
                    newDownloadBtn.disabled = true;
                    console.log('❌ 下载按钮已禁用');
                }
            });
        }
    }

    /**
     * 填充格式选择器
     */
    function populateQualitySelect(formats) {
        console.log('🔧 开始填充格式选择器');
        console.log('📋 接收到的formats:', formats);
        
        const currentQualitySelect = document.getElementById('qualitySelect');
        if (!currentQualitySelect) {
            console.error('❌ 找不到qualitySelect元素');
            return;
        }

        currentQualitySelect.innerHTML = '<option value="">请选择下载格式</option>';

        if (formats && formats.length > 0) {
            console.log(`📊 处理 ${formats.length} 个格式`);
            // 按质量分组
            const videoFormats = formats.filter(f => f.hasAudio !== false);
            const audioOnlyFormats = formats.filter(f => f.hasAudio === false);

            // 分离推荐格式和其他格式
            const recommendedFormats = formats.filter(f => f.isRecommended);
            const otherFormats = formats.filter(f => !f.isRecommended);
            
            // 添加推荐格式组
            if (recommendedFormats.length > 0) {
                const recommendedGroup = document.createElement('optgroup');
                recommendedGroup.label = '✅ 推荐格式（直接下载）';
                
                recommendedFormats.forEach((format, index) => {
                    console.log(`🎯 添加推荐格式 ${index + 1}:`, format);
                    const option = document.createElement('option');
                    option.value = JSON.stringify(format);
                    const audioInfo = format.hasAudio ? '含音频' : '仅视频';
                    option.textContent = `${format.quality} ${format.format} (${format.fileSize}) - ${audioInfo}`;
                    recommendedGroup.appendChild(option);
                    console.log(`✅ 已添加: ${option.textContent}`);
                });
                
                currentQualitySelect.appendChild(recommendedGroup);
            }
            
            // 添加其他格式组  
            if (otherFormats.length > 0) {
                const otherGroup = document.createElement('optgroup');
                otherGroup.label = '📡 其他格式（流媒体）';
                
                otherFormats.forEach(format => {
                    const option = document.createElement('option');
                    option.value = JSON.stringify(format);
                    const audioInfo = format.hasAudio ? '含音频' : '仅视频';
                    option.textContent = `${format.quality} ${format.format} (${format.fileSize}) - ${audioInfo}`;
                    otherGroup.appendChild(option);
                });
                
                currentQualitySelect.appendChild(otherGroup);
            }

            // 添加仅音频格式组
            if (audioOnlyFormats.length > 0) {
                const audioGroup = document.createElement('optgroup');
                audioGroup.label = '🎵 仅视频格式（需合并音频）';
                
                audioOnlyFormats.forEach(format => {
            const option = document.createElement('option');
                    option.value = JSON.stringify(format);
                    option.textContent = `${format.quality} ${format.format} (${format.fileSize}) - 仅视频`;
                    audioGroup.appendChild(option);
                });
                
                currentQualitySelect.appendChild(audioGroup);
            }
        } else {
            console.warn('⚠️ 没有可用的格式数据');
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '暂无可用格式';
            option.disabled = true;
            currentQualitySelect.appendChild(option);
        }

        // 确保UI元素可见
        console.log('🎯 确保下载按钮和选择器可见');
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.style.display = 'inline-block';
            downloadBtn.disabled = true; // 默认禁用，选择格式后启用
            console.log('✅ 下载按钮已显示');
        } else {
            console.error('❌ 找不到downloadBtn元素');
        }
        
        currentQualitySelect.style.display = 'block';
        console.log('✅ 格式选择器已显示');
        console.log(`🎉 格式选择器填充完成，共 ${formats ? formats.length : 0} 个选项`);
    }

    /**
     * 下载视频 - 使用后端API
     */
    async function downloadVideo() {
        if (!currentVideoData) {
            showError('请先解析视频信息');
            return;
        }

        const currentQualitySelect = document.getElementById('qualitySelect');
        const selectedValue = currentQualitySelect ? currentQualitySelect.value : '';
        if (!selectedValue) {
            showError('请选择下载格式');
            return;
        }

        let selectedFormat;
        try {
            selectedFormat = JSON.parse(selectedValue);
        } catch (error) {
            showError('格式信息解析失败');
            return;
        }

        console.log('开始下载视频:', currentVideoData.title);
        console.log('选择格式:', selectedFormat);

        // 显示下载进度
        showProgress();
        updateProgressText('正在准备下载...');
        updateProgressBar(0);

        try {
            // 调用后端API下载视频
            const downloadData = {
                url: currentVideoData.originalUrl,
                title: currentVideoData.title,
                format_id: selectedFormat.format_id
            };

            updateProgressText('正在请求后端下载...');

            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DOWNLOAD_VIDEO}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(downloadData)
            });

            const result = await response.json();

            if (response.ok && result.status === 'success') {
                console.log('✅ 下载请求成功:', result);
                updateProgressBar(100);
                updateProgressText('下载完成！');
                showSuccess('视频下载成功！文件已保存到后端服务器的downloads文件夹中。');
                
                // 添加到历史记录
                addToHistory({
                    title: currentVideoData.title,
                    quality: selectedFormat.quality,
                    format: selectedFormat.format,
                    timestamp: new Date().toLocaleString('zh-CN'),
                    status: 'success'
                });
                
                setTimeout(() => {
                    hideProgress();
                }, 2000);
                
            } else {
                throw new Error(result.error || '下载失败');
            }

        } catch (error) {
            console.error('❌ 下载失败:', error);
            updateProgressText('下载失败');
            
            // 解析后端返回的详细错误信息
            let errorMessage = error.message;
            let suggestion = '';
            
            try {
                const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DOWNLOAD_VIDEO}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: currentVideoData.originalUrl,
                        title: currentVideoData.title,
                        format_id: selectedFormat.format_id
                    })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    if (errorData.errorReason && errorData.suggestion) {
                        errorMessage = errorData.errorReason;
                        suggestion = errorData.suggestion;
                    }
                }
            } catch (fetchError) {
                // 使用原始错误信息
            }
            
            const fullErrorMessage = suggestion ? 
                `${errorMessage}\n\n💡 建议: ${suggestion}` : 
                errorMessage;
                
            showError(`下载失败: ${fullErrorMessage}`);
            
            // 添加失败记录到历史
            addToHistory({
                title: currentVideoData.title,
                quality: selectedFormat.quality,
                format: selectedFormat.format,
                timestamp: new Date().toLocaleString('zh-CN'),
                status: 'failed',
                error: errorMessage
            });
            
            setTimeout(() => {
                hideProgress();
            }, 3000);
        }
    }

    // UI 辅助函数
    function showLoading(show) {
        if (loading) {
            loading.style.display = show ? 'block' : 'none';
        }
        if (parseBtn) {
            parseBtn.disabled = show;
            parseBtn.textContent = show ? '解析中...' : '解析视频';
        }
    }

    function showError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
            errorMessage.className = 'error-message show';
        }
        console.error('错误:', message);
    }

    function showSuccess(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
            errorMessage.className = 'success-message show';
        }
        console.log('成功:', message);
    }

    function showWarning(message) {
        if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
            errorMessage.className = 'warning-message show';
        }
        console.warn('警告:', message);
    }

    function hideError() {
        if (errorMessage) {
        errorMessage.style.display = 'none';
            errorMessage.className = 'error-message';
        }
    }

    function hideVideoInfo() {
        if (videoInfo) {
        videoInfo.style.display = 'none';
        }
        if (downloadBtn) {
            downloadBtn.disabled = true;
        }
        if (qualitySelect) {
            qualitySelect.innerHTML = '<option value="">请选择下载格式</option>';
        }
    }

    function showProgress() {
        if (progressContainer) {
            progressContainer.style.display = 'block';
        }
    }

    function hideProgress() {
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }

    function updateProgressBar(percentage) {
        if (progressBar) {
            progressBar.style.width = percentage + '%';
        }
    }

    function updateProgressText(text) {
        if (progressText) {
            progressText.textContent = text;
        }
    }

    // 历史记录功能
    function addToHistory(record) {
        let history = JSON.parse(localStorage.getItem('downloadHistory') || '[]');
        history.unshift(record);
        
        // 保持最多20条记录
        if (history.length > 20) {
            history = history.slice(0, 20);
        }
        
        localStorage.setItem('downloadHistory', JSON.stringify(history));
        loadDownloadHistory();
    }

    function loadDownloadHistory() {
        if (!historyList) return;
        
        const history = JSON.parse(localStorage.getItem('downloadHistory') || '[]');
        
        if (history.length === 0) {
            historyList.innerHTML = '<div class="no-history">暂无下载历史</div>';
            return;
        }
        
        const historyHTML = history.map(record => `
            <div class="history-item ${record.status}">
                <div class="history-title">${record.title}</div>
                <div class="history-details">
                    <span class="history-quality">${record.quality} ${record.format}</span>
                    <span class="history-time">${record.timestamp}</span>
                    <span class="history-status">${record.status === 'success' ? '✅' : '❌'}</span>
                </div>
                ${record.error ? `<div class="history-error">${record.error}</div>` : ''}
            </div>
        `).join('');
        
        historyList.innerHTML = historyHTML;
    }

    function clearDownloadHistory() {
        localStorage.removeItem('downloadHistory');
        loadDownloadHistory();
        showSuccess('历史记录已清除');
    }
});