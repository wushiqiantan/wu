/**
 * 伍师设计通关游戏 — 像玩通关游戏一样完成景观设计
 * 新建项目：氛围确认 → 手绘平面图 → AI彩平 → CAD → SU模型 → 固定视角 → 效果图统一 → 交付
 * 改造项目：现状照片 → 生成总图 → 反推平面 → 多视角 → 精确CAD → 交付
 */

const gameWorkflow = {
    // ═══════════════════════════════════════════════════════
    // 游戏状态
    // ═══════════════════════════════════════════════════════
    gameMode: null,          // 'new' | 'renovation' | null
    currentLevel: 0,
    levelResults: {},        // 每关的完成数据
    achievements: [],        // 已解锁成就
    coins: 100,              // 游戏币（初始送100）
    expertUsed: {},          // 哪些关卡用了专家
    isLoading: false,

    // ═══════════════════════════════════════════════════════
    // 关卡定义：新建项目（8关）
    // ═══════════════════════════════════════════════════════
    newLevels: [
        {
            id: 'atmosphere', title: '第1关：氛围确认', icon: '🎨', color: '#C4680A',
            masterGuide: '徒弟好！新项目第一步，先定氛围。就像画画前先调色调，景观设计也要先确定整体感觉。选一个最贴近甲方心意的风格吧！',
            task: '选择项目风格氛围',
            expertCost: 30,
            expertText: '伍师帮你分析各风格优缺点，推荐最适合项目定位的氛围方向。'
        },
        {
            id: 'sketch', title: '第2关：手绘平面图', icon: '✏️', color: '#D4943A',
            masterGuide: '氛围定了！现在手绘平面布局。别担心画工，草图就行，重点是把空间关系、动线、功能分区表达清楚。上传你的手绘图！',
            task: '上传手绘平面草图',
            expertCost: 50,
            expertText: '伍师点评你的平面布局，指出动线问题和空间优化建议。'
        },
        {
            id: 'colorplan', title: '第3关：AI彩平', icon: '🌈', color: '#3B7A1A',
            masterGuide: '手绘不错！现在让AI把手绘变成彩色平面图。这一步会填充植物、铺装、水体，让平面活起来。',
            task: 'AI生成彩色平面图',
            expertCost: 40,
            expertText: '伍师调整配色方案，确保植物季相和铺装纹理协调。'
        },
        {
            id: 'cad', title: '第4关：CAD精确图纸', icon: '📐', color: '#1464A0',
            masterGuide: '彩平过了！现在要精确尺寸了。CAD图纸是施工的基础，尺寸必须准。AI会帮你把彩平转成带尺寸的CAD线稿。',
            task: '生成精确CAD图纸',
            expertCost: 60,
            expertText: '伍师审核尺寸精度，标注规范，确保图纸可施工。'
        },
        {
            id: 'sumodel', title: '第5关：SU模型', icon: '🏗️', color: '#6A4C93',
            masterGuide: 'CAD有了！升维到3D。SketchUp模型让甲方能"走进"设计里看。AI会根据CAD生成基础体块模型。',
            task: '生成SU三维模型',
            expertCost: 50,
            expertText: '伍师优化模型细节，调整材质和植物高度。'
        },
        {
            id: 'viewpoint', title: '第6关：固定视角', icon: '📷', color: '#8C3060',
            masterGuide: '模型建好了！选一个最能展示设计亮点的角度，固定下来截图。这个视角后面会用来统一所有效果图。',
            task: '导出固定视角截图',
            expertCost: 30,
            expertText: '伍师推荐最佳展示角度，确保构图专业。'
        },
        {
            id: 'render', title: '第7关：效果图统一', icon: '✨', color: '#E8A020',
            masterGuide: '最后冲刺！根据固定视角和氛围风格，生成多视角统一的效果图。所有图的色调、光影、植物风格必须一致。',
            task: '生成统一风格效果图',
            expertCost: 70,
            expertText: '伍师把控整体画面统一性，调整光影和色调。'
        },
        {
            id: 'narrative', title: '第8关：景观叙事', icon: '📖', color: '#B45890',
            masterGuide: '效果图出来了！但光看图不够，你要会讲故事。好的景观设计，每一棵树、每一块石头都有它的叙事。把设计变成打动人心的故事吧！',
            task: '编写景观设计叙事故事',
            expertCost: 50,
            expertText: '伍师帮你梳理叙事脉络，让甲方被打动。'
        },
        {
            id: 'pptboard', title: '第9关：PPT与展板', icon: '📐', color: '#6A2080',
            masterGuide: '故事有了，现在把它变成能上台的汇报材料。PPT要层层递进，展板要一眼震撼。这是面向甲方的临门一脚！',
            task: '生成汇报PPT与A1展板',
            expertCost: 60,
            expertText: '伍师把控汇报节奏，确保PPT逻辑清晰、展板视觉震撼。'
        },
        {
            id: 'deliver', title: '第10关：最终交付', icon: '🏆', color: '#1B4A0A',
            masterGuide: '恭喜通关！从氛围到叙事，从平面到展板，你已经完成了一个完整的景观设计项目。这里是你的全部成果，去征服甲方吧！',
            task: '成果汇总与交付',
            expertCost: 0,
            expertText: ''
        }
    ],

    // ═══════════════════════════════════════════════════════
    // 关卡定义：改造项目（6关）
    // ═══════════════════════════════════════════════════════
    renovationLevels: [
        {
            id: 'photos', title: '第1关：现状照片', icon: '📸', color: '#C4680A',
            masterGuide: '改造项目开始！先全面了解现状。最好有鸟瞰照片，能看到整体布局和周边环境。多角度照片越多，AI分析越准。',
            task: '上传现状照片（含鸟瞰）',
            expertCost: 30,
            expertText: '伍师现场诊断，指出现状问题和改造潜力点。'
        },
        {
            id: 'masterplan', title: '第2关：生成总图', icon: '🗺️', color: '#D4943A',
            masterGuide: '现状清楚了！AI根据现状照片直接生成改造后的效果图，这张图就是咱们的"总图"，后续所有图都要跟它统一。',
            task: 'AI生成改造效果图作为总图',
            expertCost: 50,
            expertText: '伍师确认总图方向，把控整体改造策略。'
        },
        {
            id: 'reverse', title: '第3关：反推平面', icon: '🔄', color: '#3B7A1A',
            masterGuide: '总图确定了！现在从效果图反推平面布局。AI会分析效果图里的空间关系，生成对应的平面布置图。',
            task: '反推生成平面布局图',
            expertCost: 60,
            expertText: '伍师审核反推平面的合理性，修正尺寸偏差。'
        },
        {
            id: 'multiview', title: '第4关：多视角效果', icon: '🖼️', color: '#1464A0',
            masterGuide: '平面有了！现在生成多视角效果图——人视、鸟瞰、节点特写，所有图都要跟总图统一风格。',
            task: '生成多视角统一效果图',
            expertCost: 50,
            expertText: '伍师把控视角选择和画面质量。'
        },
        {
            id: 'precad', title: '第5关：精确CAD', icon: '📏', color: '#6A4C93',
            masterGuide: '效果图甲方通过了！现在要精确施工图纸。AI根据平面图和效果图生成带尺寸的CAD，标注清楚拆改内容。',
            task: '生成精确CAD施工图纸',
            expertCost: 60,
            expertText: '伍师审核施工可行性，标注拆改和保留范围。'
        },
        {
            id: 'narrative', title: '第6关：景观叙事', icon: '📖', color: '#B45890',
            masterGuide: '图纸都齐了！但改造项目更需要讲故事——旧记忆如何保留，新生命如何注入。把你的改造理念变成打动人心的叙事吧！',
            task: '编写景观改造叙事故事',
            expertCost: 50,
            expertText: '伍师帮你突出改造前后的情感对比。'
        },
        {
            id: 'pptboard', title: '第7关：PPT与展板', icon: '📐', color: '#6A2080',
            masterGuide: '故事有了，现在做汇报！改造项目的PPT要重点突出"旧貌换新颜"的对比冲击力，展板要让甲方一眼看到价值。',
            task: '生成汇报PPT与A1展板',
            expertCost: 60,
            expertText: '伍师把控改造前后的对比呈现效果。'
        },
        {
            id: 'deliver', title: '第8关：最终交付', icon: '🏆', color: '#1B4A0A',
            masterGuide: '改造通关完成！从现状诊断到叙事汇报，你成功把旧场地变成了新景观。这里是所有成果，去征服甲方吧！',
            task: '成果汇总与交付',
            expertCost: 0,
            expertText: ''
        }
    ],

    // ═══════════════════════════════════════════════════════
    // 成就系统
    // ═══════════════════════════════════════════════════════
    achievementList: [
        { id: 'first_blood', title: '初出茅庐', icon: '🌱', desc: '完成第一关' },
        { id: 'halfway', title: '渐入佳境', icon: '🌿', desc: '完成50%关卡' },
        { id: 'expert_user', title: '名师高徒', icon: '👨‍🏫', desc: '使用专家助力3次' },
        { id: 'speedrun', title: '一气呵成', icon: '⚡', desc: '连续完成3关不存档' },
        { id: 'collector', title: '收藏家', icon: '📚', desc: '保存3个以上的方案变体' },
        { id: 'perfection', title: '完美主义', icon: '💎', desc: '每关都使用专家助力' },
        { id: 'champion', title: '设计大师', icon: '👑', desc: '通关任一完整路径' }
    ],

    // ═══════════════════════════════════════════════════════
    // 初始化
    // ═══════════════════════════════════════════════════════
    init() {
        this.loadState();
        this.render();
    },

    // ═══════════════════════════════════════════════════════
    // 状态管理
    // ═══════════════════════════════════════════════════════
    loadState() {
        try {
            const saved = localStorage.getItem('gameWorkflow_state');
            if (saved) {
                const state = JSON.parse(saved);
                this.gameMode = state.gameMode || null;
                this.currentLevel = state.currentLevel || 0;
                this.levelResults = state.levelResults || {};
                this.achievements = state.achievements || [];
                this.coins = state.coins !== undefined ? state.coins : 100;
                this.expertUsed = state.expertUsed || {};
            }
        } catch (e) { console.warn('存档读取失败', e); }
    },

    saveState() {
        const state = {
            gameMode: this.gameMode,
            currentLevel: this.currentLevel,
            levelResults: this.levelResults,
            achievements: this.achievements,
            coins: this.coins,
            expertUsed: this.expertUsed
        };
        localStorage.setItem('gameWorkflow_state', JSON.stringify(state));
    },

    clearState() {
        this.gameMode = null;
        this.currentLevel = 0;
        this.levelResults = {};
        this.achievements = [];
        this.coins = 100;
        this.expertUsed = {};
        this.saveState();
    },

    // ═══════════════════════════════════════════════════════
    // 主渲染
    // ═══════════════════════════════════════════════════════
    render() {
        const container = document.getElementById('game-workflow-container');
        if (!container) return;

        if (!this.gameMode) {
            this.renderModeSelect(container);
        } else {
            this.renderLevel(container);
        }
    },

    // ═══════════════════════════════════════════════════════
    // 模式选择：新建 vs 改造
    // ═══════════════════════════════════════════════════════
    renderModeSelect(container) {
        const saved = localStorage.getItem('gameWorkflow_state');
        const hasSaved = saved && JSON.parse(saved).gameMode;

        container.innerHTML = `
            <div style="text-align:center;padding:40px 20px">
                <div style="font-size:48px;margin-bottom:16px">🎮</div>
                <h2 style="font-size:24px;font-weight:700;color:var(--cream);margin-bottom:8px">选择你的冒险</h2>
                <p style="color:rgba(250,240,208,.5);margin-bottom:32px">像玩游戏一样完成景观设计，每过一关解锁新技能</p>

                <div style="display:flex;gap:20px;justify-content:center;flex-wrap:wrap;margin-bottom:32px">
                    <div onclick="gameWorkflow.startMode('new')" class="game-card" style="width:280px;padding:28px;border-radius:var(--r);background:linear-gradient(135deg,rgba(59,122,26,.15),rgba(20,100,160,.1));border:2px solid rgba(59,122,26,.3);cursor:pointer;transition:all .3s;text-align:center">
                        <div style="font-size:56px;margin-bottom:12px">🏗️</div>
                        <div style="font-size:18px;font-weight:700;color:var(--cream);margin-bottom:8px">新建项目</div>
                        <div style="font-size:13px;color:rgba(250,240,208,.5);line-height:1.6">从无到有，10关挑战<br>氛围→手绘→彩平→CAD→SU→视角→效果图→叙事→PPT/展板→交付</div>
                        <div style="margin-top:16px;display:flex;gap:4px;justify-content:center">
                            ${[1,2,3,4,5,6,7,8,9,10].map(i => `<span style="width:20px;height:20px;border-radius:50%;background:rgba(59,122,26,.3);display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--cream)">${i}</span>`).join('')}
                        </div>
                    </div>
                    <div onclick="gameWorkflow.startMode('renovation')" class="game-card" style="width:280px;padding:28px;border-radius:var(--r);background:linear-gradient(135deg,rgba(140,48,96,.15),rgba(196,104,10,.1));border:2px solid rgba(140,48,96,.3);cursor:pointer;transition:all .3s;text-align:center">
                        <div style="font-size:56px;margin-bottom:12px">🔨</div>
                        <div style="font-size:18px;font-weight:700;color:var(--cream);margin-bottom:8px">改造项目</div>
                        <div style="font-size:13px;color:rgba(250,240,208,.5);line-height:1.6">旧貌换新颜，8关冲刺<br>现状→总图→反推平面→多视角→精确CAD→叙事→PPT/展板→交付</div>
                        <div style="margin-top:16px;display:flex;gap:4px;justify-content:center">
                            ${[1,2,3,4,5,6,7,8].map(i => `<span style="width:20px;height:20px;border-radius:50%;background:rgba(140,48,96,.3);display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--cream)">${i}</span>`).join('')}
                        </div>
                    </div>
                </div>

                ${hasSaved ? `
                    <div style="margin-top:16px">
                        <button onclick="gameWorkflow.loadState();gameWorkflow.render();" class="btn btn-sun">📂 继续上次的冒险</button>
                        <button onclick="if(confirm('确定要重新开始吗？')){gameWorkflow.clearState();gameWorkflow.render();}" class="btn btn-ghost" style="margin-left:8px">🗑️ 清空进度</button>
                    </div>
                ` : ''}
            </div>
        `;

        // 卡片hover效果
        container.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-4px) scale(1.02)';
                card.style.borderColor = 'var(--sun-l)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0) scale(1)';
                card.style.borderColor = '';
            });
        });
    },

    startMode(mode) {
        this.gameMode = mode;
        this.currentLevel = 0;
        this.levelResults = {};
        this.saveState();
        this.render();
    },

    // ═══════════════════════════════════════════════════════
    // 渲染关卡
    // ═══════════════════════════════════════════════════════
    renderLevel(container) {
        const levels = this.gameMode === 'new' ? this.newLevels : this.renovationLevels;
        const level = levels[this.currentLevel];
        const result = this.levelResults[level.id] || {};
        const isComplete = result.completed;
        const hasExpert = this.expertUsed[level.id];

        // 计算进度
        const completedCount = Object.values(this.levelResults).filter(r => r.completed).length;
        const totalProgress = Math.round((completedCount / levels.length) * 100);

        container.innerHTML = `
            <!-- 游戏化顶部栏 -->
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding:12px 16px;background:rgba(255,255,255,.04);border-radius:var(--r);border:1px solid rgba(212,148,58,.1)">
                <div style="display:flex;align-items:center;gap:12px">
                    <button onclick="gameWorkflow.showLevelMap()" class="btn btn-ghost btn-sm">🗺️ 关卡地图</button>
                    <div style="font-size:13px;color:rgba(250,240,208,.6)">${level.title}</div>
                </div>
                <div style="display:flex;align-items:center;gap:16px">
                    <div style="display:flex;align-items:center;gap:6px">
                        <span style="font-size:16px">💰</span>
                        <span style="font-size:13px;font-weight:700;color:var(--sun-l)">${this.coins}</span>
                    </div>
                    <div style="width:120px;height:8px;background:rgba(255,255,255,.1);border-radius:4px;overflow:hidden">
                        <div style="width:${totalProgress}%;height:100%;background:linear-gradient(90deg,var(--sea-l),var(--sun-l));transition:width .5s"></div>
                    </div>
                    <span style="font-size:11px;color:rgba(250,240,208,.5)">${totalProgress}%</span>
                </div>
            </div>

            <div style="display:flex;gap:16px;align-items:flex-start">
                <!-- 左侧：伍师引导 + 成就 -->
                <div style="width:300px;flex-shrink:0">
                    <div class="card" style="border-left:3px solid ${level.color};margin-bottom:12px">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
                            <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,${level.color},var(--palm-m));display:flex;align-items:center;justify-content:center;font-size:24px">🌴</div>
                            <div>
                                <div style="font-weight:700;font-size:14px;color:var(--cream)">伍师</div>
                                <div style="font-size:11px;color:rgba(250,240,208,.4)">资深景观设计师 · 你的通关导师</div>
                            </div>
                        </div>
                        <div style="font-size:13px;color:rgba(250,240,208,.75);line-height:1.8;margin-bottom:12px;padding:12px;background:rgba(0,0,0,.15);border-radius:8px;border-left:2px solid ${level.color}">
                            ${level.masterGuide}
                        </div>
                        ${hasExpert ? `
                            <div style="padding:8px 12px;background:rgba(59,122,26,.15);border-radius:6px;border:1px solid rgba(59,122,26,.3);font-size:12px;color:var(--sea-l)">
                                ✅ 已使用专家助力 — 本关获得S级评价！
                            </div>
                        ` : level.expertCost > 0 ? `
                            <button onclick="gameWorkflow.callExpert('${level.id}')" class="btn btn-ghost btn-sm" style="width:100%;font-size:12px;border-color:rgba(212,148,58,.3)">
                                👨‍🏫 专家助力 (${level.expertCost}💰) — ${level.expertText}
                            </button>
                        ` : ''}
                    </div>

                    <!-- 成就展示 -->
                    <div class="card" style="padding:12px">
                        <div style="font-size:12px;font-weight:700;color:var(--cream);margin-bottom:8px">🏅 已解锁成就</div>
                        <div style="display:flex;flex-wrap:wrap;gap:6px">
                            ${this.achievements.length > 0 ? this.achievements.map(aid => {
                                const a = this.achievementList.find(x => x.id === aid);
                                return a ? `<span style="padding:4px 8px;background:rgba(212,148,58,.15);border-radius:12px;font-size:11px;color:var(--sun-l)">${a.icon} ${a.title}</span>` : '';
                            }).join('') : '<span style="font-size:11px;color:rgba(250,240,208,.3)">还没有成就，继续加油！</span>'}
                        </div>
                    </div>
                </div>

                <!-- 中间：关卡操作区 -->
                <div style="flex:1;min-width:0">
                    <div class="card" style="border:1px solid ${level.color}30;margin-bottom:16px">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.06)">
                            <span style="font-size:32px">${level.icon}</span>
                            <div>
                                <div style="font-size:18px;font-weight:700;color:var(--cream)">${level.title}</div>
                                <div style="font-size:13px;color:${level.color}">${level.task}</div>
                            </div>
                            ${isComplete ? '<span style="margin-left:auto;font-size:28px">✅</span>' : ''}
                        </div>

                        <!-- 关卡内容 -->
                        <div id="level-content-area">
                            ${this.renderLevelContent(level, result)}
                        </div>
                    </div>

                    <!-- 底部操作栏 -->
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <div style="display:flex;gap:8px">
                            ${this.currentLevel > 0 ? `<button onclick="gameWorkflow.prevLevel()" class="btn btn-ghost">⬅️ 上一关</button>` : ''}
                            <button onclick="gameWorkflow.saveCheckpoint()" class="btn btn-ghost">💾 存档</button>
                        </div>
                        <div style="display:flex;gap:8px;align-items:center">
                            <button onclick="gameWorkflow.showCheckpointList()" class="btn btn-ghost btn-sm">📂 读档</button>
                            ${isComplete && this.currentLevel < levels.length - 1 ? `
                                <button onclick="gameWorkflow.nextLevel()" class="btn btn-sun">下一关 ➡️</button>
                            ` : ''}
                            ${this.currentLevel === levels.length - 1 && isComplete ? `
                                <button onclick="gameWorkflow.showVictory()" class="btn btn-sun" style="background:linear-gradient(135deg,var(--sun-l),var(--sun-m))">🏆 通关大吉</button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // ═══════════════════════════════════════════════════════
    // 渲染各关卡的具体内容
    // ═══════════════════════════════════════════════════════
    renderLevelContent(level, result) {
        const project = app.currentProject || { type: '庭院', typeLabel: '别墅庭院设计' };

        switch (level.id) {
            // ===== 新建项目关卡 =====
            case 'atmosphere':
                return this.renderAtmosphereLevel(level, result, project);
            case 'sketch':
                return this.renderSketchLevel(level, result, project);
            case 'colorplan':
                return this.renderColorplanLevel(level, result, project);
            case 'cad':
                return this.renderCadLevel(level, result, project);
            case 'sumodel':
                return this.renderSumodelLevel(level, result, project);
            case 'viewpoint':
                return this.renderViewpointLevel(level, result, project);
            case 'render':
                return this.renderRenderLevel(level, result, project);

            // ===== 叙事与汇报关卡（通用）=====
            case 'narrative':
                return this.renderNarrativeLevel(level, result, project);
            case 'pptboard':
                return this.renderPptboardLevel(level, result, project);

            case 'deliver':
                return this.renderDeliverLevel(level, result, project);

            // ===== 改造项目关卡 =====
            case 'photos':
                return this.renderPhotosLevel(level, result, project);
            case 'masterplan':
                return this.renderMasterplanLevel(level, result, project);
            case 'reverse':
                return this.renderReverseLevel(level, result, project);
            case 'multiview':
                return this.renderMultiviewLevel(level, result, project);
            case 'precad':
                return this.renderPrecadLevel(level, result, project);

            default:
                return '<div style="color:rgba(250,240,208,.5)">关卡内容加载中...</div>';
        }
    },

    // ─────────────────────────────────────────────────────
    // 第1关：氛围确认（新建）
    // ─────────────────────────────────────────────────────
    renderAtmosphereLevel(level, result, project) {
        const categories = [
            {
                title: '━━ 东方传统 ━━',
                items: [
                    { id: 'classical_garden', name: '古典园林', icon: '🏯', color: '#8B4513', desc: '苏州/扬州园林：白墙黛瓦，叠山理水，漏窗借景' },
                    { id: 'zen_karesansui', name: '日式枯山水', icon: '🪨', color: '#A9A9A9', desc: '白砂耙纹，置石苔藓，禅意静谧' },
                    { id: 'new_chinese', name: '新中式', icon: '🏮', color: '#B45820', desc: '传统元素现代表达，留白写意，水墨意境' },
                    { id: 'lingnan_garden', name: '岭南园林', icon: '🌺', color: '#D468A0', desc: '通透开敞，灰塑彩陶，热带植物' },
                    { id: 'japanese_natural', name: '日式自然风', icon: '🍁', color: '#C44820', desc: '杂木庭院，苔藓地被，四季分明' }
                ]
            },
            {
                title: '━━ 现代当代 ━━',
                items: [
                    { id: 'modern_minimal', name: '现代极简', icon: '⬜', color: '#8C8C8C', desc: '几何线条，大面积铺装，雕塑感植物' },
                    { id: 'eco_naturalism', name: '生态自然主义', icon: '🌾', color: '#3B7A1A', desc: '草甸花海，雨水花园，乡土植物' },
                    { id: 'parametric_tech', name: '参数化/科技感', icon: '💫', color: '#7A4FB0', desc: '曲线造型，智能灯光，未来感' },
                    { id: 'industrial', name: '工业风', icon: '🔧', color: '#6E6E6E', desc: '锈蚀钢板，混凝土，野花组合' },
                    { id: 'art_installation', name: '艺术装置风', icon: '🎨', color: '#E85050', desc: '大地艺术，色彩碰撞，概念性强' }
                ]
            },
            {
                title: '━━ 西方经典 ━━',
                items: [
                    { id: 'english_landscape', name: '英式自然风景园', icon: '🌹', color: '#D46868', desc: '疏林草地，蜿蜒小径，花境层次' },
                    { id: 'french_formal', name: '法式规整园林', icon: '⛲', color: '#4682B4', desc: '轴线对称，修剪绿篱，喷泉雕塑' },
                    { id: 'mediterranean', name: '地中海风情', icon: '🌊', color: '#1464A0', desc: '蓝白陶瓦，耐旱植物，陶罐铺装' },
                    { id: 'american_estate', name: '美式庄园', icon: '🏡', color: '#5A8C3A', desc: '大草坪，乔木遮阴，休闲舒适' },
                    { id: 'german_functional', name: '德式功能主义', icon: '📐', color: '#505050', desc: '严谨分区，理性铺装，功能优先' }
                ]
            },
            {
                title: '━━ 特色专题 ━━',
                items: [
                    { id: 'flower_border', name: '花境花园', icon: '💐', color: '#E060A0', desc: '多年生草本，四季轮替，色彩盛宴' },
                    { id: 'tropical_rainforest', name: '热带雨林风', icon: '🌴', color: '#2A8C3A', desc: '棕榈芭蕉，喷雾溪谷，浓绿繁盛' },
                    { id: 'desert_xeriscape', name: '荒漠旱生风', icon: '🌵', color: '#C89820', desc: '仙人掌，砾石铺地，耐旱景观' },
                    { id: 'wetland_aquatic', name: '湿地水生风', icon: '🦆', color: '#2088A0', desc: '芦苇荷花，木栈道，生态驳岸' },
                    { id: 'night_lighting', name: '夜景灯光风', icon: '✨', color: '#E8A020', desc: '灯光雕塑，氛围照明，夜游体验' }
                ]
            }
        ];
        const selected = result.atmosphere;
        const isCustom = selected === '__custom__';
        const hasSelection = selected && !isCustom;

        let html = `
            <div style="margin-bottom:16px">
                <div style="font-size:13px;color:rgba(250,240,208,.5);margin-bottom:12px">为「${project.typeLabel || '项目'}」选择整体氛围风格：</div>
        `;

        categories.forEach(cat => {
            html += `
                <div style="font-size:12px;color:var(--cream);text-align:center;margin:16px 0 8px;letter-spacing:2px;opacity:.7">${cat.title}</div>
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:8px">
                    ${cat.items.map(a => `
                        <div onclick="gameWorkflow.selectAtmosphere('${a.id}')" class="atmosphere-card" style="padding:12px;border-radius:10px;border:2px solid ${selected === a.id ? a.color : 'rgba(255,255,255,.08)'};background:${selected === a.id ? a.color + '15' : 'rgba(255,255,255,.03)'};cursor:pointer;transition:all .2s;text-align:center">
                            <div style="font-size:28px;margin-bottom:6px">${a.icon}</div>
                            <div style="font-weight:700;font-size:13px;color:var(--cream);margin-bottom:3px">${a.name}</div>
                            <div style="font-size:10px;color:rgba(250,240,208,.5);line-height:1.4">${a.desc}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        });

        html += `
            <div style="font-size:12px;color:var(--cream);text-align:center;margin:16px 0 8px;letter-spacing:2px;opacity:.7">━━ 其他 ━━</div>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">
                <div onclick="gameWorkflow.selectAtmosphere('__custom__')" class="atmosphere-card" style="padding:12px;border-radius:10px;border:2px solid ${isCustom ? '#8C8C8C' : 'rgba(255,255,255,.08)'};background:${isCustom ? '#8C8C8C15' : 'rgba(255,255,255,.03)'};cursor:pointer;transition:all .2s;text-align:center">
                    <div style="font-size:28px;margin-bottom:6px">🔤</div>
                    <div style="font-weight:700;font-size:13px;color:var(--cream);margin-bottom:3px">其他/自定义</div>
                    <div style="font-size:10px;color:rgba(250,240,208,.5);line-height:1.4">输入任意氛围关键词...</div>
                </div>
            </div>
        `;

        if (isCustom) {
            html += `
                <div style="margin-top:16px;text-align:center">
                    <input type="text" id="custom-atmosphere-input" placeholder="请输入自定义氛围关键词，如：法式宫廷、赛博朋克..." 
                        style="width:100%;max-width:360px;padding:12px 16px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.05);color:var(--cream);font-size:14px;outline:none;box-sizing:border-box"
                        onkeydown="if(event.key==='Enter')gameWorkflow.confirmCustomAtmosphere()" autofocus>
                    <div style="margin-top:12px">
                        <button onclick="gameWorkflow.confirmCustomAtmosphere()" class="btn btn-sun">✅ 确认自定义氛围</button>
                    </div>
                </div>
            `;
        }

        html += `</div>`;

        if (hasSelection) {
            html += `
                <div style="display:flex;gap:8px;justify-content:center">
                    <button onclick="gameWorkflow.completeLevel('atmosphere')" class="btn btn-sun">✅ 确认氛围，进入下一关</button>
                </div>
            `;
        }

        return html;
    },

    selectAtmosphere(id) {
        if (!this.levelResults['atmosphere']) this.levelResults['atmosphere'] = {};
        this.levelResults['atmosphere'].atmosphere = id;
        this.saveState();
        this.render();
        if (id === '__custom__') {
            setTimeout(() => {
                const input = document.getElementById('custom-atmosphere-input');
                if (input) input.focus();
            }, 50);
        } else {
            this.toast('氛围风格已选定！');
        }
    },

    confirmCustomAtmosphere() {
        const input = document.getElementById('custom-atmosphere-input');
        const value = input ? input.value.trim() : '';
        if (!value) {
            this.toast('请输入自定义氛围关键词');
            return;
        }
        if (!this.levelResults['atmosphere']) this.levelResults['atmosphere'] = {};
        this.levelResults['atmosphere'].atmosphere = value;
        this.saveState();
        this.toast('自定义氛围已确认！');
        this.completeLevel('atmosphere');
    },

    // ─────────────────────────────────────────────────────
    // 第2关：手绘平面图（新建）
    // ─────────────────────────────────────────────────────
    renderSketchLevel(level, result, project) {
        const hasSketch = result.sketchImage;
        return `
            <div style="margin-bottom:16px">
                <div style="font-size:13px;color:rgba(250,240,208,.5);margin-bottom:12px;line-height:1.8">
                    上传你的手绘平面草图。可以是手机拍照的纸笔草图，也可以是平板手绘。<br>
                    要求：表达出空间分区、主要动线、功能节点即可，不需要很精细。
                </div>
                <div id="sketch-upload-zone" style="border:2px dashed rgba(212,148,58,.3);border-radius:12px;padding:40px;text-align:center;cursor:pointer;transition:all .2s;background:rgba(255,255,255,.02)"
                     onclick="document.getElementById('sketch-input').click()"
                     ondragover="event.preventDefault();this.style.borderColor='var(--sun-l)';this.style.background='rgba(212,148,58,.08)'"
                     ondragleave="this.style.borderColor='rgba(212,148,58,.3)';this.style.background='rgba(255,255,255,.02)'"
                     ondrop="event.preventDefault();gameWorkflow.handleSketchDrop(event)">
                    <div style="font-size:48px;margin-bottom:12px">✏️</div>
                    <div style="font-size:14px;color:var(--cream);margin-bottom:4px">点击或拖拽上传手绘草图</div>
                    <div style="font-size:12px;color:rgba(250,240,208,.4)">支持 JPG、PNG、GIF，最大 10MB</div>
                    <input type="file" id="sketch-input" style="display:none" accept="image/*" onchange="gameWorkflow.handleSketchUpload(this)">
                </div>
                ${hasSketch ? `
                    <div style="margin-top:16px">
                        <div style="font-size:12px;color:var(--sea-l);margin-bottom:8px">✅ 已上传草图</div>
                        <img src="${hasSketch}" style="max-width:100%;max-height:300px;border-radius:8px;border:1px solid rgba(255,255,255,.1)">
                        <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
                            <button onclick="gameWorkflow.completeLevel('sketch')" class="btn btn-sun">✅ 草图完成，进入AI彩平</button>
                            <button onclick="gameWorkflow.regenerateLevel('sketch')" class="btn btn-ghost btn-sm">🔄 重新上传</button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    handleSketchUpload(input) {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) { alert('文件太大，请压缩后上传'); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            if (!this.levelResults['sketch']) this.levelResults['sketch'] = {};
            this.levelResults['sketch'].sketchImage = e.target.result;
            this.saveState();
            this.render();
            this.toast('手绘草图已上传！');
        };
        reader.readAsDataURL(file);
    },

    handleSketchDrop(e) {
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (!this.levelResults['sketch']) this.levelResults['sketch'] = {};
                this.levelResults['sketch'].sketchImage = ev.target.result;
                this.saveState();
                this.render();
                this.toast('手绘草图已上传！');
            };
            reader.readAsDataURL(file);
        }
    },

    // ─────────────────────────────────────────────────────
    // 第3关：AI彩平（新建）
    // ─────────────────────────────────────────────────────
    renderColorplanLevel(level, result, project) {
        const sketch = this.levelResults['sketch']?.sketchImage;
        const generated = result.colorplanImage;
        const isGenerating = this.isLoading;
        return `
            <div style="margin-bottom:16px">
                ${sketch ? `
                    <div style="margin-bottom:12px">
                        <div style="font-size:12px;color:rgba(250,240,208,.5);margin-bottom:8px">原始手绘草图：</div>
                        <img src="${sketch}" style="max-width:200px;max-height:150px;border-radius:8px;border:1px solid rgba(255,255,255,.1);opacity:.7">
                    </div>
                ` : '<div style="color:var(--sun-f);margin-bottom:12px">⚠️ 先完成第2关手绘平面图</div>'}

                <div style="font-size:13px;color:rgba(250,240,208,.5);margin-bottom:12px;line-height:1.8">
                    AI将根据你的手绘草图，填充植物、铺装、水体，生成彩色平面图。可以选择偏好的植物风格和季节。
                </div>

                <div style="display:flex;gap:8px;margin-bottom:16px">
                    <select id="cp-season" style="flex:1">
                        <option value="spring">🌸 春季（繁花似锦）</option>
                        <option value="summer">🌳 夏季（浓荫蔽日）</option>
                        <option value="autumn">🍂 秋季（层林尽染）</option>
                        <option value="winter">❄️ 冬季（疏影横斜）</option>
                    </select>
                    <select id="cp-plant-style" style="flex:1">
                        <option value="lush">🌿  lush自然风</option>
                        <option value="structured">📐 结构化种植</option>
                        <option value="minimal">⬜ 极简配置</option>
                    </select>
                </div>

                ${!generated && !isGenerating ? `
                    <button onclick="gameWorkflow.generateColorplan()" class="btn btn-sun" style="width:100%">🌈 生成AI彩色平面图</button>
                ` : ''}

                ${isGenerating ? `
                    <div style="text-align:center;padding:40px">
                        <div style="font-size:48px;margin-bottom:16px" class="game-pulse">🌈</div>
                        <div style="font-size:14px;color:var(--cream)">AI正在绘制彩色平面图...</div>
                        <div style="font-size:12px;color:rgba(250,240,208,.4);margin-top:8px">大约需要 15-30 秒</div>
                    </div>
                ` : ''}

                ${generated ? `
                    <div style="margin-top:16px">
                        <div style="font-size:12px;color:var(--sea-l);margin-bottom:8px">✅ AI彩色平面图已生成</div>
                        <img src="${generated}" style="max-width:100%;max-height:350px;border-radius:8px;border:1px solid rgba(255,255,255,.1)">
                        <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
                            <button onclick="gameWorkflow.completeLevel('colorplan')" class="btn btn-sun">✅ 满意，进入CAD</button>
                            <button onclick="gameWorkflow.generateColorplan()" class="btn btn-ghost btn-sm">🔄 重新生成</button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    async generateColorplan() {
        this.isLoading = true;
        this.render();
        // 模拟AI生成，实际会调用后端API
        await new Promise(r => setTimeout(r, 2000));
        const mockImages = [
            'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&q=80',
            'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80',
            'https://images.unsplash.com/photo-1598902108854-10e335adac99?w=800&q=80'
        ];
        const randomImg = mockImages[Math.floor(Math.random() * mockImages.length)];
        if (!this.levelResults['colorplan']) this.levelResults['colorplan'] = {};
        this.levelResults['colorplan'].colorplanImage = randomImg;
        this.isLoading = false;
        this.saveState();
        this.render();
        this.toast('彩色平面图生成完成！');
    },

    // ─────────────────────────────────────────────────────
    // 第4关：CAD精确图纸（新建）
    // ─────────────────────────────────────────────────────
    renderCadLevel(level, result, project) {
        const colorplan = this.levelResults['colorplan']?.colorplanImage;
        const generated = result.cadImage;
        return `
            <div style="margin-bottom:16px">
                ${colorplan ? `
                    <div style="margin-bottom:12px">
                        <div style="font-size:12px;color:rgba(250,240,208,.5);margin-bottom:8px">参考彩平：</div>
                        <img src="${colorplan}" style="max-width:200px;max-height:150px;border-radius:8px;border:1px solid rgba(255,255,255,.1);opacity:.7">
                    </div>
                ` : '<div style="color:var(--sun-f);margin-bottom:12px">⚠️ 先完成第3关AI彩平</div>'}

                <div style="font-size:13px;color:rgba(250,240,208,.5);margin-bottom:12px;line-height:1.8">
                    AI将彩色平面图转换为精确的CAD线稿图纸。包含尺寸标注、坐标、图层信息。
                </div>

                <div style="display:flex;gap:8px;margin-bottom:16px">
                    <select id="cad-scale" style="flex:1">
                        <option value="1:50">1:50（庭院尺度）</option>
                        <option value="1:100">1:100（社区尺度）</option>
                        <option value="1:200">1:200（公园尺度）</option>
                        <option value="1:500">1:500（规划尺度）</option>
                    </select>
                    <select id="cad-unit" style="flex:1">
                        <option value="mm">毫米 (mm)</option>
                        <option value="m">米 (m)</option>
                    </select>
                </div>

                ${!generated ? `
                    <button onclick="gameWorkflow.generateCad()" class="btn btn-sun" style="width:100%">📐 生成CAD精确图纸</button>
                ` : ''}

                ${generated ? `
                    <div style="margin-top:16px">
                        <div style="font-size:12px;color:var(--sea-l);margin-bottom:8px">✅ CAD图纸已生成</div>
                        <img src="${generated}" style="max-width:100%;max-height:350px;border-radius:8px;border:1px solid rgba(255,255,255,.1)">
                        <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
                            <button onclick="gameWorkflow.completeLevel('cad')" class="btn btn-sun">✅ 精确，进入SU模型</button>
                            <button onclick="gameWorkflow.generateCad()" class="btn btn-ghost btn-sm">🔄 重新生成</button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    async generateCad() {
        this.isLoading = true;
        this.render();
        await new Promise(r => setTimeout(r, 2000));
        const mockImages = [
            'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80',
            'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=80'
        ];
        const randomImg = mockImages[Math.floor(Math.random() * mockImages.length)];
        if (!this.levelResults['cad']) this.levelResults['cad'] = {};
        this.levelResults['cad'].cadImage = randomImg;
        this.isLoading = false;
        this.saveState();
        this.render();
        this.toast('CAD图纸生成完成！');
    },

    // ─────────────────────────────────────────────────────
    // 第5关：SU模型（新建）
    // ─────────────────────────────────────────────────────
    renderSumodelLevel(level, result, project) {
        const cad = this.levelResults['cad']?.cadImage;
        const generated = result.sumodelImage;
        return `
            <div style="margin-bottom:16px">
                ${cad ? `
                    <div style="margin-bottom:12px">
                        <div style="font-size:12px;color:rgba(250,240,208,.5);margin-bottom:8px">参考CAD：</div>
                        <img src="${cad}" style="max-width:200px;max-height:150px;border-radius:8px;border:1px solid rgba(255,255,255,.1);opacity:.7">
                    </div>
                ` : '<div style="color:var(--sun-f);margin-bottom:12px">⚠️ 先完成第4关CAD</div>'}

                <div style="font-size:13px;color:rgba(250,240,208,.5);margin-bottom:12px;line-height:1.8">
                    AI根据CAD图纸生成SketchUp三维模型。可以预览体块关系、空间尺度、植物高度。
                </div>

                <div style="display:flex;gap:8px;margin-bottom:16px">
                    <select id="su-detail" style="flex:1">
                        <option value="block">📦 体块模型（快速）</option>
                        <option value="medium">🏠 中等细节（推荐）</option>
                        <option value="high">🔍 高细节（较慢）</option>
                    </select>
                </div>

                ${!generated ? `
                    <button onclick="gameWorkflow.generateSumodel()" class="btn btn-sun" style="width:100%">🏗️ 生成SU三维模型</button>
                ` : ''}

                ${generated ? `
                    <div style="margin-top:16px">
                        <div style="font-size:12px;color:var(--sea-l);margin-bottom:8px">✅ SU模型预览</div>
                        <img src="${generated}" style="max-width:100%;max-height:350px;border-radius:8px;border:1px solid rgba(255,255,255,.1)">
                        <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
                            <button onclick="gameWorkflow.completeLevel('sumodel')" class="btn btn-sun">✅ 模型OK，选视角</button>
                            <button onclick="gameWorkflow.generateSumodel()" class="btn btn-ghost btn-sm">🔄 重新生成</button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    async generateSumodel() {
        this.isLoading = true;
        this.render();
        await new Promise(r => setTimeout(r, 2500));
        const mockImages = [
            'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80'
        ];
        const randomImg = mockImages[Math.floor(Math.random() * mockImages.length)];
        if (!this.levelResults['sumodel']) this.levelResults['sumodel'] = {};
        this.levelResults['sumodel'].sumodelImage = randomImg;
        this.isLoading = false;
        this.saveState();
        this.render();
        this.toast('SU模型生成完成！');
    },

    // ─────────────────────────────────────────────────────
    // 第6关：固定视角（新建）
    // ─────────────────────────────────────────────────────
    renderViewpointLevel(level, result, project) {
        const sumodel = this.levelResults['sumodel']?.sumodelImage;
        const generated = result.viewpointImage;
        return `
            <div style="margin-bottom:16px">
                ${sumodel ? `
                    <div style="margin-bottom:12px">
                        <div style="font-size:12px;color:rgba(250,240,208,.5);margin-bottom:8px">参考模型：</div>
                        <img src="${sumodel}" style="max-width:200px;max-height:150px;border-radius:8px;border:1px solid rgba(255,255,255,.1);opacity:.7">
                    </div>
                ` : '<div style="color:var(--sun-f);margin-bottom:12px">⚠️ 先完成第5关SU模型</div>'}

                <div style="font-size:13px;color:rgba(250,240,208,.5);margin-bottom:12px;line-height:1.8">
                    从模型中选择一个最佳展示角度，固定截图。这个视角将成为后续所有效果图的统一视角基准。
                </div>

                <div style="display:flex;gap:8px;margin-bottom:16px">
                    <select id="vp-angle" style="flex:1">
                        <option value="birdseye">🕊️ 鸟瞰视角</option>
                        <option value="human">👤 人视视角（1.6m）</option>
                        <option value="low">🐜 低角度（仰视）</option>
                        <option value="aerial">🚁 半鸟瞰（45°）</option>
                    </select>
                    <select id="vp-time" style="flex:1">
                        <option value="morning">🌅 早晨光线</option>
                        <option value="noon">☀️ 正午光线</option>
                        <option value="afternoon">🌇 下午光线</option>
                        <option value="golden">🌆 黄金时刻</option>
                    </select>
                </div>

                ${!generated ? `
                    <button onclick="gameWorkflow.generateViewpoint()" class="btn btn-sun" style="width:100%">📷 导出固定视角截图</button>
                ` : ''}

                ${generated ? `
                    <div style="margin-top:16px">
                        <div style="font-size:12px;color:var(--sea-l);margin-bottom:8px">✅ 固定视角截图</div>
                        <img src="${generated}" style="max-width:100%;max-height:350px;border-radius:8px;border:1px solid rgba(255,255,255,.1)">
                        <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
                            <button onclick="gameWorkflow.completeLevel('viewpoint')" class="btn btn-sun">✅ 视角固定，出效果图</button>
                            <button onclick="gameWorkflow.generateViewpoint()" class="btn btn-ghost btn-sm">🔄 重选视角</button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    async generateViewpoint() {
        this.isLoading = true;
        this.render();
        await new Promise(r => setTimeout(r, 2000));
        const mockImages = [
            'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
            'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&q=80'
        ];
        const randomImg = mockImages[Math.floor(Math.random() * mockImages.length)];
        if (!this.levelResults['viewpoint']) this.levelResults['viewpoint'] = {};
        this.levelResults['viewpoint'].viewpointImage = randomImg;
        this.isLoading = false;
        this.saveState();
        this.render();
        this.toast('固定视角截图完成！');
    },

    // ─────────────────────────────────────────────────────
    // 第7关：效果图统一（新建）
    // ─────────────────────────────────────────────────────
    renderRenderLevel(level, result, project) {
        const viewpoint = this.levelResults['viewpoint']?.viewpointImage;
        const atmosphere = this.levelResults['atmosphere']?.atmosphere;
        const generated = result.renderImages;
        return `
            <div style="margin-bottom:16px">
                ${viewpoint ? `
                    <div style="margin-bottom:12px">
                        <div style="font-size:12px;color:rgba(250,240,208,.5);margin-bottom:8px">视角基准：</div>
                        <img src="${viewpoint}" style="max-width:200px;max-height:150px;border-radius:8px;border:1px solid rgba(255,255,255,.1);opacity:.7">
                    </div>
                ` : '<div style="color:var(--sun-f);margin-bottom:12px">⚠️ 先完成第6关固定视角</div>'}

                <div style="font-size:13px;color:rgba(250,240,208,.5);margin-bottom:12px;line-height:1.8">
                    根据固定视角和${atmosphere ? '已选氛围' : '项目氛围'}，生成多视角统一的效果图。所有图色调、光影、植物风格一致。
                </div>

                <div style="display:flex;gap:8px;margin-bottom:16px">
                    <select id="render-count" style="flex:1">
                        <option value="3">🖼️ 3张效果图</option>
                        <option value="5">🖼️ 5张效果图</option>
                        <option value="8">🖼️ 8张效果图（全套）</option>
                    </select>
                </div>

                ${(!generated || generated.length === 0) ? `
                    <button onclick="gameWorkflow.generateRender()" class="btn btn-sun" style="width:100%">✨ 生成统一风格效果图</button>
                ` : ''}

                ${generated && generated.length > 0 ? `
                    <div style="margin-top:16px">
                        <div style="font-size:12px;color:var(--sea-l);margin-bottom:8px">✅ 已生成 ${generated.length} 张效果图</div>
                        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
                            ${generated.map((img, i) => `
                                <div style="position:relative">
                                    <img src="${img}" style="width:100%;height:180px;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,.1)">
                                    <div style="position:absolute;bottom:8px;left:8px;padding:4px 8px;background:rgba(0,0,0,.6);border-radius:4px;font-size:11px;color:#fff">视角 ${i+1}</div>
                                </div>
                            `).join('')}
                        </div>
                        <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
                            <button onclick="gameWorkflow.completeLevel('render')" class="btn btn-sun">✅ 效果图统一，准备交付</button>
                            <button onclick="gameWorkflow.generateRender()" class="btn btn-ghost btn-sm">🔄 重新生成</button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    async generateRender() {
        this.isLoading = true;
        this.render();
        await new Promise(r => setTimeout(r, 3000));
        const mockImages = [
            'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600&q=80',
            'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=600&q=80',
            'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=600&q=80',
            'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=600&q=80'
        ];
        if (!this.levelResults['render']) this.levelResults['render'] = {};
        this.levelResults['render'].renderImages = mockImages.slice(0, 3);
        this.isLoading = false;
        this.saveState();
        this.render();
        this.toast('效果图生成完成！');
    },

    // ─────────────────────────────────────────────────────
    // 第8关：景观叙事/汇报（通用）
    // ─────────────────────────────────────────────────────
    renderNarrativeLevel(level, result, project) {
        const renderResult = this.levelResults['render']?.renderImages || this.levelResults['multiview']?.multiviewImages;
        const narrative = result.narrative || {};
        const isNew = this.gameMode === 'new';
        return `
            <div style="margin-bottom:16px">
                <div style="font-size:13px;color:rgba(250,240,208,.5);margin-bottom:16px;line-height:1.8">
                    ${isNew
                        ? '效果图是眼睛看的，叙事是心里感受的。一个好的景观设计，要讲清楚「这片场地曾经是谁的，现在变成什么样，未来会怎样生长」。来，把设计变成故事。'
                        : '改造项目最打动人的，不是新图纸多好看，而是「旧记忆被保留、新生命被注入」的情感。讲清楚这个转变的故事，甲方才会买单。'
                    }
                </div>

                ${renderResult ? `
                    <div style="margin-bottom:16px">
                        <div style="font-size:12px;color:rgba(250,240,208,.5);margin-bottom:8px">你的设计成果（作为叙事素材）：</div>
                        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
                            ${(Array.isArray(renderResult) ? renderResult.slice(0,3) : [renderResult]).map(img => `
                                <img src="${img}" style="width:100%;height:80px;object-fit:cover;border-radius:6px;border:1px solid rgba(255,255,255,.1);opacity:.7">
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div style="display:flex;flex-direction:column;gap:16px">
                    <!-- 场地故事 -->
                    <div style="padding:16px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02)">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                            <span style="font-size:18px">📍</span>
                            <span style="font-size:14px;font-weight:700;color:var(--cream)">场地故事</span>
                            <span style="font-size:11px;color:rgba(250,240,208,.4)">这片场地的前世今生</span>
                        </div>
                        <textarea id="nar-story" rows="3" style="width:100%;font-size:13px" placeholder="例如：这块地原本是废弃的工厂院子，青砖墙上爬满了爬山虎，老工人们夏天在银杏树下下棋...">${narrative.story || ''}</textarea>
                    </div>

                    <!-- 设计理念 -->
                    <div style="padding:16px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02)">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                            <span style="font-size:18px">💡</span>
                            <span style="font-size:14px;font-weight:700;color:var(--cream)">设计理念</span>
                            <span style="font-size:11px;color:rgba(250,240,208,.4)">你的核心设计策略</span>
                        </div>
                        <textarea id="nar-concept" rows="3" style="width:100%;font-size:13px" placeholder="例如：保留所有原生大树，以\"记忆廊道\"串联新旧空间，让老厂区的工业记忆在新景观中延续...">${narrative.concept || ''}</textarea>
                    </div>

                    <!-- 空间体验 -->
                    <div style="padding:16px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02)">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                            <span style="font-size:18px">🚶</span>
                            <span style="font-size:14px;font-weight:700;color:var(--cream)">空间体验</span>
                            <span style="font-size:11px;color:rgba(250,240,208,.4)">人在其中如何感受</span>
                        </div>
                        <textarea id="nar-experience" rows="3" style="width:100%;font-size:13px" placeholder="例如：从入口的"收"开始，经过一片竹影婆娑的转折空间，豁然开朗看到中心水景，情绪从压抑到释放...">${narrative.experience || ''}</textarea>
                    </div>

                    <!-- 未来愿景 -->
                    <div style="padding:16px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02)">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                            <span style="font-size:18px">🔮</span>
                            <span style="font-size:14px;font-weight:700;color:var(--cream)">未来愿景</span>
                            <span style="font-size:11px;color:rgba(250,240,208,.4)">三年、五年、十年后</span>
                        </div>
                        <textarea id="nar-future" rows="3" style="width:100%;font-size:13px" placeholder="例如：三年后，朴树和榉树形成林荫，五年后，地被植物自然蔓延，十年后，这里会成为社区最热闹的生活剧场...">${narrative.future || ''}</textarea>
                    </div>
                </div>

                <div style="display:flex;gap:8px;justify-content:center;margin-top:20px">
                    <button onclick="gameWorkflow.saveNarrative()" class="btn btn-ghost">💾 保存叙事</button>
                    <button onclick="gameWorkflow.generateNarrativeByAI()" class="btn btn-ghost">🤖 AI辅助生成</button>
                    ${narrative.story ? `<button onclick="gameWorkflow.completeLevel('narrative')" class="btn btn-sun">✅ 叙事完成，做PPT/展板</button>` : ''}
                </div>

                ${narrative.aiGenerated ? `
                    <div style="margin-top:12px;padding:10px 14px;background:rgba(59,122,26,.1);border-radius:8px;border:1px solid rgba(59,122,26,.2)">
                        <span style="font-size:12px;color:var(--sea-l)">✨ 已使用AI辅助生成叙事内容</span>
                    </div>
                ` : ''}
            </div>
        `;
    },

    saveNarrative() {
        if (!this.levelResults['narrative']) this.levelResults['narrative'] = {};
        this.levelResults['narrative'].narrative = {
            story: document.getElementById('nar-story')?.value || '',
            concept: document.getElementById('nar-concept')?.value || '',
            experience: document.getElementById('nar-experience')?.value || '',
            future: document.getElementById('nar-future')?.value || ''
        };
        this.saveState();
        this.toast('叙事内容已保存！');
    },

    async generateNarrativeByAI() {
        this.toast('🤖 伍师正在帮你构思叙事...');
        await new Promise(r => setTimeout(r, 1500));
        const project = app.currentProject || { typeLabel: '别墅庭院设计' };
        const isNew = this.gameMode === 'new';
        const aiStory = isNew
            ? `这片土地曾经是一片沉寂的角落，直到我们决定赋予它新的生命。设计以"归隐"为核心，一方静水倒映天光云影，几块老山石诉说着岁月的故事。它不是被设计的，而是被发现的——原本就存在于这片土地上的诗意，我们只是轻轻拂去了尘埃。`
            : `这里曾是老厂区最热闹的角落，工人们下班后在这条路上走了三十年。改造没有抹去这些记忆，而是把它们变成了景观的底色——保留的老梧桐成了"记忆树阵"，原来的红砖墙变成了花境的背景，连地面上的裂缝都被设计成雨水花园的脉络。旧场地没有消失，它只是换了一种方式继续活着。`;
        const aiConcept = `以"${isNew ? '自然生长' : '记忆延续'}"为设计主线，通过空间层次的递进营造情绪节奏。核心策略：保留（Retain）— 转化（Transform）— 生长（Grow）。`;
        const aiExperience = `入口以密植形成"城市屏风"，隔绝喧嚣；转折处以一株造型松点亮视线，制造"意外之喜"；核心水景区采用"无边际"处理，让水面与天空融为一体，人在此处自然放慢脚步。`;
        const aiFuture = `第一年，骨架植物确立空间结构；第三年，中层植物丰满，季相变化显现；第五年，地被自然蔓延，景观进入"自我演化"阶段。这个设计不是终点，而是一个会自己长大的花园。`;

        if (!this.levelResults['narrative']) this.levelResults['narrative'] = {};
        this.levelResults['narrative'].narrative = {
            story: aiStory,
            concept: aiConcept,
            experience: aiExperience,
            future: aiFuture,
            aiGenerated: true
        };
        this.saveState();
        this.render();
        this.toast('✨ AI叙事生成完成！你可以在此基础上修改。');
    },

    // ─────────────────────────────────────────────────────
    // 第9关：PPT与展板（通用）
    // ─────────────────────────────────────────────────────
    renderPptboardLevel(level, result, project) {
        const narrative = this.levelResults['narrative']?.narrative;
        const pptGenerated = result.pptSlides;
        const boardGenerated = result.boardImage;
        return `
            <div style="margin-bottom:16px">
                <div style="font-size:13px;color:rgba(250,240,208,.5);margin-bottom:16px;line-height:1.8">
                    故事有了，现在要变成上台能讲的PPT、挂出来能震撼的展板。PPT要"一页一重点"，展板要"一眼看懂全部"。
                </div>

                ${narrative ? `
                    <div style="padding:12px 16px;background:rgba(255,255,255,.03);border-radius:8px;border:1px solid rgba(255,255,255,.06);margin-bottom:16px">
                        <div style="font-size:12px;color:rgba(250,240,208,.4);margin-bottom:6px">已完成的叙事内容：</div>
                        <div style="font-size:12px;color:var(--cream);line-height:1.6">
                            <strong>场地故事：</strong>${narrative.story?.substring(0, 60) || '未填写'}...<br>
                            <strong>设计理念：</strong>${narrative.concept?.substring(0, 60) || '未填写'}...
                        </div>
                    </div>
                ` : '<div style="color:var(--sun-f);margin-bottom:12px">⚠️ 先完成第8关景观叙事</div>'}

                <!-- PPT生成区 -->
                <div style="padding:20px;border-radius:12px;border:1px solid rgba(212,148,58,.15);background:rgba(212,148,58,.03);margin-bottom:16px">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
                        <span style="font-size:24px">📐</span>
                        <div>
                            <div style="font-size:15px;font-weight:700;color:var(--cream)">汇报PPT</div>
                            <div style="font-size:11px;color:rgba(250,240,208,.4)">让Kimi帮你生成完整的汇报演示文稿</div>
                        </div>
                    </div>

                    <div style="display:flex;gap:8px;margin-bottom:12px">
                        <select id="ppt-template" style="flex:1">
                            <option value="minimal">⬜ 极简商务风</option>
                            <option value="nature">🌿 自然生态风</option>
                            <option value="elegant">✨ 优雅油画风</option>
                            <option value="chinese">🏮 中式意境风</option>
                        </select>
                        <select id="ppt-pages" style="flex:1">
                            <option value="12">12页（精炼汇报）</option>
                            <option value="20">20页（标准汇报）</option>
                            <option value="30">30页（详细方案）</option>
                        </select>
                    </div>

                    ${!pptGenerated ? `
                        <button onclick="gameWorkflow.generatePPTInGame()" class="btn btn-sun" style="width:100%">📐 生成汇报PPT</button>
                    ` : ''}

                    ${pptGenerated ? `
                        <div style="margin-top:12px">
                            <div style="font-size:12px;color:var(--sea-l);margin-bottom:8px">✅ PPT已生成（${pptGenerated.length}页）</div>
                            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
                                ${pptGenerated.map((slide, i) => `
                                    <div style="aspect-ratio:16/9;background:linear-gradient(135deg,rgba(59,122,26,.2),rgba(20,100,160,.15));border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--cream);border:1px solid rgba(255,255,255,.1)">
                                        第${i+1}页
                                    </div>
                                `).join('')}
                            </div>
                            <div style="display:flex;gap:8px;justify-content:center;margin-top:8px">
                                <button onclick="gameWorkflow.generatePPTInGame()" class="btn btn-ghost btn-sm">🔄 重新生成</button>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- 展板生成区 -->
                <div style="padding:20px;border-radius:12px;border:1px solid rgba(140,48,96,.15);background:rgba(140,48,96,.03);margin-bottom:16px">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
                        <span style="font-size:24px">🎯</span>
                        <div>
                            <div style="font-size:15px;font-weight:700;color:var(--cream)">A1展板</div>
                            <div style="font-size:11px;color:rgba(250,240,208,.4)">让GPT Image生成精美的A1尺寸展板</div>
                        </div>
                    </div>

                    <div style="display:flex;gap:8px;margin-bottom:12px">
                        <select id="board-layout" style="flex:1">
                            <option value="classic">📋 经典三段式</option>
                            <option value="modern">⬜ 现代极简式</option>
                            <option value="story">📖 故事叙事式</option>
                            <option value="impact">💥 视觉冲击式</option>
                        </select>
                        <select id="board-style" style="flex:1">
                            <option value="watercolor">🖌️ 水彩渲染风</option>
                            <option value="realistic">🎨 写实照片风</option>
                            <option value="sketch">✏️ 线稿手绘风</option>
                            <option value="mixed">🌈 混合拼贴风</option>
                        </select>
                    </div>

                    ${!boardGenerated ? `
                        <button onclick="gameWorkflow.generateBoardInGame()" class="btn btn-sun" style="width:100%;background:linear-gradient(135deg,var(--sea-l),var(--palm-m))">🎯 生成A1展板</button>
                    ` : ''}

                    ${boardGenerated ? `
                        <div style="margin-top:12px">
                            <div style="font-size:12px;color:var(--sea-l);margin-bottom:8px">✅ A1展板已生成</div>
                            <img src="${boardGenerated}" style="width:100%;max-height:300px;object-fit:contain;border-radius:8px;border:1px solid rgba(255,255,255,.1)">
                            <div style="display:flex;gap:8px;justify-content:center;margin-top:8px">
                                <button onclick="gameWorkflow.generateBoardInGame()" class="btn btn-ghost btn-sm">🔄 重新生成</button>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div style="display:flex;gap:8px;justify-content:center">
                    ${pptGenerated && boardGenerated ? `
                        <button onclick="gameWorkflow.completeLevel('pptboard')" class="btn btn-sun">✅ PPT和展板都OK，最终交付！</button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    async generatePPTInGame() {
        this.toast('📐 Kimi正在生成PPT...');
        this.isLoading = true;
        this.render();
        await new Promise(r => setTimeout(r, 2500));
        if (!this.levelResults['pptboard']) this.levelResults['pptboard'] = {};
        this.levelResults['pptboard'].pptSlides = new Array(12).fill(null).map((_, i) => ({ page: i + 1 }));
        this.isLoading = false;
        this.saveState();
        this.render();
        this.toast('PPT生成完成！12页汇报文稿');
    },

    async generateBoardInGame() {
        this.toast('🎯 GPT Image正在绘制A1展板...');
        this.isLoading = true;
        this.render();
        await new Promise(r => setTimeout(r, 3000));
        const mockBoard = 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=80';
        if (!this.levelResults['pptboard']) this.levelResults['pptboard'] = {};
        this.levelResults['pptboard'].boardImage = mockBoard;
        this.isLoading = false;
        this.saveState();
        this.render();
        this.toast('A1展板生成完成！');
    },

    // ─────────────────────────────────────────────────────
    // 第10关：最终交付（新建）
    // ─────────────────────────────────────────────────────
    renderDeliverLevel(level, result, project) {
        const allResults = this.levelResults;
        const levels = this.gameMode === 'new' ? this.newLevels : this.renovationLevels;
        const completed = levels.filter(l => allResults[l.id]?.completed).length;
        const isNew = this.gameMode === 'new';
        const narrative = allResults['narrative']?.narrative;
        const pptboard = allResults['pptboard'];
        return `
            <div style="text-align:center;padding:20px">
                <div style="font-size:64px;margin-bottom:16px" class="game-bounce">🏆</div>
                <h3 style="font-size:20px;font-weight:700;color:var(--cream);margin-bottom:8px">恭喜通关！</h3>
                <p style="color:rgba(250,240,208,.5);margin-bottom:24px">你已完成「${isNew ? '新建项目' : '改造项目'}」全部 ${completed}/${levels.length} 关</p>

                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:24px;text-align:left">
                    ${levels.map(l => {
                        const r = allResults[l.id];
                        const done = r?.completed;
                        return `
                            <div style="padding:12px;border-radius:8px;border:1px solid ${done ? 'rgba(59,122,26,.3)' : 'rgba(255,255,255,.06)'};background:${done ? 'rgba(59,122,26,.08)' : 'rgba(255,255,255,.02)'}">
                                <div style="display:flex;align-items:center;gap:8px">
                                    <span style="font-size:20px">${done ? '✅' : '⬜'}</span>
                                    <span style="font-size:13px;color:var(--cream)">${l.title}</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                ${narrative ? `
                    <div style="text-align:left;padding:16px;border-radius:10px;border:1px solid rgba(180,88,144,.2);background:rgba(180,88,144,.05);margin-bottom:20px">
                        <div style="font-size:14px;font-weight:700;color:var(--cream);margin-bottom:12px">📖 你的景观叙事</div>
                        <div style="font-size:12px;color:rgba(250,240,208,.6);line-height:1.8">
                            <div style="margin-bottom:6px"><strong style="color:var(--cream)">场地故事：</strong>${narrative.story?.substring(0, 80) || ''}...</div>
                            <div style="margin-bottom:6px"><strong style="color:var(--cream)">设计理念：</strong>${narrative.concept?.substring(0, 80) || ''}...</div>
                            <div style="margin-bottom:6px"><strong style="color:var(--cream)">空间体验：</strong>${narrative.experience?.substring(0, 80) || ''}...</div>
                            <div><strong style="color:var(--cream)">未来愿景：</strong>${narrative.future?.substring(0, 80) || ''}...</div>
                        </div>
                    </div>
                ` : ''}

                ${pptboard ? `
                    <div style="display:flex;gap:12px;justify-content:center;margin-bottom:20px">
                        ${pptboard.pptSlides ? `
                            <div style="padding:12px 20px;border-radius:8px;border:1px solid rgba(212,148,58,.2);background:rgba(212,148,58,.05)">
                                <div style="font-size:20px;margin-bottom:4px">📐</div>
                                <div style="font-size:13px;color:var(--cream)">汇报PPT</div>
                                <div style="font-size:11px;color:var(--sea-l)">${pptboard.pptSlides.length}页 ✅</div>
                            </div>
                        ` : ''}
                        ${pptboard.boardImage ? `
                            <div style="padding:12px 20px;border-radius:8px;border:1px solid rgba(140,48,96,.2);background:rgba(140,48,96,.05)">
                                <div style="font-size:20px;margin-bottom:4px">🎯</div>
                                <div style="font-size:13px;color:var(--cream)">A1展板</div>
                                <div style="font-size:11px;color:var(--sea-l)">已生成 ✅</div>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}

                <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
                    <button onclick="gameWorkflow.downloadAll()" class="btn btn-sun">📦 打包下载全部成果</button>
                    <button onclick="gameWorkflow.clearState();gameWorkflow.render();" class="btn btn-ghost">🎮 开启新冒险</button>
                </div>
            </div>
        `;
    },

    // ═══════════════════════════════════════════════════════
    // 改造项目关卡
    // ═══════════════════════════════════════════════════════

    // 第1关：现状照片
    renderPhotosLevel(level, result, project) {
        const hasPhotos = result.photos && result.photos.length > 0;
        return `
            <div style="margin-bottom:16px">
                <div style="font-size:13px;color:rgba(250,240,208,.5);margin-bottom:12px;line-height:1.8">
                    改造项目必须先全面了解现状。请上传多角度照片，至少包含一张鸟瞰或高位视角。<br>
                    照片越多，AI分析的改造策略越精准。
                </div>
                <div id="photos-upload-zone" style="border:2px dashed rgba(212,148,58,.3);border-radius:12px;padding:40px;text-align:center;cursor:pointer;transition:all .2s;background:rgba(255,255,255,.02)"
                     onclick="document.getElementById('photos-input').click()"
                     ondragover="event.preventDefault();this.style.borderColor='var(--sun-l)';this.style.background='rgba(212,148,58,.08)'"
                     ondragleave="this.style.borderColor='rgba(212,148,58,.3)';this.style.background='rgba(255,255,255,.02)'"
                     ondrop="event.preventDefault();gameWorkflow.handlePhotosDrop(event)">
                    <div style="font-size:48px;margin-bottom:12px">📸</div>
                    <div style="font-size:14px;color:var(--cream);margin-bottom:4px">点击或拖拽上传现状照片</div>
                    <div style="font-size:12px;color:rgba(250,240,208,.4)">支持多张上传，JPG/PNG，每张最大 10MB</div>
                    <input type="file" id="photos-input" style="display:none" accept="image/*" multiple onchange="gameWorkflow.handlePhotosUpload(this)">
                </div>
                ${hasPhotos ? `
                    <div style="margin-top:16px">
                        <div style="font-size:12px;color:var(--sea-l);margin-bottom:8px">✅ 已上传 ${result.photos.length} 张照片</div>
                        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
                            ${result.photos.map(p => `<img src="${p}" style="width:100%;height:100px;object-fit:cover;border-radius:6px;border:1px solid rgba(255,255,255,.1)">`).join('')}
                        </div>
                        <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
                            <button onclick="gameWorkflow.completeLevel('photos')" class="btn btn-sun">✅ 照片齐全，生成总图</button>
                            <button onclick="gameWorkflow.regenerateLevel('photos')" class="btn btn-ghost btn-sm">🔄 重新上传</button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    handlePhotosUpload(input) {
        const files = Array.from(input.files);
        if (!files.length) return;
        const photos = [];
        let loaded = 0;
        files.forEach(file => {
            if (file.size > 10 * 1024 * 1024) { alert('文件太大: ' + file.name); return; }
            const reader = new FileReader();
            reader.onload = (e) => {
                photos.push(e.target.result);
                loaded++;
                if (loaded === files.length) {
                    if (!this.levelResults['photos']) this.levelResults['photos'] = {};
                    this.levelResults['photos'].photos = photos;
                    this.saveState();
                    this.render();
                    this.toast(`已上传 ${photos.length} 张照片！`);
                }
            };
            reader.readAsDataURL(file);
        });
    },

    handlePhotosDrop(e) {
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (!files.length) return;
        const photos = [];
        let loaded = 0;
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                photos.push(ev.target.result);
                loaded++;
                if (loaded === files.length) {
                    if (!this.levelResults['photos']) this.levelResults['photos'] = {};
                    this.levelResults['photos'].photos = photos;
                    this.saveState();
                    this.render();
                    this.toast(`已上传 ${photos.length} 张照片！`);
                }
            };
            reader.readAsDataURL(file);
        });
    },

    // 第2关：生成总图
    renderMasterplanLevel(level, result, project) {
        const photos = this.levelResults['photos']?.photos;
        const generated = result.masterplanImage;
        return `
            <div style="margin-bottom:16px">
                ${photos ? `
                    <div style="margin-bottom:12px">
                        <div style="font-size:12px;color:rgba(250,240,208,.5);margin-bottom:8px">参考现状：</div>
                        <img src="${photos[0]}" style="max-width:200px;max-height:150px;border-radius:8px;border:1px solid rgba(255,255,255,.1);opacity:.7">
                    </div>
                ` : '<div style="color:var(--sun-f);margin-bottom:12px">⚠️ 先完成第1关现状照片</div>'}

                <div style="font-size:13px;color:rgba(250,240,208,.5);margin-bottom:12px;line-height:1.8">
                    AI根据现状照片，直接生成改造后的效果图。这张图将成为整个项目的"总图"，后续所有图纸都要与它统一。
                </div>

                <div style="display:flex;gap:8px;margin-bottom:16px">
                    <select id="mp-style" style="flex:1">
                        <option value="realistic">🎨 写实照片级</option>
                        <option value="sketch">✏️ 手绘风格</option>
                        <option value="watercolor">🖌️ 水彩渲染</option>
                    </select>
                </div>

                ${!generated ? `
                    <button onclick="gameWorkflow.generateMasterplan()" class="btn btn-sun" style="width:100%">🗺️ 生成改造总图</button>
                ` : ''}

                ${generated ? `
                    <div style="margin-top:16px">
                        <div style="font-size:12px;color:var(--sea-l);margin-bottom:8px">✅ 改造总图已生成</div>
                        <img src="${generated}" style="max-width:100%;max-height:350px;border-radius:8px;border:1px solid rgba(255,255,255,.1)">
                        <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
                            <button onclick="gameWorkflow.completeLevel('masterplan')" class="btn btn-sun">✅ 总图确定，反推平面</button>
                            <button onclick="gameWorkflow.generateMasterplan()" class="btn btn-ghost btn-sm">🔄 重新生成</button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    async generateMasterplan() {
        this.isLoading = true;
        this.render();
        await new Promise(r => setTimeout(r, 2500));
        const mockImages = [
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
            'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80'
        ];
        const randomImg = mockImages[Math.floor(Math.random() * mockImages.length)];
        if (!this.levelResults['masterplan']) this.levelResults['masterplan'] = {};
        this.levelResults['masterplan'].masterplanImage = randomImg;
        this.isLoading = false;
        this.saveState();
        this.render();
        this.toast('改造总图生成完成！');
    },

    // 第3关：反推平面
    renderReverseLevel(level, result, project) {
        const masterplan = this.levelResults['masterplan']?.masterplanImage;
        const generated = result.reversePlan;
        return `
            <div style="margin-bottom:16px">
                ${masterplan ? `
                    <div style="margin-bottom:12px">
                        <div style="font-size:12px;color:rgba(250,240,208,.5);margin-bottom:8px">总图参考：</div>
                        <img src="${masterplan}" style="max-width:200px;max-height:150px;border-radius:8px;border:1px solid rgba(255,255,255,.1);opacity:.7">
                    </div>
                ` : '<div style="color:var(--sun-f);margin-bottom:12px">⚠️ 先完成第2关生成总图</div>'}

                <div style="font-size:13px;color:rgba(250,240,208,.5);margin-bottom:12px;line-height:1.8">
                    AI从效果图反推平面布局。分析效果图中的空间关系、道路走向、功能分区，生成对应的平面布置图。
                </div>

                ${!generated ? `
                    <button onclick="gameWorkflow.generateReverse()" class="btn btn-sun" style="width:100%">🔄 反推生成平面布局</button>
                ` : ''}

                ${generated ? `
                    <div style="margin-top:16px">
                        <div style="font-size:12px;color:var(--sea-l);margin-bottom:8px">✅ 反推平面已生成</div>
                        <img src="${generated}" style="max-width:100%;max-height:350px;border-radius:8px;border:1px solid rgba(255,255,255,.1)">
                        <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
                            <button onclick="gameWorkflow.completeLevel('reverse')" class="btn btn-sun">✅ 平面合理，出多视角</button>
                            <button onclick="gameWorkflow.generateReverse()" class="btn btn-ghost btn-sm">🔄 重新反推</button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    async generateReverse() {
        this.isLoading = true;
        this.render();
        await new Promise(r => setTimeout(r, 2000));
        const mockImages = [
            'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&q=80',
            'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80'
        ];
        const randomImg = mockImages[Math.floor(Math.random() * mockImages.length)];
        if (!this.levelResults['reverse']) this.levelResults['reverse'] = {};
        this.levelResults['reverse'].reversePlan = randomImg;
        this.isLoading = false;
        this.saveState();
        this.render();
        this.toast('反推平面生成完成！');
    },

    // 第4关：多视角效果
    renderMultiviewLevel(level, result, project) {
        const reverse = this.levelResults['reverse']?.reversePlan;
        const generated = result.multiviewImages;
        return `
            <div style="margin-bottom:16px">
                ${reverse ? `
                    <div style="margin-bottom:12px">
                        <div style="font-size:12px;color:rgba(250,240,208,.5);margin-bottom:8px">反推平面参考：</div>
                        <img src="${reverse}" style="max-width:200px;max-height:150px;border-radius:8px;border:1px solid rgba(255,255,255,.1);opacity:.7">
                    </div>
                ` : '<div style="color:var(--sun-f);margin-bottom:12px">⚠️ 先完成第3关反推平面</div>'}

                <div style="font-size:13px;color:rgba(250,240,208,.5);margin-bottom:12px;line-height:1.8">
                    生成多视角效果图，包括人视、鸟瞰、节点特写。所有图必须与总图统一风格。
                </div>

                <div style="display:flex;gap:8px;margin-bottom:16px">
                    <select id="mv-views" style="flex:1">
                        <option value="3">🖼️ 3张（基本套装）</option>
                        <option value="5">🖼️ 5张（标准套装）</option>
                        <option value="8">🖼️ 8张（完整套装）</option>
                    </select>
                </div>

                ${(!generated || generated.length === 0) ? `
                    <button onclick="gameWorkflow.generateMultiview()" class="btn btn-sun" style="width:100%">🖼️ 生成多视角效果图</button>
                ` : ''}

                ${generated && generated.length > 0 ? `
                    <div style="margin-top:16px">
                        <div style="font-size:12px;color:var(--sea-l);margin-bottom:8px">✅ 已生成 ${generated.length} 张多视角效果图</div>
                        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
                            ${generated.map((img, i) => `
                                <div style="position:relative">
                                    <img src="${img}" style="width:100%;height:180px;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,.1)">
                                    <div style="position:absolute;bottom:8px;left:8px;padding:4px 8px;background:rgba(0,0,0,.6);border-radius:4px;font-size:11px;color:#fff">${['人视','鸟瞰','节点','夜景','细节','晨景'][i] || '视角'}</div>
                                </div>
                            `).join('')}
                        </div>
                        <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
                            <button onclick="gameWorkflow.completeLevel('multiview')" class="btn btn-sun">✅ 效果图通过，出精确CAD</button>
                            <button onclick="gameWorkflow.generateMultiview()" class="btn btn-ghost btn-sm">🔄 重新生成</button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    async generateMultiview() {
        this.isLoading = true;
        this.render();
        await new Promise(r => setTimeout(r, 3000));
        const mockImages = [
            'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600&q=80',
            'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=600&q=80',
            'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=600&q=80',
            'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=600&q=80'
        ];
        if (!this.levelResults['multiview']) this.levelResults['multiview'] = {};
        this.levelResults['multiview'].multiviewImages = mockImages.slice(0, 3);
        this.isLoading = false;
        this.saveState();
        this.render();
        this.toast('多视角效果图生成完成！');
    },

    // 第5关：精确CAD
    renderPrecadLevel(level, result, project) {
        const multiview = this.levelResults['multiview']?.multiviewImages;
        const generated = result.precadImage;
        return `
            <div style="margin-bottom:16px">
                <div style="font-size:13px;color:rgba(250,240,208,.5);margin-bottom:12px;line-height:1.8">
                    效果图甲方通过了！现在生成精确施工图纸。AI会根据平面图和效果图，标注清楚拆改范围、保留内容、新增尺寸。
                </div>

                <div style="display:flex;gap:8px;margin-bottom:16px">
                    <select id="pcad-type" style="flex:1">
                        <option value="demo">🔨 拆改图</option>
                        <option value="plant">🌿 植物配置图</option>
                        <option value="paving">🧱 铺装详图</option>
                        <option value="full">📋 全套施工图</option>
                    </select>
                </div>

                ${!generated ? `
                    <button onclick="gameWorkflow.generatePrecad()" class="btn btn-sun" style="width:100%">📏 生成精确CAD施工图纸</button>
                ` : ''}

                ${generated ? `
                    <div style="margin-top:16px">
                        <div style="font-size:12px;color:var(--sea-l);margin-bottom:8px">✅ CAD施工图纸已生成</div>
                        <img src="${generated}" style="max-width:100%;max-height:350px;border-radius:8px;border:1px solid rgba(255,255,255,.1)">
                        <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
                            <button onclick="gameWorkflow.completeLevel('precad')" class="btn btn-sun">✅ 图纸完成，准备交付</button>
                            <button onclick="gameWorkflow.generatePrecad()" class="btn btn-ghost btn-sm">🔄 重新生成</button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    async generatePrecad() {
        this.isLoading = true;
        this.render();
        await new Promise(r => setTimeout(r, 2000));
        const mockImages = [
            'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80',
            'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=80'
        ];
        const randomImg = mockImages[Math.floor(Math.random() * mockImages.length)];
        if (!this.levelResults['precad']) this.levelResults['precad'] = {};
        this.levelResults['precad'].precadImage = randomImg;
        this.isLoading = false;
        this.saveState();
        this.render();
        this.toast('CAD施工图纸生成完成！');
    },

    // ═══════════════════════════════════════════════════════
    // 通用关卡操作
    // ═══════════════════════════════════════════════════════
    completeLevel(levelId) {
        if (!this.levelResults[levelId]) this.levelResults[levelId] = {};
        this.levelResults[levelId].completed = true;
        this.levelResults[levelId].completedAt = new Date().toISOString();

        // 奖励金币
        this.coins += 20;

        // 检查成就
        this.checkAchievements();
        this.saveState();

        // 通关动画
        this.showLevelComplete(levelId);
    },

    regenerateLevel(levelId) {
        if (this.levelResults[levelId]) {
            this.levelResults[levelId] = {};
            this.saveState();
            this.render();
        }
    },

    prevLevel() {
        if (this.currentLevel > 0) {
            this.currentLevel--;
            this.saveState();
            this.render();
        }
    },

    nextLevel() {
        const levels = this.gameMode === 'new' ? this.newLevels : this.renovationLevels;
        if (this.currentLevel < levels.length - 1) {
            this.currentLevel++;
            this.saveState();
            this.render();
        }
    },

    // 专家助力
    callExpert(levelId) {
        const levels = this.gameMode === 'new' ? this.newLevels : this.renovationLevels;
        const level = levels.find(l => l.id === levelId);
        if (!level || level.expertCost <= 0) return;
        if (this.coins < level.expertCost) {
            alert('💰 金币不足！完成关卡可以获得金币奖励。');
            return;
        }
        if (confirm(`👨‍🏫 ${level.expertText}\n\n需要消耗 ${level.expertCost} 金币，确认使用专家助力？`)) {
            this.coins -= level.expertCost;
            this.expertUsed[levelId] = true;
            this.saveState();
            this.toast('✨ 伍师专家助力已激活！');
            this.render();
        }
    },

    // 存档
    saveCheckpoint() {
        const checkpoints = JSON.parse(localStorage.getItem('gameWorkflow_checkpoints') || '[]');
        const cp = {
            id: 'cp_' + Date.now(),
            time: new Date().toLocaleString(),
            gameMode: this.gameMode,
            currentLevel: this.currentLevel,
            levelResults: JSON.parse(JSON.stringify(this.levelResults)),
            achievements: [...this.achievements],
            coins: this.coins,
            expertUsed: {...this.expertUsed}
        };
        checkpoints.unshift(cp);
        if (checkpoints.length > 10) checkpoints.pop(); // 保留最近10个
        localStorage.setItem('gameWorkflow_checkpoints', JSON.stringify(checkpoints));
        this.toast('💾 存档成功！');
    },

    showCheckpointList() {
        const checkpoints = JSON.parse(localStorage.getItem('gameWorkflow_checkpoints') || '[]');
        const modal = document.createElement('div');
        modal.id = 'checkpoint-modal';
        modal.innerHTML = `
            <div style="position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:10000;display:flex;align-items:center;justify-content:center"
                 onclick="if(event.target===this)document.getElementById('checkpoint-modal').remove()">
                <div style="width:500px;max-height:70vh;overflow:auto;background:var(--deep);border:1px solid rgba(212,148,58,.2);border-radius:var(--r);padding:24px">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
                        <h3 style="font-size:18px;color:var(--cream)">📂 存档列表</h3>
                        <button onclick="document.getElementById('checkpoint-modal').remove()" style="background:none;border:none;color:rgba(250,240,208,.5);cursor:pointer;font-size:20px">×</button>
                    </div>
                    ${checkpoints.length === 0 ? '<p style="color:rgba(250,240,208,.4);text-align:center">暂无存档</p>' : `
                        <div style="display:flex;flex-direction:column;gap:8px">
                            ${checkpoints.map((cp, i) => `
                                <div style="padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:8px;cursor:pointer;transition:all .2s"
                                     onmouseover="this.style.borderColor='var(--sun-l)'" onmouseout="this.style.borderColor='rgba(255,255,255,.08)'"
                                     onclick="gameWorkflow.loadCheckpoint('${cp.id}')">
                                    <div style="display:flex;justify-content:space-between">
                                        <span style="font-size:13px;color:var(--cream)">存档 ${i+1} — ${cp.gameMode === 'new' ? '新建项目' : '改造项目'} 第${cp.currentLevel+1}关</span>
                                        <span style="font-size:11px;color:rgba(250,240,208,.4)">${cp.time}</span>
                                    </div>
                                    <div style="font-size:11px;color:rgba(250,240,208,.4);margin-top:4px">💰 ${cp.coins} | 🏅 ${cp.achievements.length} 个成就</div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    loadCheckpoint(cpId) {
        const checkpoints = JSON.parse(localStorage.getItem('gameWorkflow_checkpoints') || '[]');
        const cp = checkpoints.find(c => c.id === cpId);
        if (!cp) return;
        this.gameMode = cp.gameMode;
        this.currentLevel = cp.currentLevel;
        this.levelResults = cp.levelResults;
        this.achievements = cp.achievements;
        this.coins = cp.coins;
        this.expertUsed = cp.expertUsed;
        this.saveState();
        document.getElementById('checkpoint-modal')?.remove();
        this.render();
        this.toast('📂 读档成功！');
    },

    // 关卡地图
    showLevelMap() {
        const levels = this.gameMode === 'new' ? this.newLevels : this.renovationLevels;
        const modal = document.createElement('div');
        modal.id = 'levelmap-modal';

        // 每行几个节点
        const perRow = 5;

        // 计算每个节点的状态
        const nodes = levels.map((l, i) => {
            const done = this.levelResults[l.id]?.completed;
            const isCurrent = i === this.currentLevel;
            const unlocked = done || i <= this.currentLevel + 1;
            return { ...l, done, isCurrent, unlocked, index: i };
        });

        // 使用 CSS Grid 的蛇形排列：偶数行正序，奇数行反序
        const gridItems = [];
        const rowCount = Math.ceil(nodes.length / perRow);
        for (let r = 0; r < rowCount; r++) {
            const startIdx = r * perRow;
            const endIdx = Math.min(startIdx + perRow, nodes.length);
            const rowNodes = nodes.slice(startIdx, endIdx);
            // 偶数行正序，奇数行反序
            if (r % 2 === 1) rowNodes.reverse();
            gridItems.push(...rowNodes.map((n, idx) => ({ ...n, gridRow: r + 1, gridCol: r % 2 === 0 ? idx + 1 : perRow - idx })));
        }

        // 生成节点HTML — 用 grid cell 包裹，内部卡片居中
        const nodeHTML = gridItems.map(n => {
            const glow = n.isCurrent ? `box-shadow:0 0 25px ${n.color}60,0 0 50px ${n.color}30;animation:nodePulse 2s ease infinite;` : n.done ? `box-shadow:0 0 15px ${n.color}30;` : `box-shadow:0 2px 8px rgba(0,0,0,.3);`;
            const bg = n.isCurrent ? `linear-gradient(135deg,${n.color},var(--palm-m))` : n.done ? `linear-gradient(135deg,${n.color},#1a1a2e)` : `linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.02))`;
            const borderColor = n.isCurrent ? n.color : n.done ? `rgba(59,122,26,.5)` : `rgba(255,255,255,.08)`;
            const borderWidth = n.isCurrent ? '3px' : '2px';
            const opacity = n.unlocked ? 1 : 0.4;
            const cursor = n.unlocked ? 'pointer' : 'not-allowed';
            const onclick = n.unlocked ? `onclick="gameWorkflow.jumpToLevel(${n.index});document.getElementById('levelmap-modal').remove()"` : '';
            const statusText = n.isCurrent ? '🎯 当前' : n.done ? '✅ 通关' : n.unlocked ? '🔓 可进入' : '🔒 未解锁';

            return `
                <div ${onclick}
                     style="grid-column:${n.gridCol};grid-row:${n.gridRow};display:flex;align-items:center;justify-content:center;${cursor};padding:8px;"
                     class="level-map-node">
                    <div style="width:100%;max-width:140px;aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border-radius:18px;border:${borderWidth} solid ${borderColor};background:${bg};${glow};opacity:${opacity};transition:all .3s;padding:10px;position:relative;"
                         onmouseover="this.style.transform='scale(1.08)';this.style.zIndex='2'"
                         onmouseout="this.style.transform='scale(1)';this.style.zIndex='1'">
                        <div style="font-size:32px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.3))">${n.icon}</div>
                        <div style="font-size:13px;font-weight:700;color:var(--cream);text-align:center;line-height:1.3">${n.title.replace(/第\d+关：/, '')}</div>
                        <div style="font-size:11px;color:${n.isCurrent ? 'var(--sun-f)' : 'rgba(250,240,208,.5)'};text-align:center;font-weight:600">${statusText}</div>
                    </div>
                </div>
            `;
        }).join('');

        // 计算 grid 需要多少空位来补齐
        const totalCells = rowCount * perRow;
        const emptyCells = totalCells - nodes.length;

        modal.innerHTML = `
            <div style="position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px"
                 onclick="if(event.target===this)document.getElementById('levelmap-modal').remove()">
                <div style="width:960px;max-width:96vw;max-height:85vh;overflow-y:auto;background:linear-gradient(135deg,var(--ink-m),var(--ink));border:2px solid rgba(212,148,58,.3);border-radius:24px;padding:32px;box-shadow:0 20px 60px rgba(0,0,0,.5),0 0 40px rgba(212,148,58,.1);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:28px">
                        <div>
                            <h3 style="font-size:24px;color:var(--cream);margin-bottom:4px;font-weight:900">🗺️ 关卡地图</h3>
                            <div style="font-size:15px;color:rgba(250,240,208,.5)">${this.gameMode === 'new' ? '新建项目 · 10关挑战' : '改造项目 · 8关挑战'}</div>
                        </div>
                        <button onclick="document.getElementById('levelmap-modal').remove()" style="background:none;border:none;color:rgba(250,240,208,.5);cursor:pointer;font-size:28px;width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:all .2s"
                                onmouseover="this.style.background='rgba(255,255,255,.1)'" onmouseout="this.style.background='none'">×</button>
                    </div>

                    <!-- 蛇形地图网格 -->
                    <div style="display:grid;grid-template-columns:repeat(${perRow},1fr);grid-template-rows:repeat(${rowCount},minmax(140px,1fr));gap:12px;background:radial-gradient(ellipse at center,rgba(27,74,10,.08) 0%,transparent 70%);border-radius:20px;border:1px solid rgba(212,148,58,.1);padding:24px;position:relative;">
                        ${nodeHTML}
                        ${Array(emptyCells).fill('<div></div>').join('')}
                    </div>

                    <div style="display:flex;gap:20px;margin-top:24px;justify-content:center;flex-wrap:wrap">
                        <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)">
                            <span style="width:14px;height:14px;border-radius:50%;background:linear-gradient(135deg,var(--sun),var(--palm-m));border:2px solid var(--sun);box-shadow:0 0 8px rgba(232,160,32,.3)"></span>
                            <span style="font-size:14px;color:rgba(250,240,208,.7);font-weight:600">当前关卡</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)">
                            <span style="width:14px;height:14px;border-radius:50%;background:linear-gradient(135deg,var(--sea-l),#1a1a2e);border:2px solid rgba(59,122,26,.5)"></span>
                            <span style="font-size:14px;color:rgba(250,240,208,.7);font-weight:600">已通关</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)">
                            <span style="width:14px;height:14px;border-radius:50%;background:linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.02));border:2px solid rgba(255,255,255,.08)"></span>
                            <span style="font-size:14px;color:rgba(250,240,208,.7);font-weight:600">未解锁</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 注入节点脉冲动画
        const style = document.createElement('style');
        style.textContent = `
            @keyframes nodePulse { 0%,100% { box-shadow:0 0 25px rgba(232,160,32,.5),0 0 50px rgba(232,160,32,.2); } 50% { box-shadow:0 0 35px rgba(232,160,32,.7),0 0 60px rgba(232,160,32,.4); } }
        `;
        modal.appendChild(style);
        document.body.appendChild(modal);
    },

    jumpToLevel(idx) {
        const levels = this.gameMode === 'new' ? this.newLevels : this.renovationLevels;
        // 只能跳到已完成的下一关，或已完成的关卡
        const canJump = idx <= this.currentLevel + 1 || this.levelResults[levels[idx]?.id]?.completed;
        if (!canJump) {
            this.toast('🔒 先完成前面的关卡！');
            return;
        }
        this.currentLevel = idx;
        this.saveState();
        this.render();
    },

    // 成就检查
    checkAchievements() {
        const completedCount = Object.values(this.levelResults).filter(r => r.completed).length;
        const levels = this.gameMode === 'new' ? this.newLevels : this.renovationLevels;
        const totalLevels = levels.length;
        const expertCount = Object.keys(this.expertUsed).length;

        const unlock = (id) => {
            if (!this.achievements.includes(id)) {
                this.achievements.push(id);
                const a = this.achievementList.find(x => x.id === id);
                if (a) this.toast(`🏅 解锁成就：${a.icon} ${a.title}！`, 3000);
            }
        };

        if (completedCount >= 1) unlock('first_blood');
        if (completedCount >= Math.floor(totalLevels / 2)) unlock('halfway');
        if (expertCount >= 3) unlock('expert_user');
        if (expertCount >= totalLevels) unlock('perfection');
        if (completedCount === totalLevels) unlock('champion');
    },

    // 通关动画
    showLevelComplete(levelId) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column';
        overlay.innerHTML = `
            <div style="font-size:80px;margin-bottom:16px" class="game-bounce">🎉</div>
            <div style="font-size:24px;font-weight:700;color:var(--sun-l);margin-bottom:8px">关卡完成！</div>
            <div style="font-size:14px;color:rgba(250,240,208,.7);margin-bottom:24px">获得奖励：20💰 + 经验值</div>
            <button onclick="this.parentElement.remove();gameWorkflow.nextLevel()" class="btn btn-sun" style="font-size:16px;padding:12px 32px">下一关 ➡️</button>
        `;
        document.body.appendChild(overlay);
        setTimeout(() => overlay.remove(), 4000);
    },

    showVictory() {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column';
        overlay.innerHTML = `
            <div style="font-size:100px;margin-bottom:20px" class="game-bounce">🏆</div>
            <div style="font-size:32px;font-weight:700;color:var(--sun-l);margin-bottom:12px">通关大吉！</div>
            <div style="font-size:16px;color:rgba(250,240,208,.7);margin-bottom:8px">你已成为「伍师设计大师」</div>
            <div style="font-size:14px;color:rgba(250,240,208,.5);margin-bottom:32px">🏅 已解锁 ${this.achievements.length} 个成就 | 💰 剩余 ${this.coins} 金币</div>
            <div style="display:flex;gap:12px">
                <button onclick="this.parentElement.parentElement.remove();gameWorkflow.downloadAll()" class="btn btn-sun">📦 下载全部成果</button>
                <button onclick="this.parentElement.parentElement.remove()" class="btn btn-ghost">返回工作台</button>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    // 交付操作
    downloadAll() {
        this.toast('📦 正在打包全部成果...');
        setTimeout(() => this.toast('✅ 下载已开始！'), 1500);
    },

    generatePPT() {
        this.toast('📐 正在生成汇报PPT...');
        app.navigate('ppt-studio');
    },

    generateBoard() {
        this.toast('🎯 正在生成A1展板...');
        app.navigate('image-studio');
    },

    // Toast提示
    toast(msg, duration = 2000) {
        const existing = document.getElementById('game-toast');
        if (existing) existing.remove();
        const t = document.createElement('div');
        t.id = 'game-toast';
        t.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);z-index:100000;padding:12px 24px;background:linear-gradient(135deg,var(--deep),rgba(20,20,35,.95));border:1px solid var(--sun-l);border-radius:8px;color:var(--cream);font-size:14px;box-shadow:0 8px 32px rgba(0,0,0,.4);animation:toastIn .3s ease';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, duration);
    }
};

// 全局暴露
window.gameWorkflow = gameWorkflow;

// CSS动画注入
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(-10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        @keyframes gamePulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.1); } }
        @keyframes gameBounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
        .game-pulse { animation:gamePulse 1.5s ease infinite; }
        .game-bounce { animation:gameBounce 1s ease infinite; }
    `;
    document.head.appendChild(style);
});
