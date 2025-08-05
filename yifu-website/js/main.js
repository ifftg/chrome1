// 主要JavaScript功能文件

document.addEventListener('DOMContentLoaded', function() {
    // 初始化页面功能
    initializeWebsite();
});

/**
 * 初始化网站功能
 */
function initializeWebsite() {
    // 绑定下载按钮事件
    bindDownloadEvents();
    
    // 初始化平滑滚动
    initializeSmoothScroll();
    
    // 初始化响应式导航
    initializeResponsiveNav();
    
    // 初始化动画效果
    initializeAnimations();
    
    console.log('易弗YouTube视频下载网站已初始化');
}

/**
 * 绑定下载相关事件
 */
function bindDownloadEvents() {
    // 主下载按钮
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadPlugin);
    }
    
    // 所有下载链接
    const downloadLinks = document.querySelectorAll('[onclick="downloadPlugin()"]');
    downloadLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            downloadPlugin();
        });
    });
}

/**
 * 下载插件功能
 */
function downloadPlugin() {
    // 创建下载链接
    const downloadUrl = createPluginDownloadUrl();
    
    // 创建临时下载链接
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'yifu-youtube-downloader.zip';
    link.style.display = 'none';
    
    // 添加到页面并触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 显示下载提示
    showDownloadNotification();
    
    // 统计下载次数（可选）
    trackDownload();
}

/**
 * 创建插件下载URL
 * 这里需要根据实际情况修改为真实的下载地址
 */
function createPluginDownloadUrl() {
    // 实际部署时，这里应该是插件压缩包的真实URL
    // 例如: 'https://yourdomain.com/downloads/yifu-youtube-downloader.zip'
    
    // 临时创建一个包含说明的文本文件作为演示
    const pluginInfo = `
易弗YouTube视频下载器

感谢您下载我们的Chrome插件！

安装步骤：
1. 解压此压缩包到任意文件夹
2. 打开Chrome浏览器，输入 chrome://extensions/
3. 打开右上角的"开发者模式"开关
4. 点击"加载已解压的扩展程序"
5. 选择解压后的插件文件夹
6. 安装完成，开始使用！

插件文件夹应包含以下文件：
- manifest.json (插件配置文件)
- popup.html (插件界面)
- popup.css (界面样式)
- popup.js (交互逻辑)
- background.js (后台服务)
- icons/ (图标文件夹)

注意事项：
- 本插件仅供学习和个人使用
- 请遵守相关法律法规和YouTube服务条款
- 如有问题请联系：iffcloud@163.com

© 2025 易弗的YouTube视频下载器
联系人: iff
邮箱: iffcloud@163.com
`;

    // 创建Blob并返回URL
    const blob = new Blob([pluginInfo], { type: 'text/plain' });
    return URL.createObjectURL(blob);
}

/**
 * 显示下载通知
 */
function showDownloadNotification() {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'download-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">✅</span>
            <span class="notification-text">插件下载已开始，请查看浏览器下载</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    // 添加样式
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 3秒后自动移除
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }
    }, 3000);
}

/**
 * 初始化平滑滚动
 */
function initializeSmoothScroll() {
    // 获取所有锚点链接
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

/**
 * 初始化响应式导航
 */
function initializeResponsiveNav() {
    // 创建移动端菜单按钮
    const nav = document.querySelector('.nav');
    const navMenu = document.querySelector('.nav-menu');
    
    if (nav && navMenu) {
        // 创建汉堡菜单按钮
        const menuToggle = document.createElement('button');
        menuToggle.className = 'menu-toggle';
        menuToggle.innerHTML = '☰';
        menuToggle.style.cssText = `
            display: none;
            background: none;
            border: none;
            font-size: 24px;
            color: white;
            cursor: pointer;
            padding: 10px;
        `;
        
        // 添加到导航容器
        const navContainer = document.querySelector('.nav-container');
        navContainer.appendChild(menuToggle);
        
        // 绑定点击事件
        menuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
        
        // 点击菜单项时关闭菜单
        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        });
    }
}

/**
 * 初始化动画效果
 */
function initializeAnimations() {
    // 添加滚动动画
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // 观察需要动画的元素
    const animateElements = document.querySelectorAll('.feature-card, .step, .hero-content');
    animateElements.forEach(el => {
        el.classList.add('animate-element');
        observer.observe(el);
    });
}

/**
 * 统计下载次数（可选功能）
 */
function trackDownload() {
    try {
        // 获取当前下载次数
        let downloadCount = localStorage.getItem('downloadCount') || 0;
        downloadCount = parseInt(downloadCount) + 1;
        
        // 保存新的下载次数
        localStorage.setItem('downloadCount', downloadCount);
        localStorage.setItem('lastDownload', new Date().toISOString());
        
        console.log(`插件下载次数: ${downloadCount}`);
    } catch (error) {
        console.log('无法统计下载次数:', error);
    }
}

/**
 * 工具函数：防抖
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 工具函数：节流
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 添加CSS动画样式
const animationStyles = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .animate-element {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.6s ease-out, transform 0.6s ease-out;
    }
    
    .animate-element.animate-in {
        opacity: 1;
        transform: translateY(0);
    }
    
    .download-notification {
        animation: slideIn 0.3s ease-out;
    }
    
    @media (max-width: 768px) {
        .menu-toggle {
            display: block !important;
        }
        
        .nav-menu {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.95);
            flex-direction: column;
            padding: 20px;
        }
        
        .nav-menu.active {
            display: flex;
        }
        
        .nav-link {
            padding: 10px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
    }
`;

// 将样式添加到页面
const styleSheet = document.createElement('style');
styleSheet.textContent = animationStyles;
document.head.appendChild(styleSheet);