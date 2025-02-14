class PaperViewer {
    constructor(containerId, options = {}) {
        console.log('初始化 PaperViewer:', containerId, options);
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('找不到容器元素:', containerId);
            return;
        }
        this.options = {
            paperUrl: options.paperUrl || 'UniSim-paper.html',
            ...options
        };
        this.init();
    }

    init() {
        console.log('开始初始化 PaperViewer');
        // 创建基本结构
        this.container.className = 'paper-viewer-container';
        
        // 先创建 iframe 元素
        const iframe = document.createElement('iframe');
        iframe.className = 'paper-frame';
        iframe.frameBorder = '0';
        
        // 创建容器
        const container = document.createElement('div');
        container.className = 'paper-container';
        container.appendChild(iframe);
        
        this.container.appendChild(container);
        
        // 设置 src 属性（这样可以确保事件监听器已经设置好）
        setTimeout(() => {
            console.log('设置 iframe src');
            iframe.src = 'UniSim-paper.html';
        }, 0);

        // 初始化元素引用
        this.frame = this.container.querySelector('.paper-frame');
        console.log('frame 元素:', this.frame);

        // 绑定事件
        this.frame.addEventListener('load', () => {
            console.log('frame onload 触发');
            this.onFrameLoad();
        });

        // 添加高亮样式到 iframe
        this.frame.addEventListener('load', () => {
            console.log('添加高亮样式');
            const doc = this.frame.contentDocument;
            if (!doc) {
                console.error('无法访问 frame document');
                return;
            }
            const style = doc.createElement('style');
            style.textContent = `
                .highlight-text {
                    background-color: #fff3cd;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                .highlight-text:hover {
                    background-color: #ffe7a0;
                }
            `;
            doc.head.appendChild(style);
            console.log('高亮样式添加完成');
        });
    }

    highlightTexts(textArray) {
        try {
            console.log('开始高亮文本，数组长度:', textArray.length);
            const doc = this.frame.contentDocument || this.frame.contentWindow.document;
            if (!doc) {
                console.error('无法获取 iframe document');
                return;
            }
            const content = doc.body;
            console.log('获取到 body:', content ? '成功' : '失败');
            if (!content) return;

            textArray.forEach((textObj, index) => {
                // 清理文本，移除引号和多余空格
                const searchText = textObj.text.replace(/['"]/g, '').trim();
                console.log(`正在处理第 ${index + 1} 个文本:`, searchText);
                
                // 使用 TreeWalker 遍历文本节点
                const walker = doc.createTreeWalker(
                    content,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );

                let node;
                let found = false;
                while (node = walker.nextNode()) {
                    const nodeText = node.textContent.trim();
                    if (nodeText.includes(searchText)) {
                        console.log('找到匹配文本:', nodeText);
                        const span = doc.createElement('span');
                        span.className = 'highlight-text';
                        span.style.backgroundColor = textObj.color || '#fff3cd';
                        node.parentNode.insertBefore(span, node);
                        span.appendChild(node);
                        found = true;
                    }
                }
                if (!found) {
                    console.warn(`未找到第 ${index + 1} 个文本的匹配:`, searchText);
                }
            });
        } catch (e) {
            console.error('高亮文本时出错:', e.message, e.stack);
        }
    }

    onFrameLoad() {
    }
} 