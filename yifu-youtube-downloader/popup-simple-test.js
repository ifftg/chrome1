// 简化版本的popup.js，用于测试基础功能

document.addEventListener('DOMContentLoaded', function() {
    console.log('=== 简化版本加载开始 ===');
    
    // 获取元素
    const parseBtn = document.getElementById('parseBtn');
    const urlInput = document.getElementById('urlInput');
    
    console.log('parseBtn存在:', !!parseBtn);
    console.log('urlInput存在:', !!urlInput);
    
    if (parseBtn) {
        parseBtn.addEventListener('click', function() {
            console.log('=== 按钮被点击 ===');
            
            if (urlInput) {
                const url = urlInput.value.trim();
                console.log('输入的URL:', url);
                
                if (url) {
                    console.log('开始处理URL:', url);
                    // 显示简单的成功消息
                    alert('按钮点击成功！URL: ' + url);
                } else {
                    console.log('URL为空');
                    alert('请输入URL');
                }
            } else {
                console.log('urlInput不存在');
                alert('输入框未找到');
            }
        });
        
        console.log('事件监听器绑定成功');
    } else {
        console.error('parseBtn不存在');
    }
    
    console.log('=== 简化版本加载完成 ===');
});