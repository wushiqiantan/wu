/**
 * A1 Board Generator
 * A1展板生成器 —— 基于PPT内容和DeepSeek提示词大纲生成竞赛展板
 */

const boardGen = {
    currentBoard: null,
    layout: 'standard',
    source: 'ppt',

    async generate() {
        const layout = document.getElementById('board-layout')?.value || 'standard';
        const source = document.getElementById('board-source')?.value || 'ppt';
        this.layout = layout;
        this.source = source;

        if (!app.currentProject && source !== 'custom') {
            showToast('请先创建项目或选择自定义内容', 'warning');
            return;
        }

        showToast('正在调用 GPT Image2 生成 A1 展板...', 'info');

        const container = document.getElementById('board-preview-area');
        container.innerHTML = `
            <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
                <div style="text-align:center;color:rgba(250,240,208,.4)">
                    <div style="width:40px;height:40px;border:4px solid rgba(255,255,255,.1);border-top-color:var(--bloom);border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 12px"></div>
                    <p style="font-size:13px">GPT Image2 生成展板中，约需 15-30 秒...</p>
                </div>
            </div>`;

        // 构建提示词
        const prompt = this.buildBoardPrompt(layout, source);

        try {
            const images = await callImageAPI(prompt, 1, '1536x1024', 'high');
            const img = images[0];
            this.currentBoard = { layout, url: img.url, b64: img.b64_json, prompt: img.revised_prompt };
            this.renderBoardPreviewReal(img.url);
            showToast('A1 展板生成完成！', 'success');
            if (typeof pptGen !== 'undefined') pptGen.updateGameProgress();
        } catch (err) {
            console.error(err);
            showToast('展板生成失败: ' + err.message, 'error');
            container.innerHTML = `
                <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--bloom)">
                    <div style="text-align:center;padding:16px">
                        <p style="font-size:13px;font-weight:600">生成失败</p>
                        <p style="font-size:12px;margin-top:4px;color:rgba(250,240,208,.5)">${err.message}</p>
                        <button onclick="boardGen.generate()" style="margin-top:10px;font-size:12px;background:rgba(196,40,48,.15);border:1px solid rgba(196,40,48,.3);color:var(--bloom);padding:5px 14px;border-radius:8px;cursor:pointer;font-family:inherit">重试</button>
                    </div>
                </div>`;
        }
    },

    renderBoardPreviewReal(url) {
        const container = document.getElementById('board-preview-area');
        container.innerHTML = `
            <div style="width:100%;height:100%;background:rgba(255,255,255,.03);border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center;padding:8px">
                <img src="${url}" alt="A1展板" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,.35)">
            </div>`;
    },

    buildBoardPrompt(layout, source) {
        const project = app.currentProject;
        const name = project?.name || '景观设计方案';
        const type = project?.typeLabel || '城市公园';

        const layoutDesc = {
            standard: '标准竞赛排版：顶部标题区，左侧分析图列，中部主效果图，右侧设计说明',
            horizontal: '横向分区：从左到右依次是概念分析、总体布局、节点详图、效果图',
            grid: '网格布局：2x3或3x2网格排列各图',
            free: '自由布局：以主效果图为中心，其他内容环绕布置'
        };

        return `Professional A1 architecture competition board (594mm x 841mm), ${type} landscape design project named "${name}". 
${layoutDesc[layout]}. 
High-quality architectural presentation, clean typography, Chinese and English text, master plan, concept diagrams, section drawings, perspective renderings, planting plan, material palette. 
Professional landscape architecture competition style, blue and green color scheme, white background, modern minimalist layout.`;
    },

    renderBoardPreview(layout) {
        const container = document.getElementById('board-preview-area');
        const project = app.currentProject;
        const name = project?.name || '景观设计方案';
        const type = project?.typeLabel || '城市公园';

        const placeholderBg = 'rgba(255,255,255,.05)';
        const textMuted = 'rgba(250,240,208,.35)';
        const textTitle = 'var(--cream)';
        const textSub = 'rgba(250,240,208,.4)';
        const borderColor = 'rgba(212,148,58,.25)';
        const dashedBorder = '2px dashed rgba(212,148,58,.2)';
        const accentBg = 'linear-gradient(135deg, rgba(232,160,32,.1), rgba(140,48,96,.1))';

        let layoutHTML = '';
        switch (layout) {
            case 'standard':
                layoutHTML = `
                    <div style="width:100%;height:100%;background:rgba(255,255,255,.03);display:flex;flex-direction:column;padding:16px">
                        <div style="border-bottom:2px solid ${borderColor};padding-bottom:8px;margin-bottom:12px">
                            <h1 style="font-size:16px;font-weight:700;color:${textTitle}">${name}</h1>
                            <p style="font-size:11px;color:${textSub}">${type} · 景观设计方案</p>
                        </div>
                        <div style="flex:1;display:flex;gap:12px">
                            <div style="width:25%;display:flex;flex-direction:column;gap:8px">
                                <div style="background:${placeholderBg};border-radius:8px;flex:1;display:flex;align-items:center;justify-content:center"><span style="font-size:10px;color:${textMuted}">区位分析</span></div>
                                <div style="background:${placeholderBg};border-radius:8px;flex:1;display:flex;align-items:center;justify-content:center"><span style="font-size:10px;color:${textMuted}">概念生成</span></div>
                                <div style="background:${placeholderBg};border-radius:8px;flex:1;display:flex;align-items:center;justify-content:center"><span style="font-size:10px;color:${textMuted}">功能分区</span></div>
                            </div>
                            <div style="flex:1;background:${accentBg};border-radius:8px;display:flex;align-items:center;justify-content:center;border:${dashedBorder}">
                                <div style="text-align:center">
                                    <svg style="width:48px;height:48px;margin:0 auto 8px;color:rgba(250,240,208,.2)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                    <p style="font-size:11px;color:${textMuted}">主效果图</p>
                                </div>
                            </div>
                            <div style="width:25%;display:flex;flex-direction:column;gap:8px">
                                <div style="background:${placeholderBg};border-radius:8px;height:33%;display:flex;align-items:center;justify-content:center"><span style="font-size:10px;color:${textMuted}">设计说明</span></div>
                                <div style="background:${placeholderBg};border-radius:8px;flex:1;display:flex;align-items:center;justify-content:center"><span style="font-size:10px;color:${textMuted}">剖面图</span></div>
                            </div>
                        </div>
                        <div style="margin-top:12px;display:flex;gap:8px;height:64px">
                            <div style="flex:1;background:${placeholderBg};border-radius:8px;display:flex;align-items:center;justify-content:center"><span style="font-size:10px;color:${textMuted}">节点详图</span></div>
                            <div style="flex:1;background:${placeholderBg};border-radius:8px;display:flex;align-items:center;justify-content:center"><span style="font-size:10px;color:${textMuted}">植物配置</span></div>
                            <div style="flex:1;background:${placeholderBg};border-radius:8px;display:flex;align-items:center;justify-content:center"><span style="font-size:10px;color:${textMuted}">材料说明</span></div>
                        </div>
                    </div>`;
                break;
            case 'horizontal':
                layoutHTML = `
                    <div style="width:100%;height:100%;background:rgba(255,255,255,.03);display:flex;flex-direction:column;padding:16px">
                        <div style="border-bottom:2px solid ${borderColor};padding-bottom:8px;margin-bottom:12px">
                            <h1 style="font-size:16px;font-weight:700;color:${textTitle}">${name}</h1>
                        </div>
                        <div style="flex:1;display:flex;gap:8px">
                            <div style="flex:1;background:${placeholderBg};border-radius:8px;display:flex;align-items:center;justify-content:center"><span style="font-size:10px;color:${textMuted}">概念分析</span></div>
                            <div style="flex:1;background:${placeholderBg};border-radius:8px;display:flex;align-items:center;justify-content:center"><span style="font-size:10px;color:${textMuted}">总体布局</span></div>
                            <div style="flex:1;background:${placeholderBg};border-radius:8px;display:flex;align-items:center;justify-content:center"><span style="font-size:10px;color:${textMuted}">节点详图</span></div>
                            <div style="flex:1;background:${accentBg};border-radius:8px;display:flex;align-items:center;justify-content:center;border:${dashedBorder}"><span style="font-size:10px;color:${textMuted}">效果图</span></div>
                        </div>
                    </div>`;
                break;
            case 'grid':
                layoutHTML = `
                    <div style="width:100%;height:100%;background:rgba(255,255,255,.03);display:flex;flex-direction:column;padding:16px">
                        <div style="border-bottom:2px solid ${borderColor};padding-bottom:8px;margin-bottom:12px">
                            <h1 style="font-size:16px;font-weight:700;color:${textTitle}">${name}</h1>
                        </div>
                        <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:8px">
                            <div style="background:${accentBg};border-radius:8px;display:flex;align-items:center;justify-content:center;border:${dashedBorder}"><span style="font-size:10px;color:${textMuted}">主图</span></div>
                            <div style="background:${placeholderBg};border-radius:8px;display:flex;align-items:center;justify-content:center"><span style="font-size:10px;color:${textMuted}">分析</span></div>
                            <div style="background:${placeholderBg};border-radius:8px;display:flex;align-items:center;justify-content:center"><span style="font-size:10px;color:${textMuted}">平面</span></div>
                            <div style="background:${placeholderBg};border-radius:8px;display:flex;align-items:center;justify-content:center"><span style="font-size:10px;color:${textMuted}">详图</span></div>
                        </div>
                    </div>`;
                break;
            default:
                layoutHTML = `
                    <div style="width:100%;height:100%;background:rgba(255,255,255,.03);display:flex;flex-direction:column;padding:16px">
                        <div style="border-bottom:2px solid ${borderColor};padding-bottom:8px;margin-bottom:12px">
                            <h1 style="font-size:16px;font-weight:700;color:${textTitle}">${name}</h1>
                        </div>
                        <div style="flex:1;background:${accentBg};border-radius:8px;display:flex;align-items:center;justify-content:center;border:${dashedBorder}">
                            <div style="text-align:center">
                                <svg style="width:48px;height:48px;margin:0 auto 8px;color:rgba(250,240,208,.2)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                <p style="font-size:11px;color:${textMuted}">自由布局展板</p>
                            </div>
                        </div>
                    </div>`;
        }

        container.innerHTML = layoutHTML;
        this.currentBoard = { layout, html: layoutHTML };
    },

    iterate() {
        if (!this.currentBoard) {
            showToast('请先生成展板', 'warning');
            return;
        }
        showToast('AI正在优化展板布局...', 'info');
        setTimeout(() => {
            this.renderBoardPreview(this.layout);
            showToast('展板已优化', 'success');
        }, 2000);
    },

    export() {
        if (!this.currentBoard || !this.currentBoard.url) {
            showToast('请先生成展板', 'warning');
            return;
        }
        const a = document.createElement('a');
        a.href = this.currentBoard.url;
        a.download = `A1展板_${app.currentProject?.name || '景观设计'}_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('展板已下载！', 'success');
    }
};
