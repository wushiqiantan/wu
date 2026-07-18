/**
 * Image Studio
 * 效果图与表达工作室 —— 提示词模板、方案生成、出图画板、景观叙事
 */

const imageStudio = {
    currentPrompt: '',
    selectedStyle: [],
    gallery: [],
    board: [],
    templates: {
        birdseye: {
            name: '鸟瞰图',
            prompt: 'Aerial view of a modern landscape park, master plan perspective, lush green trees, winding pathways, water features, sustainable design, photorealistic rendering, golden hour lighting, architectural visualization style, highly detailed, 8k quality',
            negative: 'blurry, low quality, distorted, people, cars, messy, chaotic'
        },
        perspective: {
            name: '人视效果图',
            prompt: 'Eye-level perspective of a contemporary landscape design, people walking on paved pathways, ornamental planting beds, outdoor seating areas, ambient lighting, natural materials, photorealistic, architectural photography style, soft daylight',
            negative: 'fish eye, distorted, overexposed, underexposed, blurry'
        },
        section: {
            name: '剖面图',
            prompt: 'Landscape architecture section drawing, showing soil layers, root systems, drainage, underground utilities, plant cross-sections, technical illustration style, clean linework, labeled',
            negative: 'perspective, 3d, realistic, blurry'
        },
        detail: {
            name: '节点详图',
            prompt: 'Landscape detail design, close-up of paving pattern and planting arrangement, material texture, water feature detail, architectural drawing style, precise, annotated',
            negative: 'wide angle, aerial, blurry, low detail'
        },
        night: {
            name: '夜景图',
            prompt: 'Night view of landscape architecture, dramatic lighting design, LED path lights, illuminated water feature, ambient glow, architectural visualization, moody atmosphere, stars in sky',
            negative: 'daylight, overexposed, blurry, people'
        },
        plant: {
            name: '植物配置图',
            prompt: 'Planting plan illustration, botanical illustration style, various tree species, shrubs, ground cover, labeled with latin names, color coded zones, professional landscape drawing',
            negative: 'perspective, 3d render, blurry, unlabeled'
        },
        material: {
            name: '材质铺装图',
            prompt: 'Material and paving pattern design, top-down view, stone tiles, wooden decking, gravel paths, grass pavers, texture mapping, architectural presentation style, clean and organized',
            negative: 'perspective, blurry, low resolution, messy'
        }
    },

    init() {
        this.loadTemplate();
        this.loadNarrative();
        this.updateGameProgress();
        this.initVoiceRecognition();
    },

    // ═══════════════════════════════════════════════════════
    // 语音输入功能 (Web Speech API)
    // ═══════════════════════════════════════════════════════
    voiceRecognition: null,
    isRecording: false,

    initVoiceRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('浏览器不支持语音识别');
            return;
        }
        this.voiceRecognition = new SpeechRecognition();
        this.voiceRecognition.lang = 'zh-CN';
        this.voiceRecognition.continuous = true;
        this.voiceRecognition.interimResults = true;

        this.voiceRecognition.onresult = (event) => {
            const textarea = document.getElementById('img-prompt-positive');
            if (!textarea) return;
            let finalTranscript = '';
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            // 追加到现有文本
            const currentText = textarea.value;
            if (finalTranscript) {
                textarea.value = currentText + (currentText ? ' ' : '') + finalTranscript;
            }
            // 显示临时文本
            const statusEl = document.getElementById('voice-status-positive');
            if (statusEl) {
                statusEl.innerHTML = `<span class="live-dot"></span> 正在聆听... ${interimTranscript || '说出你的设计想法'}`;
            }
        };

        this.voiceRecognition.onerror = (event) => {
            console.error('语音识别错误:', event.error);
            this.stopVoiceRecording();
            if (event.error === 'not-allowed') {
                showToast('请允许麦克风权限以使用语音输入', 'warning');
            } else if (event.error === 'no-speech') {
                showToast('没有检测到语音，请重试', 'warning');
            } else {
                showToast('语音识别出错，请重试', 'warning');
            }
        };

        this.voiceRecognition.onend = () => {
            if (this.isRecording) {
                // 如果还在录音状态，自动重启（保持连续）
                try { this.voiceRecognition.start(); } catch (e) {}
            } else {
                this.stopVoiceRecording();
            }
        };
    },

    toggleVoiceInput(target) {
        if (!this.voiceRecognition) {
            showToast('当前浏览器不支持语音识别，请使用 Chrome/Edge/Safari', 'warning');
            return;
        }
        if (this.isRecording) {
            this.stopVoiceRecording();
        } else {
            this.startVoiceRecording(target);
        }
    },

    startVoiceRecording(target) {
        this.isRecording = true;
        const btn = document.getElementById('voice-btn-' + target);
        const status = document.getElementById('voice-status-' + target);
        if (btn) btn.classList.add('recording');
        if (status) {
            status.style.display = 'flex';
            status.innerHTML = '<span class="live-dot"></span> 正在聆听... 说出你的设计想法';
        }
        showToast('🎙️ 语音输入已开启，请说话', 'info');
        try {
            this.voiceRecognition.start();
        } catch (e) {
            // 可能已经在运行，先停止再开始
            try {
                this.voiceRecognition.stop();
                setTimeout(() => this.voiceRecognition.start(), 200);
            } catch (e2) {}
        }
    },

    stopVoiceRecording() {
        this.isRecording = false;
        const btn = document.getElementById('voice-btn-positive');
        const status = document.getElementById('voice-status-positive');
        if (btn) btn.classList.remove('recording');
        if (status) {
            status.style.display = 'none';
        }
        try {
            this.voiceRecognition.stop();
        } catch (e) {}
        showToast('✅ 语音输入已停止，请在文本框中修改确认', 'success');
    },

    // ═══════════════════════════════════════════════════════
    // 景观叙事功能
    // ═══════════════════════════════════════════════════════
    loadNarrative() {
        try {
            const saved = localStorage.getItem('imageStudio_narrative');
            if (saved) {
                const nar = JSON.parse(saved);
                const storyEl = document.getElementById('img-nar-story');
                const conceptEl = document.getElementById('img-nar-concept');
                const expEl = document.getElementById('img-nar-experience');
                const futureEl = document.getElementById('img-nar-future');
                if (storyEl) storyEl.value = nar.story || '';
                if (conceptEl) conceptEl.value = nar.concept || '';
                if (expEl) expEl.value = nar.experience || '';
                if (futureEl) futureEl.value = nar.future || '';
                // 自动勾选叙事完成
                const scNar = document.getElementById('sc-narrative');
                if (scNar && nar.story) scNar.checked = true;
            }
        } catch (e) { console.warn('叙事加载失败', e); }
    },

    onNarrativeChange() {
        // 实时保存到临时存储
        const nar = {
            story: document.getElementById('img-nar-story')?.value || '',
            concept: document.getElementById('img-nar-concept')?.value || '',
            experience: document.getElementById('img-nar-experience')?.value || '',
            future: document.getElementById('img-nar-future')?.value || ''
        };
        localStorage.setItem('imageStudio_narrative_temp', JSON.stringify(nar));
        // 如果有内容，自动勾选
        const scNar = document.getElementById('sc-narrative');
        if (scNar && nar.story) scNar.checked = true;
        this.updateGameProgress();
    },

    saveNarrative() {
        const nar = {
            story: document.getElementById('img-nar-story')?.value || '',
            concept: document.getElementById('img-nar-concept')?.value || '',
            experience: document.getElementById('img-nar-experience')?.value || '',
            future: document.getElementById('img-nar-future')?.value || ''
        };
        localStorage.setItem('imageStudio_narrative', JSON.stringify(nar));
        // 将叙事内容注入提示词
        const promptEl = document.getElementById('img-prompt-positive');
        if (promptEl && nar.concept) {
            const currentPrompt = promptEl.value;
            if (!currentPrompt.includes(nar.concept.substring(0, 20))) {
                promptEl.value = currentPrompt + '\n\n// 设计叙事参考：' + nar.concept.substring(0, 100);
            }
        }
        showToast('叙事已保存，并融入提示词！', 'success');
        this.updateGameProgress();
        this.updateMasterGuide('叙事保存成功！现在去调整提示词，让图像生成更贴合你的故事。');
    },

    async generateNarrativeByAI() {
        showToast('🤖 伍师正在帮你构思叙事...', 'info');
        await new Promise(r => setTimeout(r, 1500));
        const project = app.currentProject || { typeLabel: '别墅庭院设计' };
        const aiStory = `这片土地曾是一片被遗忘的角落，直到设计赋予它新的生命。以"归隐"为核心，一方静水倒映天光云影，几块老山石诉说着岁月的故事。`;
        const aiConcept = `以"自然生长"为设计主线，通过空间层次的递进营造情绪节奏。核心策略：保留（Retain）— 转化（Transform）— 生长（Grow）。`;
        const aiExperience = `入口以密植形成"城市屏风"，隔绝喧嚣；转折处以一株造型松点亮视线；核心水景区采用"无边际"处理，人在此处自然放慢脚步。`;
        const aiFuture = `第一年骨架植物确立空间结构；第三年中层植物丰满，季相变化显现；第五年地被自然蔓延，景观进入"自我演化"阶段。`;

        const storyEl = document.getElementById('img-nar-story');
        const conceptEl = document.getElementById('img-nar-concept');
        const expEl = document.getElementById('img-nar-experience');
        const futureEl = document.getElementById('img-nar-future');
        if (storyEl) storyEl.value = aiStory;
        if (conceptEl) conceptEl.value = aiConcept;
        if (expEl) expEl.value = aiExperience;
        if (futureEl) futureEl.value = aiFuture;

        const scNar = document.getElementById('sc-narrative');
        if (scNar) scNar.checked = true;

        this.saveNarrative();
        showToast('✨ AI叙事生成完成！', 'success');
        this.updateMasterGuide('AI已经帮你写好了叙事框架。你可以在此基础上修改，让它更贴近你的真实想法。');
    },

    // ═══════════════════════════════════════════════════════
    // 游戏化逻辑
    // ═══════════════════════════════════════════════════════
    updateGameProgress() {
        let xp = 0;
        const guides = [];

        // 叙事进度
        const hasNarrative = !!document.getElementById('img-nar-story')?.value;
        if (hasNarrative) {
            xp += 25;
            guides.push('叙事');
        }

        // 提示词进度
        const hasPrompt = !!document.getElementById('img-prompt-positive')?.value;
        if (hasPrompt && hasPrompt.length > 50) {
            xp += 25;
            guides.push('提示词');
        }

        // 风格选择
        if (this.selectedStyle.length > 0) {
            xp += 15;
            guides.push('风格');
        }

        // 图像生成
        if (this.gallery.length > 0) {
            xp += 20;
            guides.push('生成');
        }

        // 画板确认
        if (this.board.length > 0) {
            xp += 15;
            guides.push('画板');
        }

        xp = Math.min(xp, 100);

        const bar = document.getElementById('img-xp-bar');
        const text = document.getElementById('img-xp-text');
        if (bar) bar.style.width = xp + '%';
        if (text) {
            const lv = xp >= 80 ? 'Lv.4 大师' : xp >= 60 ? 'Lv.3 高手' : xp >= 40 ? 'Lv.2 进阶' : 'Lv.1 新手';
            text.textContent = `效果图与表达 ${lv}`;
        }

        // 更新伍师引导
        if (guides.length === 0) {
            this.updateMasterGuide('先写故事，再出图。图是故事的视觉翻译。');
        } else if (guides.length === 1) {
            this.updateMasterGuide('故事有了雏形，继续完善其他部分，让叙事更完整。');
        } else if (guides.length === 2) {
            this.updateMasterGuide('叙事和提示词都准备好了，可以去生成图像试试效果。');
        } else if (guides.length >= 3 && this.gallery.length === 0) {
            this.updateMasterGuide('一切就绪！点击"批量生成"，让AI把你的故事变成图像。');
        } else if (this.gallery.length > 0 && this.board.length === 0) {
            this.updateMasterGuide('图出来了！点击方案上的"+"号，把最满意的放进画板。');
        } else if (this.board.length > 0) {
            this.updateMasterGuide('画板已确认！可以导出使用了。你的设计故事已经完整了。');
        }
    },

    updateMasterGuide(text) {
        const el = document.getElementById('img-master-guide');
        if (el && el.textContent !== text) {
            el.style.opacity = '0';
            setTimeout(() => { el.textContent = text; el.style.opacity = '1'; el.style.transition = 'opacity .3s'; }, 150);
        }
    },

    loadTemplate() {
        const type = document.getElementById('img-type-select')?.value || 'birdseye';
        const template = this.templates[type];
        if (template) {
            document.getElementById('img-prompt-positive').value = template.prompt;
            document.getElementById('img-prompt-negative').value = template.negative;
        }
    },

    onTypeChange() {
        this.loadTemplate();
    },

    toggleStyle(el) {
        const isActive = el.dataset.active === 'true';
        if (isActive) {
            el.style.background = 'rgba(255,255,255,.04)';
            el.style.borderColor = 'rgba(10,8,0,.2)';
            el.style.color = 'rgba(250,240,208,.5)';
            el.dataset.active = 'false';
            this.selectedStyle = this.selectedStyle.filter(s => s !== el.textContent);
        } else {
            el.style.background = 'rgba(232,160,32,.12)';
            el.style.borderColor = 'rgba(232,160,32,.3)';
            el.style.color = 'var(--sun)';
            el.dataset.active = 'true';
            this.selectedStyle.push(el.textContent);
        }
    },

    savePrompt() {
        showToast('提示词已保存', 'success');
    },

    confirmAndGenerate() {
        const checkboxes = document.querySelectorAll('#self-check-list input[type="checkbox"]:checked');
        const expertReview = document.getElementById('expert-review-check')?.checked;

        if (checkboxes.length < 2) {
            showToast('请至少完成2项自检', 'warning');
            return;
        }

        if (expertReview) {
            showToast('已提交专家审核，审核通过后自动生图', 'info');
            // 模拟审核流程
            setTimeout(() => {
                showToast('专家审核通过！开始生成图像', 'success');
                this.generateBatch();
            }, 2000);
        } else {
            this.generateBatch();
        }
    },

    async generateBatch() {
        const prompt = document.getElementById('img-prompt-positive').value;
        const count = 4;

        if (!prompt.trim()) {
            showToast('提示词不能为空', 'warning');
            return;
        }

        showToast(`正在调用 GPT Image2 生成 ${count} 张方案图...`, 'info');

        const gallery = document.getElementById('image-gallery');
        gallery.innerHTML = `
            <div class="img-t" style="grid-column:span 2">
                <div class="img-placeholder">
                    <div style="width:40px;height:40px;border:4px solid rgba(255,255,255,.1);border-top-color:var(--sun);border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 12px"></div>
                    <p style="font-size:13px;color:rgba(250,240,208,.4)">GPT Image2 生成中，约需 10-20 秒...</p>
                </div>
            </div>`;

        try {
            const images = await callImageAPI(prompt, count, '1024x1024', 'medium');
            gallery.innerHTML = '';
            this.gallery = [];

            images.forEach((img, i) => {
                const imgData = {
                    id: 'img_' + Date.now() + '_' + i,
                    prompt: img.revised_prompt,
                    b64: img.b64_json,
                    url: img.url,
                    selected: false,
                    placeholder: false
                };
                this.gallery.push(imgData);
                this.renderGalleryItem(imgData, gallery);
            });

            showToast(`${count} 张方案图生成完成！`, 'success');
            this.updateGameProgress();
        } catch (err) {
            console.error(err);
            showToast('图像生成失败: ' + err.message, 'error');
            gallery.innerHTML = `
                <div class="img-t" style="grid-column:span 2">
                    <div class="img-placeholder">
                        <p style="font-size:13px;color:var(--bloom);font-weight:600">生成失败</p>
                        <p style="font-size:12px;color:rgba(250,240,208,.4);margin-top:4px">${err.message}</p>
                        <button onclick="imageStudio.generateBatch()" style="margin-top:10px;font-size:12px;background:rgba(196,40,48,.15);border:1px solid rgba(196,40,48,.3);color:var(--bloom);padding:5px 14px;border-radius:8px;cursor:pointer;font-family:inherit">重试</button>
                    </div>
                </div>`;
        }
    },

    createPlaceholderImage(index, prompt) {
        // 创建Canvas占位图（模拟AI生成）
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 384;
        const ctx = canvas.canvas?.getContext ? null : null;

        return {
            id: 'img_' + Date.now() + '_' + index,
            prompt: prompt,
            seed: Math.floor(Math.random() * 1000000),
            style: this.selectedStyle.join(', '),
            selected: false,
            // 在实际部署时，这里会是真实的图片URL
            placeholder: true
        };
    },

    renderGalleryItem(imgData, container) {
        const div = document.createElement('div');
        div.className = 'img-t';
        div.dataset.id = imgData.id;

        const imgContent = imgData.url
            ? `<img src="${imgData.url}" alt="方案图" style="width:100%;height:100%;object-fit:cover">`
            : `<div class="img-placeholder"><div style="font-size:28px;margin-bottom:6px">🎨</div><p style="font-size:11px">方案 ${this.gallery.length}</p><p style="font-size:10px;color:rgba(250,240,208,.25);margin-top:2px">Seed: ${imgData.seed}</p></div>`;

        div.innerHTML = `
            ${imgContent}
            <div style="position:absolute;top:6px;right:6px;opacity:0;transition:opacity .15s" class="img-hover-btn">
                <button onclick="event.stopPropagation(); imageStudio.addToBoard('${imgData.id}')" style="width:28px;height:28px;border-radius:50%;background:var(--sun-m);border:none;color:var(--cream);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.3)">＋</button>
            </div>
            <div style="position:absolute;bottom:0;left:0;right:0;padding:8px;opacity:0;transition:opacity .15s;background:linear-gradient(transparent,rgba(0,0,0,.5))" class="img-hover-btn">
                <button onclick="event.stopPropagation(); imageStudio.iterateImage('${imgData.id}')" style="font-size:11px;padding:4px 10px;border-radius:6px;background:rgba(255,255,255,.15);border:none;color:var(--cream);cursor:pointer;font-family:inherit;backdrop-filter:blur(4px)">迭代优化</button>
            </div>
        `;
        div.onmouseenter = () => div.querySelectorAll('.img-hover-btn').forEach(b => b.style.opacity = '1');
        div.onmouseleave = () => div.querySelectorAll('.img-hover-btn').forEach(b => b.style.opacity = '0');
        div.onclick = () => this.selectImage(imgData.id, div);
        container.appendChild(div);
    },

    selectImage(id, el) {
        const img = this.gallery.find(i => i.id === id);
        if (!img) return;

        img.selected = !img.selected;
        if (img.selected) {
            el.style.borderColor = 'var(--sun)';
            el.style.borderWidth = '2.5px';
            el.classList.add('sel');
        } else {
            el.style.borderColor = 'rgba(212,148,58,.2)';
            el.style.borderWidth = '1.5px';
            el.classList.remove('sel');
        }

        const count = this.gallery.filter(i => i.selected).length;
        document.getElementById('selected-count').textContent = count;
    },

    addToBoard(id) {
        const img = this.gallery.find(i => i.id === id);
        if (!img) return;

        this.board.push(img);
        this.renderBoard();
        this.updateGameProgress();
        showToast('已添加到出图画板', 'success');
    },

    renderBoard() {
        const container = document.getElementById('output-board');
        if (this.board.length === 0) {
            container.innerHTML = `
                <div class="img-t" style="grid-column:span 2">
                    <div class="img-placeholder">
                        <p style="font-size:13px;color:rgba(250,240,208,.3)">从上方选择一张方案放入画板</p>
                    </div>
                </div>`;
            return;
        }

        container.innerHTML = this.board.map((img, idx) => {
            const imgContent = img.url
                ? `<img src="${img.url}" alt="画板${idx + 1}" style="width:100%;height:100%;object-fit:cover">`
                : `<div style="display:flex;align-items:center;justify-content:center;height:100%"><p style="color:rgba(250,240,208,.3);font-size:13px">画板 ${idx + 1}</p></div>`;

            return `
                <div class="img-t" style="position:relative">
                    ${imgContent}
                    <button onclick="imageStudio.removeFromBoard(${idx})" style="position:absolute;top:6px;right:6px;width:24px;height:24px;border-radius:6px;background:rgba(196,40,48,.7);border:none;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:12px;opacity:0;transition:opacity .15s"
                            onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0'">✕</button>
                </div>
            `;
        }).join('');
    },

    removeFromBoard(index) {
        this.board.splice(index, 1);
        this.renderBoard();
    },

    iterateImage(id) {
        showToast('正在基于选定方案迭代优化...', 'info');
        setTimeout(() => {
            showToast('迭代完成！新方案已添加到画廊', 'success');
            this.generateBatch(); // 简化为重新生成
        }, 2000);
    },

    uploadReference() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            if (e.target.files.length > 0) {
                showToast(`已上传参考图: ${e.target.files[0].name}`, 'success');
            }
        };
        input.click();
    },

    clearGallery() {
        this.gallery = [];
        document.getElementById('image-gallery').innerHTML = `
            <div class="img-t" style="grid-column:span 2">
                <div class="img-placeholder">
                    <div style="font-size:32px;margin-bottom:8px">🎨</div>
                    <p style="font-size:13px">点击"批量生成"开始</p>
                </div>
            </div>`;
        document.getElementById('selected-count').textContent = '0';
    },

    exportBoard() {
        if (this.board.length === 0) {
            showToast('画板为空，请先添加方案', 'warning');
            return;
        }
        // 下载第一张到画板的图片
        const img = this.board[0];
        if (img.url) {
            const a = document.createElement('a');
            a.href = img.url;
            a.download = `方案_${app.currentProject?.name || '景观设计'}_${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showToast('图片已下载', 'success');
        } else {
            showToast(`导出画板：${this.board.length} 张方案图`, 'success');
        }
    }
};
