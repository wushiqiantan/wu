/**
 * PPT Generator
 * PPT生成器 —— 大纲生成、幻灯片预览、迭代编辑
 */

const pptGen = {
    currentSlide: 0,
    totalSlides: 0,
    slides: [],
    selectedStyle: 'academic',
    outline: '',

    // 预设幻灯片模板
    slideTemplates: {
        academic: [
            { type: 'title', title: '项目概况', content: '基于AI分析的设计策略与方案' },
            { type: 'content', title: '场地分析', content: '区位分析 · 现状条件 · SWOT评估' },
            { type: 'content', title: '设计理念', content: '核心概念 · 设计目标 · 策略框架' },
            { type: 'content', title: '总体布局', content: '功能分区 · 交通组织 · 空间结构' },
            { type: 'image', title: '方案效果图', content: '鸟瞰图 · 人视效果图' },
            { type: 'content', title: '节点设计', content: '重点空间详细设计说明' },
            { type: 'content', title: '植物配置', content: '植被规划 · 季相变化 · 生态策略' },
            { type: 'content', title: '技术措施', content: '海绵城市 · 材料选择 · 可持续设计' },
            { type: 'content', title: '实施计划', content: '分期建设 · 投资估算 · 维护管理' },
            { type: 'end', title: '谢谢', content: 'Questions & Discussion' }
        ]
    },

    init() {
        this.loadNarrative();
        this.updateGameProgress();
    },

    // ═══════════════════════════════════════════════════════
    // 叙事素材同步
    // ═══════════════════════════════════════════════════════
    loadNarrative() {
        try {
            const saved = localStorage.getItem('imageStudio_narrative');
            const container = document.getElementById('ppt-narrative-content');
            if (!container) return;

            if (saved) {
                const nar = JSON.parse(saved);
                if (nar.story || nar.concept) {
                    container.innerHTML = `
                        <div style="display:flex;flex-direction:column;gap:8px">
                            <div style="padding:8px 10px;background:rgba(255,255,255,.03);border-radius:6px;border-left:2px solid var(--bloom-l)">
                                <div style="font-size:10px;color:rgba(250,240,208,.4);margin-bottom:2px">📍 场地故事</div>
                                <div style="font-size:11px;color:var(--cream);line-height:1.5">${(nar.story || '').substring(0, 80)}${(nar.story || '').length > 80 ? '...' : ''}</div>
                            </div>
                            <div style="padding:8px 10px;background:rgba(255,255,255,.03);border-radius:6px;border-left:2px solid var(--sea-l)">
                                <div style="font-size:10px;color:rgba(250,240,208,.4);margin-bottom:2px">💡 设计理念</div>
                                <div style="font-size:11px;color:var(--cream);line-height:1.5">${(nar.concept || '').substring(0, 80)}${(nar.concept || '').length > 80 ? '...' : ''}</div>
                            </div>
                            <div style="padding:8px 10px;background:rgba(255,255,255,.03);border-radius:6px;border-left:2px solid var(--sun-l)">
                                <div style="font-size:10px;color:rgba(250,240,208,.4);margin-bottom:2px">🚶 空间体验</div>
                                <div style="font-size:11px;color:var(--cream);line-height:1.5">${(nar.experience || '').substring(0, 80)}${(nar.experience || '').length > 80 ? '...' : ''}</div>
                            </div>
                            <div style="padding:8px 10px;background:rgba(255,255,255,.03);border-radius:6px;border-left:2px solid var(--palm-l)">
                                <div style="font-size:10px;color:rgba(250,240,208,.4);margin-bottom:2px">🔮 未来愿景</div>
                                <div style="font-size:11px;color:var(--cream);line-height:1.5">${(nar.future || '').substring(0, 80)}${(nar.future || '').length > 80 ? '...' : ''}</div>
                            </div>
                        </div>
                    `;
                    this.updateMasterGuide('叙事素材已同步！PPT的内容会围绕你的设计故事展开。');
                    return;
                }
            }
            container.innerHTML = `
                <div style="padding:12px;text-align:center;color:rgba(250,240,208,.3)">
                    <div style="font-size:24px;margin-bottom:8px">📖</div>
                    <p>先去「效果图与表达」页面完成景观叙事</p>
                    <p style="font-size:11px;margin-top:4px">叙事内容会自动同步到这里</p>
                </div>
            `;
        } catch (e) { console.warn('叙事加载失败', e); }
    },

    // ═══════════════════════════════════════════════════════
    // 游戏化逻辑
    // ═══════════════════════════════════════════════════════
    updateGameProgress() {
        let xp = 0;
        const guides = [];

        // 叙事素材
        const hasNarrative = !!localStorage.getItem('imageStudio_narrative');
        if (hasNarrative) { xp += 20; guides.push('叙事'); }

        // PPT大纲
        if (this.outline && this.outline.length > 50) { xp += 30; guides.push('大纲'); }

        // 幻灯片
        if (this.slides.length > 0) { xp += 25; guides.push('幻灯片'); }

        // 风格选择
        if (this.selectedStyle !== 'academic') { xp += 10; guides.push('风格'); }

        // 导出
        const hasExported = localStorage.getItem('pptGen_exported') === 'true';
        if (hasExported) { xp += 15; guides.push('导出'); }

        xp = Math.min(xp, 100);

        const bar = document.getElementById('ppt-xp-bar');
        const text = document.getElementById('ppt-xp-text');
        if (bar) bar.style.width = xp + '%';
        if (text) {
            const lv = xp >= 80 ? 'Lv.4 大师' : xp >= 60 ? 'Lv.3 高手' : xp >= 40 ? 'Lv.2 进阶' : 'Lv.1 新手';
            text.textContent = `汇报工坊 ${lv}`;
        }

        if (guides.length === 0) {
            this.updateMasterGuide('好设计需要好汇报。PPT讲逻辑，展板抓眼球。');
        } else if (!hasNarrative) {
            this.updateMasterGuide('先去「效果图与表达」页面写好叙事，汇报会更有说服力。');
        } else if (this.slides.length === 0) {
            this.updateMasterGuide('叙事素材已就位！点击生成大纲，让AI帮你组织汇报逻辑。');
        } else if (!hasExported) {
            this.updateMasterGuide('PPT已经生成了！可以逐页预览、调整，满意后导出。');
        } else {
            this.updateMasterGuide('汇报材料全部完成！去生成A1展板，让视觉冲击力拉满。');
        }
    },

    updateMasterGuide(text) {
        const el = document.getElementById('ppt-master-guide');
        if (el && el.textContent !== text) {
            el.style.opacity = '0';
            setTimeout(() => { el.textContent = text; el.style.opacity = '1'; el.style.transition = 'opacity .3s'; }, 150);
        }
    },

    async generateOutline() {
        const type = document.getElementById('ppt-type')?.value || 'competition';
        const pages = parseInt(document.getElementById('ppt-pages')?.value || '15');
        const contentArea = document.getElementById('ppt-content');

        const project = app.currentProject;
        const projectName = project?.name || '景观设计项目';
        const projectType = project?.typeLabel || '城市公园';
        const summary = project?.summary || '';

        const typeMap = {
            competition: '竞赛汇报',
            academic: '学术汇报',
            client: '客户汇报',
            review: '课程答辩'
        };

        const systemPrompt = `你是一位资深的景观/建筑设计汇报专家，擅长将设计方案组织成逻辑清晰、重点突出的PPT大纲。
请根据项目信息和设计方案概览，生成一份专业的PPT汇报大纲。
要求：
1. 用中文输出
2. 大纲层级清晰：一级标题为章节，二级为内容要点
3. 每页PPT的内容要点要具体，不要泛泛而谈
4. 总页数控制在用户要求的范围内
5. 如果是竞赛汇报，突出设计亮点和创新点；如果是学术汇报，突出研究方法和理论框架；如果是客户汇报，突出投资回报和落地性`;

        const userPrompt = `项目名称：${projectName}\n项目类型：${projectType}\n汇报类型：${typeMap[type]}\n要求页数：${pages}页\n\n设计方案概览：\n${summary || '暂无详细方案，请基于项目类型生成通用大纲'}\n\n请生成PPT汇报大纲，格式为 Markdown 列表。`;

        let outline = '';

        // 第1步：尝试 Kimi
        try {
            showToast('Kimi 正在生成PPT大纲...', 'info');
            outline = await callAI('kimi', [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ], { temperature: 0.7, max_tokens: 3000 });
            showToast('Kimi 大纲生成成功！', 'success');
            this.updateGameProgress();
        } catch (kimiErr) {
            console.warn('Kimi 调用失败:', kimiErr);
            showToast('Kimi 调用失败，尝试 DeepSeek...', 'warning');

            // 第2步：fallback 到 DeepSeek
            try {
                outline = await callAI('deepseek', [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ], { temperature: 0.7, max_tokens: 3000 });
                showToast('DeepSeek 大纲生成成功！', 'success');
            this.updateGameProgress();
            } catch (dsErr) {
                console.error('DeepSeek 也失败了:', dsErr);
                showToast('所有API调用失败，使用本地模板', 'error');
                outline = this.buildOutlineFallback(projectName, projectType, type, pages);
            }
        }

        this.outline = outline;
        this.slides = this.generateSlidesFromOutline(outline, pages);
        this.totalSlides = this.slides.length;

        contentArea.value = outline;
        this.renderSlidePreview();
    },

    buildOutlineFallback(name, type, reportType, pages) {
        return this.buildOutline(name, type, reportType, pages);
    },

    buildOutline(name, type, reportType, pages) {
        const typeMap = {
            competition: '竞赛汇报',
            academic: '学术汇报',
            client: '客户汇报',
            review: '课程答辩'
        };

        return `【${name}】${typeMap[reportType]}大纲\n\n` +
            `一、项目背景与场地认知\n` +
            `  1.1 项目区位与上位规划\n` +
            `  1.2 场地现状分析\n` +
            `  1.3 核心问题识别\n\n` +
            `二、设计策略与理念\n` +
            `  2.1 设计理念提出\n` +
            `  2.2 设计目标与原则\n` +
            `  2.3 概念生成逻辑\n\n` +
            `三、总体设计方案\n` +
            `  3.1 功能分区与空间组织\n` +
            `  3.2 交通系统规划\n` +
            `  3.3 景观结构分析\n\n` +
            `四、重点节点设计\n` +
            `  4.1 主入口空间\n` +
            `  4.2 核心景观区\n` +
            `  4.3 休闲活动区\n\n` +
            `五、专项设计\n` +
            `  5.1 植物景观设计\n` +
            `  5.2 铺装与材料\n` +
            `  5.3 夜景与照明\n\n` +
            `六、技术经济与实施\n` +
            `  6.1 海绵城市措施\n` +
            `  6.2 投资估算\n` +
            `  6.3 分期实施计划\n\n` +
            `七、总结与展望\n`;
    },

    generateSlidesFromOutline(outline, pages) {
        // 基于大纲生成幻灯片数据
        const baseSlides = this.slideTemplates.academic;
        const slides = [];

        // 标题页
        slides.push({
            type: 'title',
            title: app.currentProject?.name || '景观设计方案',
            subtitle: app.currentProject?.typeLabel || '城市公园设计',
            style: this.selectedStyle
        });

        // 内容页
        const sections = outline.split(/\n[一二三四五六七]、/);
        sections.forEach((section, idx) => {
            if (!section.trim() || idx === 0) return;
            const lines = section.split('\n').filter(l => l.trim());
            const title = lines[0]?.replace(/[\s\d.]+/g, '').trim() || '内容页';
            const content = lines.slice(1).map(l => l.replace(/^\s*[\d.]+\s*/, '').trim()).filter(Boolean);

            slides.push({
                type: 'content',
                title: title,
                bullets: content,
                style: this.selectedStyle
            });
        });

        // 效果图页
        slides.push({
            type: 'image',
            title: '方案效果图',
            subtitle: '鸟瞰图 + 人视效果图',
            style: this.selectedStyle
        });

        // 结尾页
        slides.push({
            type: 'end',
            title: '谢谢',
            subtitle: 'Thank You',
            style: this.selectedStyle
        });

        return slides;
    },

    renderSlidePreview() {
        const indicator = document.getElementById('slide-indicator');
        const content = document.getElementById('ppt-slide-content');

        if (this.slides.length === 0) return;

        indicator.textContent = `${this.currentSlide + 1} / ${this.slides.length}`;
        const slide = this.slides[this.currentSlide];

        // 油画色彩风格配置
        const styleColors = {
            academic: {
                bg: 'linear-gradient(135deg, rgba(27,74,10,.35), rgba(10,59,110,.25))',
                accent: 'var(--palm-l)',
                title: 'var(--cream)',
                bullet: 'var(--palm-f)',
                border: 'rgba(59,122,26,.35)'
            },
            minimal: {
                bg: 'linear-gradient(135deg, rgba(42,42,42,.4), rgba(10,8,0,.5))',
                accent: 'rgba(250,240,208,.5)',
                title: 'var(--cream)',
                bullet: 'rgba(250,240,208,.6)',
                border: 'rgba(250,240,208,.15)'
            },
            creative: {
                bg: 'linear-gradient(135deg, rgba(140,48,96,.35), rgba(74,16,80,.3))',
                accent: 'var(--dusk-l)',
                title: 'var(--cream)',
                bullet: 'var(--dusk-f)',
                border: 'rgba(180,88,144,.35)'
            },
            business: {
                bg: 'linear-gradient(135deg, rgba(10,59,110,.35), rgba(20,100,160,.25))',
                accent: 'var(--sea-l)',
                title: 'var(--cream)',
                bullet: 'var(--sea-f)',
                border: 'rgba(58,159,212,.35)'
            }
        };
        const sc = styleColors[slide.style] || styleColors.academic;
        const textMuted = 'rgba(250,240,208,.45)';
        const textBody = 'rgba(250,240,208,.75)';
        const textSub = 'rgba(250,240,208,.35)';

        let html = '';
        switch (slide.type) {
            case 'title':
                html = `
                    <div style="width:100%;height:100%;background:${sc.bg};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px;text-align:center;">
                        <div style="font-size:56px;margin-bottom:20px">${app.getTypeEmoji ? app.getTypeEmoji(app.currentProject?.type) : '🌳'}</div>
                        <h1 style="font-size:28px;font-weight:700;color:${sc.title};margin-bottom:12px">${slide.title}</h1>
                        <p style="font-size:16px;color:${textMuted}">${slide.subtitle || ''}</p>
                        <div style="margin-top:28px;width:80px;height:3px;background:linear-gradient(90deg,var(--sun-m),var(--sun));border-radius:3px"></div>
                    </div>`;
                break;
            case 'content':
                html = `
                    <div style="width:100%;height:100%;background:${sc.bg};display:flex;flex-direction:column;padding:36px;">
                        <h2 style="font-size:22px;font-weight:700;color:${sc.title};margin-bottom:18px;padding-bottom:10px;border-bottom:2px solid ${sc.border}">${slide.title}</h2>
                        <div style="flex:1;overflow-y:auto;">
                            ${(slide.bullets || []).map(b => `
                                <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px">
                                    <div style="width:7px;height:7px;background:${sc.bullet};border-radius:50%;margin-top:7px;flex-shrink:0"></div>
                                    <p style="color:${textBody};font-size:13px;line-height:1.7">${b}</p>
                                </div>
                            `).join('') || `<p style="color:${textSub}">此处将显示AI生成的详细内容</p>`}
                        </div>
                        <div style="text-align:right;font-size:11px;color:${textSub};margin-top:12px">${this.currentSlide + 1} / ${this.slides.length}</div>
                    </div>`;
                break;
            case 'image':
                html = `
                    <div style="width:100%;height:100%;background:${sc.bg};display:flex;flex-direction:column;padding:36px;">
                        <h2 style="font-size:22px;font-weight:700;color:${sc.title};margin-bottom:14px">${slide.title}</h2>
                        <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:12px">
                            <div style="background:rgba(255,255,255,.05);border-radius:12px;display:flex;align-items:center;justify-content:center;border:2px dashed rgba(212,148,58,.2)">
                                <div style="text-align:center;color:${textSub}">
                                    <svg style="width:40px;height:40px;margin:0 auto 8px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                    <p style="font-size:12px">鸟瞰图占位</p>
                                </div>
                            </div>
                            <div style="background:rgba(255,255,255,.05);border-radius:12px;display:flex;align-items:center;justify-content:center;border:2px dashed rgba(212,148,58,.2)">
                                <div style="text-align:center;color:${textSub}">
                                    <svg style="width:40px;height:40px;margin:0 auto 8px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                    <p style="font-size:12px">人视图占位</p>
                                </div>
                            </div>
                        </div>
                    </div>`;
                break;
            case 'end':
                html = `
                    <div style="width:100%;height:100%;background:${sc.bg};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px;text-align:center;">
                        <h1 style="font-size:36px;font-weight:700;color:${sc.title};margin-bottom:12px">${slide.title}</h1>
                        <p style="font-size:18px;color:${textMuted}">${slide.subtitle || ''}</p>
                        <div style="margin-top:28px;display:flex;gap:8px">
                            <div style="width:10px;height:10px;background:var(--palm-l);border-radius:50%"></div>
                            <div style="width:10px;height:10px;background:var(--sun);border-radius:50%"></div>
                            <div style="width:10px;height:10px;background:var(--dusk-l);border-radius:50%"></div>
                        </div>
                    </div>`;
                break;
            default:
                html = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:${textSub}">幻灯片内容</div>`;
        }

        content.innerHTML = html;
    },

    prevSlide() {
        if (this.currentSlide > 0) {
            this.currentSlide--;
            this.renderSlidePreview();
        }
    },

    nextSlide() {
        if (this.currentSlide < this.slides.length - 1) {
            this.currentSlide++;
            this.renderSlidePreview();
        }
    },

    selectStyle(el, style) {
        document.querySelectorAll('.style-card').forEach(card => {
            card.classList.remove('on');
        });
        el.classList.add('on');
        this.selectedStyle = style;

        // 更新所有幻灯片风格
        this.slides.forEach(s => s.style = style);
        this.renderSlidePreview();
    },

    iterateSlide() {
        if (this.slides.length === 0) return;
        showToast('AI正在优化当前幻灯片内容...', 'info');
        setTimeout(() => {
            const slide = this.slides[this.currentSlide];
            if (slide.bullets) {
                slide.bullets = slide.bullets.map(b => b + '（已优化）');
            }
            this.renderSlidePreview();
            showToast('幻灯片内容已优化', 'success');
        }, 1500);
    },

    editSlide() {
        showToast('进入手动编辑模式（演示：实际部署时弹出富文本编辑器）', 'info');
    },

    exportPPT() {
        if (this.slides.length === 0) {
            showToast('请先生成PPT大纲', 'warning');
            return;
        }
        showToast('正在导出PPT文件...', 'info');
        setTimeout(() => {
            showToast(`PPT导出完成！共 ${this.slides.length} 页`, 'success');
            localStorage.setItem('pptGen_exported', 'true');
            this.updateGameProgress();
        }, 1500);
    },

    uploadReferencePPT() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.ppt,.pptx';
        input.onchange = (e) => {
            if (e.target.files.length > 0) {
                showToast(`已上传参考PPT: ${e.target.files[0].name}`, 'success');
            }
        };
        input.click();
    }
};
