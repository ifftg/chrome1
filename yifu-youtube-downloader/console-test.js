/**
 * 控制台测试脚本 - 测试YouTube下载功能
 * 在浏览器控制台中运行此脚本来测试下载功能
 */

// 测试配置
const TEST_CONFIG = {
    testUrl: 'https://www.youtube.com/watch?v=HiQul9_vmsc',
    timeout: 30000, // 30秒超时
    enableDetailedLogs: true
};

// 测试结果收集器
const TestResults = {
    startTime: null,
    results: [],
    
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] ${message}`;
        
        this.results.push({ timestamp, message, type });
        
        switch(type) {
            case 'error':
                console.error('❌ ' + logMessage);
                break;
            case 'success':
                console.log('✅ ' + logMessage);
                break;
            case 'warning':
                console.warn('⚠️ ' + logMessage);
                break;
            default:
                console.log('ℹ️ ' + logMessage);
        }
    },
    
    summary() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 测试总结报告');
        console.log('='.repeat(50));
        console.log(`测试开始时间: ${this.startTime}`);
        console.log(`测试结束时间: ${new Date().toLocaleTimeString()}`);
        console.log(`总共执行: ${this.results.length} 个步骤`);
        
        const errors = this.results.filter(r => r.type === 'error').length;
        const successes = this.results.filter(r => r.type === 'success').length;
        const warnings = this.results.filter(r => r.type === 'warning').length;
        
        console.log(`✅ 成功: ${successes} 个`);
        console.log(`⚠️ 警告: ${warnings} 个`);
        console.log(`❌ 错误: ${errors} 个`);
        
        if (errors === 0) {
            console.log('\n🎉 所有测试通过！下载功能正常工作。');
        } else {
            console.log('\n🚨 发现错误，需要修复。');
        }
        
        return {
            total: this.results.length,
            successes,
            warnings,
            errors,
            passed: errors === 0
        };
    }
};

// 主测试函数
async function testYouTubeDownloader() {
    TestResults.startTime = new Date().toLocaleTimeString();
    TestResults.log('开始测试YouTube下载器功能', 'info');
    TestResults.log(`测试视频URL: ${TEST_CONFIG.testUrl}`, 'info');
    
    try {
        // 步骤1: 检查解析器类是否存在
        TestResults.log('步骤1: 检查解析器类', 'info');
        if (typeof YouTubeParser === 'undefined') {
            TestResults.log('YouTubeParser类未定义，请确保youtube-parser.js已加载', 'error');
            return TestResults.summary();
        }
        TestResults.log('YouTubeParser类存在', 'success');
        
        // 步骤2: 创建解析器实例
        TestResults.log('步骤2: 创建解析器实例', 'info');
        let parser;
        try {
            parser = new YouTubeParser();
            TestResults.log('解析器实例创建成功', 'success');
        } catch (error) {
            TestResults.log(`解析器实例创建失败: ${error.message}`, 'error');
            return TestResults.summary();
        }
        
        // 步骤3: 验证URL格式
        TestResults.log('步骤3: 验证URL格式', 'info');
        const isValidUrl = parser.isValidYouTubeUrl ? parser.isValidYouTubeUrl(TEST_CONFIG.testUrl) : 
                          /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/.test(TEST_CONFIG.testUrl);
        
        if (!isValidUrl) {
            TestResults.log('URL格式验证失败', 'error');
            return TestResults.summary();
        }
        TestResults.log('URL格式验证通过', 'success');
        
        // 步骤4: 解析视频信息
        TestResults.log('步骤4: 解析视频信息（这可能需要几秒钟）', 'info');
        let videoData;
        try {
            const parsePromise = parser.parseVideo(TEST_CONFIG.testUrl);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('解析超时')), TEST_CONFIG.timeout)
            );
            
            videoData = await Promise.race([parsePromise, timeoutPromise]);
            TestResults.log(`视频解析成功: "${videoData.title}"`, 'success');
            TestResults.log(`找到 ${videoData.formats.length} 个格式选项`, 'info');
        } catch (error) {
            TestResults.log(`视频解析失败: ${error.message}`, 'error');
            return TestResults.summary();
        }
        
        // 步骤5: 检查格式数据
        TestResults.log('步骤5: 检查格式数据', 'info');
        if (!videoData.formats || videoData.formats.length === 0) {
            TestResults.log('未找到任何视频格式', 'error');
            return TestResults.summary();
        }
        
        // 分析格式类型
        const realFormats = videoData.formats.filter(f => f.type !== 'fallback');
        const fallbackFormats = videoData.formats.filter(f => f.type === 'fallback');
        
        TestResults.log(`真实格式: ${realFormats.length} 个`, realFormats.length > 0 ? 'success' : 'warning');
        TestResults.log(`备用格式: ${fallbackFormats.length} 个`, 'info');
        
        // 详细显示格式信息
        if (TEST_CONFIG.enableDetailedLogs) {
            TestResults.log('格式详情:', 'info');
            videoData.formats.forEach((format, index) => {
                const info = `  ${index + 1}. ${format.quality} ${format.format} (${format.fileSize}) - ${format.hasAudio ? '含音频' : '仅视频'}`;
                TestResults.log(info, 'info');
            });
        }
        
        // 步骤6: 测试下载链接可用性
        TestResults.log('步骤6: 测试下载链接可用性', 'info');
        let downloadableCount = 0;
        
        for (const format of realFormats.slice(0, 3)) { // 只测试前3个格式
            if (format.url && !format.url.includes('example.com')) {
                try {
                    // 简单的HEAD请求测试链接可用性
                    const response = await fetch(format.url, { method: 'HEAD' });
                    if (response.ok) {
                        downloadableCount++;
                        TestResults.log(`${format.quality} ${format.format} - 链接可用`, 'success');
                    } else {
                        TestResults.log(`${format.quality} ${format.format} - 链接不可用 (${response.status})`, 'warning');
                    }
                } catch (error) {
                    TestResults.log(`${format.quality} ${format.format} - 链接测试失败: ${error.message}`, 'warning');
                }
            } else {
                TestResults.log(`${format.quality} ${format.format} - 无有效下载链接`, 'warning');
            }
        }
        
        // 步骤7: 模拟下载测试
        TestResults.log('步骤7: 模拟下载测试', 'info');
        if (downloadableCount > 0) {
            TestResults.log(`发现 ${downloadableCount} 个可下载的格式`, 'success');
            
            // 选择一个最佳格式进行模拟下载测试
            const bestFormat = realFormats.find(f => f.hasAudio && f.url && !f.url.includes('example.com'));
            if (bestFormat) {
                TestResults.log(`推荐下载格式: ${bestFormat.quality} ${bestFormat.format} (${bestFormat.fileSize})`, 'success');
                
                // 模拟Chrome下载API调用
                if (typeof chrome !== 'undefined' && chrome.downloads) {
                    TestResults.log('Chrome下载API可用，可以进行真实下载', 'success');
                } else {
                    TestResults.log('Chrome下载API不可用（可能在非插件环境中测试）', 'warning');
                }
            } else {
                TestResults.log('未找到包含音频的可下载格式', 'warning');
            }
        } else {
            TestResults.log('未找到任何可下载的格式', 'error');
        }
        
        // 步骤8: 综合评估
        TestResults.log('步骤8: 综合评估', 'info');
        const canParse = !!videoData;
        const hasRealFormats = realFormats.length > 0;
        const hasDownloadableUrls = downloadableCount > 0;
        
        TestResults.log(`视频信息解析: ${canParse ? '✅ 成功' : '❌ 失败'}`, canParse ? 'success' : 'error');
        TestResults.log(`真实格式获取: ${hasRealFormats ? '✅ 成功' : '❌ 失败'}`, hasRealFormats ? 'success' : 'error');
        TestResults.log(`下载链接可用: ${hasDownloadableUrls ? '✅ 成功' : '❌ 失败'}`, hasDownloadableUrls ? 'success' : 'error');
        
        // 最终结论
        if (canParse && hasRealFormats && hasDownloadableUrls) {
            TestResults.log('🎉 下载功能完全可用！', 'success');
        } else if (canParse && hasRealFormats) {
            TestResults.log('⚠️ 解析功能正常，但下载链接可能有限制', 'warning');
        } else if (canParse) {
            TestResults.log('⚠️ 基础解析功能正常，但格式获取有问题', 'warning');
        } else {
            TestResults.log('❌ 核心功能存在问题，需要修复', 'error');
        }
        
    } catch (error) {
        TestResults.log(`测试过程中发生未预期的错误: ${error.message}`, 'error');
        console.error('详细错误信息:', error);
    }
    
    return TestResults.summary();
}

// 快速测试函数
function quickTest() {
    console.log('🚀 启动YouTube下载器快速测试...');
    console.log('测试视频: https://www.youtube.com/watch?v=HiQul9_vmsc');
    console.log('请稍等，测试进行中...\n');
    
    return testYouTubeDownloader();
}

// 导出测试函数
window.testYouTubeDownloader = testYouTubeDownloader;
window.quickTest = quickTest;

// 自动提示
console.log('📋 YouTube下载器测试工具已加载');
console.log('💡 使用方法:');
console.log('   quickTest() - 快速测试');
console.log('   testYouTubeDownloader() - 完整测试');
console.log('');
console.log('🎯 现在可以运行: quickTest()');