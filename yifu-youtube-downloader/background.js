// Chrome扩展后台脚本 - 后端API集成版本
console.log('🎬 易弗YouTube下载器后台服务启动');

// API配置
const API_CONFIG = {
    BASE_URL: 'http://localhost:3000',
    ENDPOINTS: {
        PARSE_VIDEO: '/api/parse-video',
        DOWNLOAD_VIDEO: '/api/download-video',
        CHECK_STATUS: '/api/test'
    }
};

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📥 Background收到消息:', message);
    console.log('📤 发送方信息:', sender);
    
    if (!message || !message.action) {
        console.error('❌ 消息格式错误:', message);
        sendResponse({ success: false, error: '消息格式错误' });
        return false;
    }
    
    switch (message.action) {
        case 'parseVideo':
            console.log('🎯 处理解析视频请求');
            handleParseVideo(message.data, sendResponse);
            return true; // 保持异步连接
            
        case 'downloadVideo':
            console.log('🎯 处理下载视频请求');
            handleDownloadVideo(message.data, sendResponse);
            return true; // 保持异步连接
            
        case 'checkBackendStatus':
            console.log('🎯 处理后端状态检查请求');
            handleCheckBackendStatus(sendResponse);
            return true; // 保持异步连接
            
        default:
            console.warn('❌ 未知消息类型:', message.action);
            sendResponse({ success: false, error: '未知消息类型' });
            return false;
    }
});

/**
 * 处理视频解析请求
 */
async function handleParseVideo(data, sendResponse) {
    try {
        console.log('🔍 开始解析视频:', data.url);
        console.log('🌐 请求后端API:', `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PARSE_VIDEO}`);
        
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PARSE_VIDEO}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: data.url })
        });
        
        console.log('📊 后端响应状态:', response.status, response.statusText);
        const result = await response.json();
        console.log('📋 后端响应数据:', result);
        
        if (response.ok && result.status === 'success') {
            console.log('✅ 视频解析成功，准备发送响应到popup');
            console.log('🎯 Formats数据:', result.data.formats);
            
            const responseData = { 
                success: true, 
                data: result.data 
            };
            console.log('📤 发送给popup的响应:', responseData);
            sendResponse(responseData);
        } else {
            console.error('❌ 视频解析失败:', result.error);
            sendResponse({ 
                success: false, 
                error: result.error || '解析失败' 
            });
        }
        
    } catch (error) {
        console.error('❌ 解析请求失败:', error);
        console.error('🔍 错误详情:', error.message, error.stack);
        sendResponse({ 
            success: false, 
            error: '网络连接失败，请确保后端服务器已启动' 
        });
    }
}

/**
 * 处理视频下载请求
 */
async function handleDownloadVideo(data, sendResponse) {
    try {
        console.log('📥 开始下载视频:', data.title);
        
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DOWNLOAD_VIDEO}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: data.url,
                title: data.title,
                format_id: data.format_id
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ 下载请求成功');
            sendResponse({ 
                success: true, 
                message: '下载成功！文件已保存到后端服务器',
                progress: 100
            });
        } else {
            console.error('❌ 下载失败:', result.error);
            sendResponse({ 
                success: false, 
                error: result.error || '下载失败' 
            });
        }
        
    } catch (error) {
        console.error('❌ 下载请求失败:', error);
        sendResponse({ 
            success: false, 
            error: '网络连接失败，请确保后端服务器已启动' 
        });
    }
}

/**
 * 检查后端服务状态
 */
async function handleCheckBackendStatus(sendResponse) {
    try {
        console.log('🔍 检查后端服务状态...');
        
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHECK_STATUS}`);
        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ 后端服务正常');
            sendResponse({ 
                success: true, 
                status: 'connected',
                message: '后端服务连接正常',
                data: result
            });
        } else {
            console.warn('⚠️ 后端服务响应异常');
            sendResponse({ 
                success: false, 
                status: 'error',
                error: '后端服务响应异常' 
            });
        }
        
    } catch (error) {
        console.error('❌ 后端服务连接失败:', error);
        sendResponse({ 
            success: false, 
            status: 'disconnected',
            error: '后端服务连接失败，请确保服务器已启动 (http://localhost:3000)' 
        });
    }
}

// 监听安装事件
chrome.runtime.onInstalled.addListener((details) => {
    console.log('插件安装/更新:', details.reason);
    
    if (details.reason === 'install') {
        console.log('🎉 欢迎使用易弗YouTube下载器！');
        console.log('💡 请确保后端服务器已启动: http://localhost:3000');
    } else if (details.reason === 'update') {
        console.log('🔄 插件已更新到版本:', chrome.runtime.getManifest().version);
    }
});

// 监听扩展启动事件
chrome.runtime.onStartup.addListener(() => {
    console.log('🚀 Chrome扩展已启动');
    console.log('💡 请确保后端服务器已启动: http://localhost:3000');
});

// 错误处理
chrome.runtime.onSuspend.addListener(() => {
    console.log('⏸️ 扩展服务暂停');
});

console.log('✅ 后台脚本初始化完成');
console.log('🔗 后端API地址:', API_CONFIG.BASE_URL);