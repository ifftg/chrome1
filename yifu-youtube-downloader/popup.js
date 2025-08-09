/**
 * 易弗YouTube视频下载器 - 专业版
 * 架构重构版本 - 前端直接下载，后端仅负责解析
 * 
 * 核心架构改进：
 * 1. 下载逻辑完全移至前端，使用 chrome.downloads API
 * 2. 后端仅负责视频信息解析
 * 3. 智能格式过滤和排序
 * 4. 自定义下载目录功能
 * 5. 完善的UI状态反馈和进度跟踪
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('=== 易弗YouTube下载器 专业版 v2.0 启动 ===');
    
    // API配置
    const API_CONFIG = {
        BASE_URL: 'http://localhost:3000',
        ENDPOINTS: {
            PARSE_VIDEO: '/api/parse-video',
            CHECK_STATUS: '/api/test',
            CHECK_YTDLP: '/api/check-ytdlp'
        }
    };
    
    // 全局状态管理
    const STATE = {
        currentVideoData: null,
        isDownloading: false,
        customDownloadDir: null,
        downloadId: null
    };
    
    // 获取页面元素
    const elements = {
        urlInput: document.getElementById('urlInput'),
        parseBtn: document.getElementById('parseBtn'),
        downloadBtn: document.getElementById('downloadBtn'),
        errorMessage: document.getElementById('errorMessage'),
        loading: document.getElementById('loading'),
        videoInfo: document.getElementById('videoInfo'),
        qualitySelect: document.getElementById('qualitySelect'),
        progressContainer: document.getElementById('progressContainer'),
        progressBar: document.getElementById('progressBar'),
        progressText: document.getElementById('progressText'),
        historyList: document.getElementById('historyList'),
        clearHistoryBtn: document.getElementById('clearHistoryBtn'),
        setDownloadDirBtn: document.getElementById('setDownloadDirBtn'),
        currentDownloadDir: document.getElementById('currentDownloadDir')
    };

    // 验证关键元素
    console.log('核心元素检查:');
    Object.entries(elements).forEach(([key, element]) => {
        console.log(`- ${key}:`, !!element);
    });

    // 初始化应用
    init();

    /**
     * 应用初始化
     */
    async function init() {
        console.log('开始初始化应用...');
        
        try {
            // 检查后端服务状态
            await checkBackendStatus();
            
            // 设置事件监听器
            setupEventListeners();
            
            // 加载历史记录
            loadDownloadHistory();
            
            // 加载用户设置
            await loadUserSettings();
            
            console.log('✅ 应用初始化完成');
        } catch (error) {
            console.error('❌ 初始化失败:', error);
            showError('应用初始化失败，请刷新重试');
        }
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
                showSuccess('后端服务连接成功！', 2000);
                
                // 检查yt-dlp状态
                await checkYtDlpStatus();
            } else {
                throw new Error('后端服务响应异常');
            }
        } catch (error) {
            console.error('❌ 后端服务连接失败:', error);
            showError('后端服务连接失败，请确保后端服务器已启动 (http://localhost:3000)');
            throw error;
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
                showWarning('yt-dlp不可用，可能影响视频解析');
            }
        } catch (error) {
            console.warn('⚠️ 无法检查yt-dlp状态:', error);
        }
    }

    /**
     * 设置事件监听器
     */
    function setupEventListeners() {
        console.log('设置事件监听器...');
        
        // 解析按钮事件
        elements.parseBtn?.addEventListener('click', handleParseVideo);
        
        // 下载按钮事件
        elements.downloadBtn?.addEventListener('click', handleDownloadVideo);
        
        // 设置下载目录按钮
        elements.setDownloadDirBtn?.addEventListener('click', handleSetDownloadDir);
        
        // 清除历史按钮
        elements.clearHistoryBtn?.addEventListener('click', clearDownloadHistory);
        
        // URL输入框回车事件
        elements.urlInput?.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleParseVideo();
            }
        });
        
        // 格式选择器变化事件
        elements.qualitySelect?.addEventListener('change', handleFormatSelection);
        
        // 监听Chrome下载事件
        if (chrome.downloads) {
            chrome.downloads.onChanged.addListener(handleDownloadProgress);
        }
        
        console.log('✅ 事件监听器设置完成');
    }

    /**
     * 处理视频解析
     */
    async function handleParseVideo() {
        const url = elements.urlInput.value.trim();
        
        if (!url) {
            showError('请输入YouTube视频URL');
            return;
        }

        // YouTube URL验证
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

        try {
            // 通过background script解析视频
            console.log('📤 向background发送解析请求');
            
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
                console.log('✅ 视频解析成功:', response.data.title);
                
                STATE.currentVideoData = response.data;
                STATE.currentVideoData.originalUrl = url;
                
                displayVideoInfo(STATE.currentVideoData);
                showSuccess('视频信息解析成功！', 3000);
            } else {
                throw new Error(response.error || '解析失败');
            }
            
        } catch (error) {
            console.error('❌ 解析失败:', error);
            showError(`解析失败: ${error.message}`);
        } finally {
            showLoading(false);
        }
    }

    /**
     * 显示视频信息并填充格式选择器
     */
    function displayVideoInfo(videoData) {
        if (!elements.videoInfo) return;

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
                        <span class="meta-value professional">🎯 专业版解析</span>
                    </div>
                </div>
                <div class="video-description">
                    <p>${videoData.description}</p>
                </div>
            </div>
            
            <div style="padding: 15px;">
                <select id="qualitySelect" style="width: 100%; padding: 10px; margin-bottom: 15px;">
                    <option value="">请选择下载格式</option>
                </select>
                
                <button id="downloadBtn" class="download-btn" disabled>下载视频</button>
                
                <div id="progressContainer" class="progress-container" style="display: none;">
                    <div class="progress-bar">
                        <div id="progressBar" class="progress-fill"></div>
                    </div>
                    <span id="progressText">准备下载...</span>
                </div>
            </div>
        `;

        elements.videoInfo.innerHTML = infoHTML;
        elements.videoInfo.style.display = 'block';

        // 重新获取动态创建的元素
        const newQualitySelect = document.getElementById('qualitySelect');
        const newDownloadBtn = document.getElementById('downloadBtn');

        // 更新elements引用
        elements.qualitySelect = newQualitySelect;
        elements.downloadBtn = newDownloadBtn;
        elements.progressContainer = document.getElementById('progressContainer');
        elements.progressBar = document.getElementById('progressBar');
        elements.progressText = document.getElementById('progressText');

        // 填充格式选择器（优化版）
        populateQualitySelectOptimized(videoData.formats);

        // 重新绑定事件监听器
        newDownloadBtn?.addEventListener('click', handleDownloadVideo);
        newQualitySelect?.addEventListener('change', handleFormatSelection);
    }

    /**
     * 优化的格式选择器填充 - 过滤和排序
     */
    function populateQualitySelectOptimized(formats) {
        console.log('🔧 开始智能填充格式选择器');
        console.log(`📊 原始格式数量: ${formats ? formats.length : 0}`);
        
        if (!elements.qualitySelect) {
            console.error('❌ 找不到qualitySelect元素');
            return;
        }

        elements.qualitySelect.innerHTML = '<option value="">请选择下载格式</option>';

        if (!formats || formats.length === 0) {
            console.warn('⚠️ 没有可用的格式数据');
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '暂无可用格式';
            option.disabled = true;
            elements.qualitySelect.appendChild(option);
            return;
        }

        // 智能过滤格式：只保留同时包含视频和音频的格式，且高度>=360p
        const filteredFormats = formats.filter(format => {
            const hasVideo = format.vcodec && format.vcodec !== 'none';
            const hasAudio = format.acodec && format.acodec !== 'none';
            const heightNum = parseInt(format.quality) || 0;
            const isGoodQuality = heightNum >= 360;
            
            return hasVideo && hasAudio && isGoodQuality;
        });

        console.log(`🎯 过滤后格式数量: ${filteredFormats.length}`);

        // 按高度从高到低排序
        filteredFormats.sort((a, b) => {
            const heightA = parseInt(a.quality) || 0;
            const heightB = parseInt(b.quality) || 0;
            return heightB - heightA;
        });

        // 添加过滤后的格式到选择器
        filteredFormats.forEach((format, index) => {
            const option = document.createElement('option');
            option.value = JSON.stringify(format);
            
            // 构建显示文本
            const qualityText = format.quality || '未知';
            const formatText = format.format || 'MP4';
            const sizeText = format.fileSize || '未知大小';
            const audioInfo = format.hasAudio ? '含音频' : '仅视频';
            
            option.textContent = `${qualityText} ${formatText} (${sizeText}) - ${audioInfo}`;
            
            // 标记推荐格式
            if (index === 0) {
                option.textContent = `✅ 推荐 - ${option.textContent}`;
            }
            
            elements.qualitySelect.appendChild(option);
            console.log(`✅ 已添加格式: ${option.textContent}`);
        });

        // 如果没有符合条件的格式，添加所有原始格式作为备选
        if (filteredFormats.length === 0) {
            console.warn('⚠️ 没有符合条件的格式，添加所有格式作为备选');
            
            formats.forEach(format => {
                const option = document.createElement('option');
                option.value = JSON.stringify(format);
                const audioInfo = format.hasAudio ? '含音频' : '仅视频';
                option.textContent = `${format.quality} ${format.format} (${format.fileSize}) - ${audioInfo}`;
                elements.qualitySelect.appendChild(option);
            });
        }

        console.log(`🎉 格式选择器填充完成，共 ${elements.qualitySelect.options.length - 1} 个选项`);
    }

    /**
     * 处理格式选择变化
     */
    function handleFormatSelection() {
        const selectedValue = elements.qualitySelect?.value;
        console.log('格式选择变化:', selectedValue ? '已选择' : '未选择');
        
        if (elements.downloadBtn) {
            elements.downloadBtn.disabled = !selectedValue || selectedValue === '';
            console.log(`下载按钮状态: ${elements.downloadBtn.disabled ? '禁用' : '启用'}`);
        }
    }

    /**
     * 处理视频下载 - 使用Chrome Downloads API
     */
    async function handleDownloadVideo() {
        if (!STATE.currentVideoData) {
            showError('请先解析视频信息');
            return;
        }

        if (STATE.isDownloading) {
            showWarning('正在下载中，请等待当前下载完成');
            return;
        }

        const selectedValue = elements.qualitySelect?.value;
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

        console.log('🚀 开始前端直接下载:', STATE.currentVideoData.title);
        console.log('📋 选择格式:', selectedFormat);

        // 设置下载状态
        STATE.isDownloading = true;
        
        // 更新UI状态
        elements.downloadBtn.textContent = '下载中...';
        elements.downloadBtn.disabled = true;
        showProgress();
        updateProgressText('准备下载...');
        updateProgressBar(0);

        try {
            // 构建文件名（清理特殊字符）
            const cleanTitle = STATE.currentVideoData.title
                .replace(/[<>:"/\\|?*]/g, '_')
                .replace(/\s+/g, '_')
                .substring(0, 100); // 限制文件名长度
            
            const fileExtension = selectedFormat.format?.toLowerCase() || 'mp4';
            const fileName = `${cleanTitle}.${fileExtension}`;

            // 准备下载选项
            const downloadOptions = {
                url: selectedFormat.url,
                filename: fileName,
                saveAs: false, // 不显示另存为对话框，直接下载
                conflictAction: 'uniquify' // 如果文件存在，自动重命名
            };

            // 如果用户设置了自定义下载目录，添加到选项中
            if (STATE.customDownloadDir) {
                downloadOptions.filename = `${STATE.customDownloadDir}/${fileName}`;
            }

            console.log('📥 启动Chrome下载:', downloadOptions);

            // 使用Chrome Downloads API下载
            chrome.downloads.download(downloadOptions, (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.error('❌ 下载启动失败:', chrome.runtime.lastError);
                    handleDownloadError(new Error(chrome.runtime.lastError.message));
                } else {
                    console.log('✅ 下载已启动，ID:', downloadId);
                    STATE.downloadId = downloadId;
                    updateProgressText('正在下载...');
                    
                    // 添加到历史记录（下载中状态）
                    addToHistory({
                        title: STATE.currentVideoData.title,
                        quality: selectedFormat.quality,
                        format: selectedFormat.format,
                        timestamp: new Date().toLocaleString('zh-CN'),
                        status: 'downloading',
                        downloadId: downloadId
                    });
                }
            });

        } catch (error) {
            console.error('❌ 下载过程出错:', error);
            handleDownloadError(error);
        }
    }

    /**
     * 处理下载进度和状态变化
     */
    function handleDownloadProgress(delta) {
        if (!STATE.downloadId || delta.id !== STATE.downloadId) {
            return; // 不是当前下载任务
        }

        console.log('📊 下载状态变化:', delta);

        // 处理下载状态变化
        if (delta.state) {
            const newState = delta.state.current;
            console.log(`📈 下载状态: ${newState}`);

            switch (newState) {
                case 'in_progress':
                    updateProgressText('正在下载...');
                    break;
                    
                case 'complete':
                    console.log('✅ 下载完成！');
                    handleDownloadComplete();
                    break;
                    
                case 'interrupted':
                    console.error('❌ 下载中断:', delta.error);
                    handleDownloadError(new Error(`下载中断: ${delta.error?.current || '未知错误'}`));
                    break;
            }
        }

        // 处理下载进度
        if (delta.totalBytes && delta.bytesReceived) {
            const progress = (delta.bytesReceived.current / delta.totalBytes.current) * 100;
            updateProgressBar(progress);
            updateProgressText(`下载中... ${Math.round(progress)}%`);
        }
    }

    /**
     * 处理下载完成
     */
    function handleDownloadComplete() {
        console.log('🎉 下载任务完成');
        
        // 更新UI
        updateProgressBar(100);
        updateProgressText('下载完成！');
        showSuccess('视频下载成功！文件已保存到下载文件夹', 5000);
        
        // 更新历史记录状态
        updateHistoryStatus(STATE.downloadId, 'completed');
        
        // 重置状态
        setTimeout(() => {
            resetDownloadState();
        }, 3000);
    }

    /**
     * 处理下载错误
     */
    function handleDownloadError(error) {
        console.error('❌ 下载错误:', error);
        
        // 更新UI
        updateProgressText('下载失败');
        showError(`下载失败: ${error.message}`);
        
        // 更新历史记录状态
        if (STATE.downloadId) {
            updateHistoryStatus(STATE.downloadId, 'failed', error.message);
        }
        
        // 重置状态
        setTimeout(() => {
            resetDownloadState();
        }, 3000);
    }

    /**
     * 重置下载状态
     */
    function resetDownloadState() {
        STATE.isDownloading = false;
        STATE.downloadId = null;
        
        if (elements.downloadBtn) {
            elements.downloadBtn.textContent = '下载视频';
            elements.downloadBtn.disabled = !elements.qualitySelect?.value;
        }
        
        hideProgress();
    }

    /**
     * 处理设置下载目录
     */
    async function handleSetDownloadDir() {
        try {
            console.log('📁 用户请求设置下载目录');
            
            // 注意：Chrome Extension Manifest V3 中，fileSystem API 已被废弃
            // 我们需要使用其他方式或提示用户
            showInfo('自定义下载目录功能需要在Chrome设置中配置，当前将使用系统默认下载文件夹');
            
            // 可以考虑使用 chrome.storage 保存用户偏好的相对路径
            // 或引导用户到 Chrome 设置页面
            
        } catch (error) {
            console.error('❌ 设置下载目录失败:', error);
            showError('设置下载目录失败');
        }
    }

    /**
     * 加载用户设置
     */
    async function loadUserSettings() {
        try {
            const result = await chrome.storage.local.get(['customDownloadDir']);
            if (result.customDownloadDir) {
                STATE.customDownloadDir = result.customDownloadDir;
                if (elements.currentDownloadDir) {
                    elements.currentDownloadDir.textContent = `当前: ${result.customDownloadDir}`;
                }
                console.log('✅ 已加载自定义下载目录:', result.customDownloadDir);
            }
        } catch (error) {
            console.warn('⚠️ 加载用户设置失败:', error);
        }
    }

    // ============================================================================
    // UI 辅助函数
    // ============================================================================

    function showLoading(show) {
        if (elements.loading) {
            elements.loading.style.display = show ? 'block' : 'none';
        }
        if (elements.parseBtn) {
            elements.parseBtn.disabled = show;
            elements.parseBtn.textContent = show ? '解析中...' : '解析视频';
        }
    }

    function showError(message) {
        if (elements.errorMessage) {
            elements.errorMessage.textContent = message;
            elements.errorMessage.style.display = 'block';
            elements.errorMessage.className = 'error-message show';
        }
        console.error('❌ 错误:', message);
    }

    function showSuccess(message, duration = 3000) {
        if (elements.errorMessage) {
            elements.errorMessage.textContent = message;
            elements.errorMessage.style.display = 'block';
            elements.errorMessage.className = 'success-message show';
            
            if (duration > 0) {
                setTimeout(() => {
                    hideError();
                }, duration);
            }
        }
        console.log('✅ 成功:', message);
    }

    function showWarning(message) {
        if (elements.errorMessage) {
            elements.errorMessage.textContent = message;
            elements.errorMessage.style.display = 'block';
            elements.errorMessage.className = 'warning-message show';
        }
        console.warn('⚠️ 警告:', message);
    }

    function showInfo(message) {
        if (elements.errorMessage) {
            elements.errorMessage.textContent = message;
            elements.errorMessage.style.display = 'block';
            elements.errorMessage.className = 'info-message show';
        }
        console.info('ℹ️ 信息:', message);
    }

    function hideError() {
        if (elements.errorMessage) {
            elements.errorMessage.style.display = 'none';
            elements.errorMessage.className = 'error-message';
        }
    }

    function hideVideoInfo() {
        if (elements.videoInfo) {
            elements.videoInfo.style.display = 'none';
        }
        if (elements.downloadBtn) {
            elements.downloadBtn.disabled = true;
        }
        if (elements.qualitySelect) {
            elements.qualitySelect.innerHTML = '<option value="">请选择下载格式</option>';
        }
    }

    function showProgress() {
        if (elements.progressContainer) {
            elements.progressContainer.style.display = 'block';
        }
    }

    function hideProgress() {
        if (elements.progressContainer) {
            elements.progressContainer.style.display = 'none';
        }
    }

    function updateProgressBar(percentage) {
        if (elements.progressBar) {
            elements.progressBar.style.width = Math.max(0, Math.min(100, percentage)) + '%';
        }
    }

    function updateProgressText(text) {
        if (elements.progressText) {
            elements.progressText.textContent = text;
        }
    }

    // ============================================================================
    // 历史记录功能
    // ============================================================================

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

    function updateHistoryStatus(downloadId, status, error = null) {
        let history = JSON.parse(localStorage.getItem('downloadHistory') || '[]');
        
        const recordIndex = history.findIndex(record => record.downloadId === downloadId);
        if (recordIndex !== -1) {
            history[recordIndex].status = status;
            if (error) {
                history[recordIndex].error = error;
            }
            
            localStorage.setItem('downloadHistory', JSON.stringify(history));
            loadDownloadHistory();
        }
    }

    function loadDownloadHistory() {
        if (!elements.historyList) return;
        
        const history = JSON.parse(localStorage.getItem('downloadHistory') || '[]');
        
        if (history.length === 0) {
            elements.historyList.innerHTML = '<div class="no-history">暂无下载历史</div>';
            return;
        }
        
        const historyHTML = history.map(record => {
            const statusIcons = {
                'completed': '✅',
                'downloading': '⏳',
                'failed': '❌',
                'success': '✅' // 兼容旧记录
            };
            
            const statusTexts = {
                'completed': '已完成',
                'downloading': '下载中',
                'failed': '失败',
                'success': '成功' // 兼容旧记录
            };
            
            return `
                <div class="history-item ${record.status}">
                    <div class="history-title">${record.title}</div>
                    <div class="history-details">
                        <span class="history-quality">${record.quality} ${record.format}</span>
                        <span class="history-time">${record.timestamp}</span>
                        <span class="history-status">${statusIcons[record.status] || '❓'} ${statusTexts[record.status] || record.status}</span>
                    </div>
                    ${record.error ? `<div class="history-error">错误: ${record.error}</div>` : ''}
                </div>
            `;
        }).join('');
        
        elements.historyList.innerHTML = historyHTML;
    }

    function clearDownloadHistory() {
        localStorage.removeItem('downloadHistory');
        loadDownloadHistory();
        showSuccess('历史记录已清除', 2000);
    }

    console.log('✅ 易弗YouTube下载器专业版初始化完成');
});