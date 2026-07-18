/**
 * 伍师浅谈设计助手 - 主应用控制器
 * 路由、状态管理、数据持久化
 */

const app = {
    currentPage: 'dashboard',
    projects: [],
    currentProject: null,
    user: { plan: 'free', credits: 3 },

    init() {
        this.loadData();
        this.renderRecentProjects();
        this.setupKeyboardShortcuts();
        console.log('🌴 伍师浅谈设计助手已启动');
    },

    // ═══════════════════════════════════════════════════════
    // 页面路由
    // ═══════════════════════════════════════════════════════
    navigate(page) {
        document.querySelectorAll('.page-section').forEach(s => s.classList.remove('on'));
        document.querySelectorAll('.npill').forEach(b => b.classList.remove('on'));
        document.querySelectorAll('.s-item').forEach(b => b.classList.remove('active'));

        const target = document.getElementById(`page-${page}`);
        if (target) {
            target.classList.add('on');
            this.currentPage = page;

            const navBtn = document.querySelector(`.npill[data-page="${page}"]`);
            if (navBtn) navBtn.classList.add('on');

            const sidebarMap = {
                'guide': 0, 'workflow': 1, 'image-studio': 2, 'ppt-studio': 3,
                'projects': 4, 'subscription': 5
            };
            const sidebarItems = document.querySelectorAll('.s-item');
            const idx = sidebarMap[page];
            if (idx !== undefined && sidebarItems[idx]) {
                sidebarItems[idx].classList.add('active');
            }

            if (page === 'guide') { if (aiGuide) aiGuide.init(); }
            if (page === 'workflow') gameWorkflow.init();
            if (page === 'image-studio') imageStudio.init();
            if (page === 'ppt-studio') pptGen.init();
            if (page === 'projects') this.renderProjectsPage();

            this.updateProgress(page);
        }
        window.scrollTo(0, 0);
    },

    updateProgress(page) {
        const progressMap = {
            'dashboard': 0, 'guide': 5, 'workflow': 15,
            'image-studio': 60, 'ppt-studio': 80, 'projects': 100, 'subscription': 100
        };
        let pct = progressMap[page] || 0;
        // 游戏化工作流进度
        if (page === 'workflow' && gameWorkflow) {
            const levels = gameWorkflow.gameMode === 'new' ? gameWorkflow.newLevels : gameWorkflow.renovationLevels;
            const completed = Object.values(gameWorkflow.levelResults).filter(r => r.completed).length;
            const total = levels?.length || 8;
            pct = 15 + Math.round((completed / total) * 55);
        }
        const fill = document.getElementById('xp-fill');
        const num = document.getElementById('xp-num');
        if (fill) fill.style.width = pct + '%';
        if (num) {
            const labels = { 0: '开始设计', 5: '场地分析', 15: '游戏关卡', 60: '效果图', 80: 'PPT/展板', 100: '交付完成' };
            num.textContent = labels[pct] || '进行中';
        }
    },

    // ═══════════════════════════════════════════════════════
    // 项目管理
    // ═══════════════════════════════════════════════════════
    createProject(projectData) {
        const project = {
            id: 'proj_' + Date.now(),
            name: projectData.name || '未命名项目',
            type: projectData.type,
            typeLabel: projectData.typeLabel,
            createdAt: new Date().toISOString(),
            status: 'active',
            progress: 0,
            qaHistory: projectData.qaHistory || [],
            summary: projectData.summary || '',
            images: [],
            pptSlides: [],
            boardImage: null,
            workflowNodes: []
        };
        this.projects.unshift(project);
        this.currentProject = project;
        this.saveData();
        return project;
    },

    updateProject(id, updates) {
        const idx = this.projects.findIndex(p => p.id === id);
        if (idx >= 0) {
            this.projects[idx] = { ...this.projects[idx], ...updates };
            if (this.currentProject?.id === id) this.currentProject = this.projects[idx];
            this.saveData();
        }
    },

    saveData() {
        try {
            localStorage.setItem('wushi_projects', JSON.stringify(this.projects));
            localStorage.setItem('wushi_user', JSON.stringify(this.user));
        } catch(e) { console.warn('数据保存失败', e); }
    },

    loadData() {
        try {
            const saved = localStorage.getItem('wushi_projects');
            if (saved) this.projects = JSON.parse(saved);
            const savedUser = localStorage.getItem('wushi_user');
            if (savedUser) this.user = JSON.parse(savedUser);
        } catch(e) { console.warn('数据加载失败', e); }
    },

    // ═══════════════════════════════════════════════════════
    // 项目库渲染
    // ═══════════════════════════════════════════════════════
    renderRecentProjects() {
        const container = document.getElementById('recent-projects-list');
        if (!container) return;
        if (this.projects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="es-icon">📁</div>
                    <p>还没有项目，点击"开始新项目"创建</p>
                </div>`;
            return;
        }
        container.innerHTML = this.projects.slice(0, 5).map(p => `
            <div onclick="app.openProject('${p.id}')" style="display:flex;align-items:center;gap:12px;padding:10px;border-radius:10px;cursor:pointer;transition:all .12s;border:.5px solid transparent;margin-bottom:4px"
                 onmouseover="this.style.background='rgba(212,148,58,.07)';this.style.borderColor='rgba(212,148,58,.15)'"
                 onmouseout="this.style.background='transparent';this.style.borderColor='transparent'">
                <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,rgba(59,122,26,.2),rgba(10,59,110,.2));display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">
                    ${this.getTypeEmoji(p.type)}
                </div>
                <div style="flex:1;min-width:0">
                    <div style="font-weight:600;color:var(--cream);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
                    <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:rgba(250,240,208,.45);margin-top:2px">
                        <span>${p.typeLabel}</span><span>·</span><span>${this.formatDate(p.createdAt)}</span>
                    </div>
                </div>
                <span class="tag ${p.progress === 100 ? 'tg-palm' : 'tg-sea'}" style="font-size:10px">${p.progress === 100 ? '已完成' : p.progress + '%'}</span>
            </div>
        `).join('');
    },

    renderProjectsPage() {
        if (this.communityTab === 'community') {
            this.switchProjectTab('community');
        } else {
            this.filterProjects('all');
        }
    },

    filterProjects(filter) {
        document.querySelectorAll('#page-projects .tag').forEach(btn => {
            if (btn.dataset.filter === filter) {
                btn.className = 'tag tg-sun';
                btn.style.cursor = 'pointer';
            } else {
                btn.className = 'tag tg-ink';
                btn.style.cursor = 'pointer';
            }
        });

        const container = document.getElementById('projects-grid');
        if (!container) return;

        let filtered = this.projects;
        if (filter !== 'all') filtered = this.projects.filter(p => p.type === filter);

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column:span 3">
                    <div class="es-icon">📁</div>
                    <p>${filter === 'all' ? '项目库为空' : '该类型暂无项目'}</p>
                    <button class="btn btn-sun btn-sm" style="margin-top:12px" onclick="app.navigate('guide')">创建第一个项目</button>
                </div>`;
            return;
        }

        container.innerHTML = filtered.map(p => `
            <div class="proj-card" onclick="app.openProject('${p.id}')">
                <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">
                    <div class="proj-emoji" style="background:linear-gradient(135deg,rgba(59,122,26,.15),rgba(10,59,110,.15))">${this.getTypeEmoji(p.type)}</div>
                    <button onclick="event.stopPropagation(); app.deleteProject('${p.id}')" style="padding:4px;border-radius:6px;background:none;border:none;color:rgba(250,240,208,.3);cursor:pointer;font-size:16px;transition:all .1s"
                            onmouseover="this.style.color='var(--bloom)'" onmouseout="this.style.color='rgba(250,240,208,.3)'">🗑</button>
                </div>
                <h4 style="font-weight:600;color:var(--cream);font-size:14px;margin-bottom:4px">${p.name}</h4>
                <p style="font-size:11px;color:rgba(250,240,208,.45);margin-bottom:10px">${p.typeLabel} · ${this.formatDate(p.createdAt)}</p>
                <div class="prog-bar" style="margin-bottom:8px"><div class="prog-fill" style="width:${p.progress}%"></div></div>
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <span style="font-size:11px;color:rgba(250,240,208,.4)">${p.progress}% 完成</span>
                    <button onclick="event.stopPropagation()" style="font-size:11px;padding:4px 10px;border-radius:8px;background:rgba(255,255,255,.06);border:.5px solid rgba(212,148,58,.2);color:rgba(250,240,208,.6);cursor:pointer;font-family:inherit">打开</button>
                </div>
            </div>
        `).join('');
    },

    openProject(id) {
        const project = this.projects.find(p => p.id === id);
        if (project) { this.currentProject = project; this.navigate('workflow'); }
    },

    deleteProject(id) {
        if (confirm('确定要删除这个项目吗？此操作不可恢复。')) {
            this.projects = this.projects.filter(p => p.id !== id);
            if (this.currentProject?.id === id) this.currentProject = null;
            this.saveData();
            this.renderProjectsPage();
            this.renderRecentProjects();
        }
    },

    // ═══════════════════════════════════════════════════════
    // 工具方法
    // ═══════════════════════════════════════════════════════
    getTypeEmoji(type) {
        const map = {
            villa: '🏡', realestate: '🏘️', park: '🌳', community: '🌻',
            rural: '🌾', commercial: '🏢', campus: '🎓', riverside: '🌊',
            street: '🛣️', rooftop: '🏔️', tourism: '⛩️', other: '📐'
        };
        return map[type] || '📐';
    },

    formatDate(iso) {
        if (!iso) return '刚刚';
        const d = new Date(iso);
        return `${d.getMonth()+1}/${d.getDate()}`;
    },

    upgradePlan(plan) {
        alert(`感谢您的选择！\n\n「${plan === 'personal' ? '个人版' : '专业版'}」升级流程：\n\n1. 点击确认后将跳转至支付页面\n2. 完成支付后即刻解锁全部功能\n3. AI生成次数立即到账\n\n（演示模式：实际部署时接入微信支付/支付宝）`);
    },

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.metaKey || e.ctrlKey) {
                switch(e.key) {
                    case '1': e.preventDefault(); this.navigate('dashboard'); break;
                    case '2': e.preventDefault(); this.navigate('guide'); break;
                    case '3': e.preventDefault(); this.navigate('workflow'); break;
                    case '4': e.preventDefault(); this.navigate('image-studio'); break;
                    case '5': e.preventDefault(); this.navigate('ppt-studio'); break;
                }
            }
        });
    },

    // ═══════════════════════════════════════════════════════
    // 社区作品系统
    // ═══════════════════════════════════════════════════════
    communityTab: 'my',
    communityFilter: 'all',
    communitySort: 'hot',

    // 模拟社区作品数据
    communityWorks: [
        {
            id: 'cw_1', author: '伍师', avatar: '🌴', rank: 'god', rankLabel: '👑 大神',
            rankColor: '#E8A020', title: '禅意庭院·山水之间', type: 'villa', typeLabel: '别墅庭院',
            cover: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&q=80',
            guide: '第一关氛围确认是关键，我花了三天说服甲方放弃"欧式喷泉"，改做枯山水。记住：氛围不对，后面全废。手绘平面图不要急着上CAD，先用硫酸纸叠三层试动线。',
            likes: 128, liked: false, comments: [
                { user: '小李', text: '伍师的动线分析太到位了！', time: '2小时前' },
                { user: '阿花', text: '求教怎么说服甲方改方案？', time: '5小时前' }
            ],
            reviewPrice: 200, reviewPriceType: 'money',
            createdAt: '2026-07-10'
        },
        {
            id: 'cw_2', author: '林工', avatar: '🌲', rank: 'master', rankLabel: '🎖️ 大牛',
            rankColor: '#B45890', title: '城市更新·旧厂新生', type: 'commercial', typeLabel: '商业空间',
            cover: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80',
            guide: '改造项目最难的是"保留什么、拆掉什么"。我的经验：把老物件列个清单，让甲方亲自勾选。用AI出总图的时候，一定要把现状照片叠在底层，透明度调到30%，这样AI不会"忘本"。',
            likes: 96, liked: false, comments: [
                { user: '张三', text: '保留清单这个方法绝了', time: '1天前' }
            ],
            reviewPrice: 100, reviewPriceType: 'money',
            createdAt: '2026-07-08'
        },
        {
            id: 'cw_3', author: '陈设计', avatar: '🌸', rank: 'master', rankLabel: '🎖️ 大牛',
            rankColor: '#B45890', title: '社区花园·邻里菜园', type: 'community', typeLabel: '社区花园',
            cover: 'https://images.unsplash.com/photo-1598902108854-10e335adac99?w=600&q=80',
            guide: '社区项目要"自下而上"。先办一场居民共创会，让大爷大妈在地图上贴便签——"这里想种月季"、"那里要个下棋的"。把便签内容直接喂给DeepSeek生成叙事，居民看到自己的想法被采纳，参与度拉满。',
            likes: 72, liked: false, comments: [],
            reviewPrice: 80, reviewPriceType: 'money',
            createdAt: '2026-07-05'
        },
        {
            id: 'cw_4', author: '王同学', avatar: '🌱', rank: 'expert', rankLabel: '⭐ 高手',
            rankColor: '#1464A0', title: '校园景观·书香绿径', type: 'campus', typeLabel: '校园设计',
            cover: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80',
            guide: '学校项目要注重"教育性"。每一棵树的铭牌上都写一句古诗，铺装图案里藏着数学公式。用GPT出图的时候，在提示词里加入"educational elements""botanical labels"，效果会好很多。',
            likes: 45, liked: false, comments: [
                { user: '李老师', text: '教育性景观这个想法好', time: '3天前' }
            ],
            reviewPrice: 50, reviewPriceType: 'coins',
            createdAt: '2026-07-01'
        },
        {
            id: 'cw_5', author: '赵新锐', avatar: '🚀', rank: 'rising', rankLabel: '🚀 新锐',
            rankColor: '#3B7A1A', title: '滨水步道·日落长廊', type: 'riverside', typeLabel: '滨水空间',
            cover: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80',
            guide: '第一次用AI做完整的景观设计通关！SU模型导出视角的时候，记得把阴影打开，时间调到下午4点，这样GPT生成的效果图光影最自然。',
            likes: 23, liked: false, comments: [],
            reviewPrice: 30, reviewPriceType: 'coins',
            createdAt: '2026-06-28'
        },
        {
            id: 'cw_6', author: '伍师', avatar: '🌴', rank: 'god', rankLabel: '👑 大神',
            rankColor: '#E8A020', title: '文旅古镇·小桥流水', type: 'tourism', typeLabel: '文旅景观',
            cover: 'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=600&q=80',
            guide: '文旅项目最忌讳"假古董"。做叙事的时候，去当地档案馆查老照片，把真实的街坊故事放进设计。甲方不在乎你用了多少名贵树种，在乎的是游客能不能拍出朋友圈爆款。',
            likes: 156, liked: false, comments: [
                { user: '古镇开发', text: '伍师这个思路太实用了', time: '1小时前' }
            ],
            reviewPrice: 300, reviewPriceType: 'money',
            createdAt: '2026-07-11'
        }
    ],

    switchProjectTab(tab) {
        this.communityTab = tab;
        const myPanel = document.getElementById('panel-my-projects');
        const communityPanel = document.getElementById('panel-community');
        const myBtn = document.getElementById('tab-my-projects');
        const communityBtn = document.getElementById('tab-community');

        if (tab === 'my') {
            if (myPanel) myPanel.style.display = 'block';
            if (communityPanel) communityPanel.style.display = 'none';
            if (myBtn) { myBtn.className = 'btn btn-sun btn-sm'; }
            if (communityBtn) { communityBtn.className = 'btn btn-ghost btn-sm'; }
            this.renderProjectsPage();
        } else {
            if (myPanel) myPanel.style.display = 'none';
            if (communityPanel) communityPanel.style.display = 'block';
            if (myBtn) { myBtn.className = 'btn btn-ghost btn-sm'; }
            if (communityBtn) { communityBtn.className = 'btn btn-sun btn-sm'; }
            this.renderCommunityWorks();
        }
    },

    filterCommunity(rank) {
        this.communityFilter = rank;
        // 更新标签样式
        const tags = document.querySelectorAll('#panel-community .tag');
        tags.forEach(btn => {
            const btnRank = btn.getAttribute('onclick')?.match(/filterCommunity\('(.+?)'\)/)?.[1];
            if (btnRank === rank) {
                btn.className = 'tag tg-sun';
            } else {
                btn.className = 'tag tg-ink';
            }
        });
        this.renderCommunityWorks();
    },

    sortCommunity() {
        const select = document.getElementById('community-sort');
        this.communitySort = select?.value || 'hot';
        this.renderCommunityWorks();
    },

    renderCommunityWorks() {
        const container = document.getElementById('community-grid');
        if (!container) return;

        let works = [...this.communityWorks];

        // 筛选等级
        if (this.communityFilter !== 'all') {
            works = works.filter(w => w.rank === this.communityFilter);
        }

        // 排序
        if (this.communitySort === 'hot') {
            works.sort((a, b) => (b.likes + b.comments.length * 2) - (a.likes + a.comments.length * 2));
        } else if (this.communitySort === 'new') {
            works.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (this.communitySort === 'likes') {
            works.sort((a, b) => b.likes - a.likes);
        }

        if (works.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column:span 3">
                    <div class="es-icon">🏆</div>
                    <p>暂无该等级的作品</p>
                </div>`;
            return;
        }

        container.innerHTML = works.map(w => `
            <div class="proj-card" style="cursor:pointer" onclick="app.openWorkDetail('${w.id}')">
                <div style="position:relative;margin:-16px -16px 12px -16px;border-radius:12px 12px 0 0;overflow:hidden;height:160px">
                    <img src="${w.cover}" style="width:100%;height:100%;object-fit:cover" alt="${w.title}">
                    <div style="position:absolute;top:8px;left:8px;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:700;color:#fff;background:${w.rankColor}">
                        ${w.rankLabel}
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                    <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--sea-m),var(--palm-m));display:flex;align-items:center;justify-content:center;font-size:14px">${w.avatar}</div>
                    <div style="font-size:13px;font-weight:600;color:var(--cream)">${w.author}</div>
                    <span style="font-size:11px;color:rgba(250,240,208,.4);margin-left:auto">${w.typeLabel}</span>
                </div>
                <h4 style="font-weight:600;color:var(--cream);font-size:14px;margin-bottom:6px">${w.title}</h4>
                <p style="font-size:11px;color:rgba(250,240,208,.5);line-height:1.6;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${w.guide}</p>
                <div style="display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid rgba(255,255,255,.06)">
                    <div style="display:flex;gap:12px">
                        <span style="font-size:12px;color:rgba(250,240,208,.5)">👍 ${w.likes}</span>
                        <span style="font-size:12px;color:rgba(250,240,208,.5)">💬 ${w.comments.length}</span>
                    </div>
                    <button onclick="event.stopPropagation(); app.openReviewRequest('${w.id}')" style="font-size:11px;padding:4px 10px;border-radius:8px;background:rgba(212,148,58,.12);border:1px solid rgba(212,148,58,.25);color:var(--sun);cursor:pointer;font-family:inherit">
                        📝 邀请审图 ${w.reviewPrice}${w.reviewPriceType === 'money' ? '¥' : '💰'}
                    </button>
                </div>
            </div>
        `).join('');
    },

    openWorkDetail(id) {
        const work = this.communityWorks.find(w => w.id === id);
        if (!work) return;
        const modal = document.getElementById('work-detail-modal');
        const content = document.getElementById('modal-work-content');
        const title = document.getElementById('modal-work-title');
        if (!modal || !content) return;

        title.textContent = work.title;
        content.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
                <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--sea-m),var(--palm-m));display:flex;align-items:center;justify-content:center;font-size:22px">${work.avatar}</div>
                <div>
                    <div style="font-size:15px;font-weight:700;color:var(--cream)">${work.author} <span style="font-size:12px;padding:2px 8px;border-radius:10px;color:#fff;background:${work.rankColor};margin-left:6px">${work.rankLabel}</span></div>
                    <div style="font-size:12px;color:rgba(250,240,208,.4)">${work.typeLabel} · ${work.createdAt}</div>
                </div>
                <button onclick="app.toggleLike('${work.id}')" style="margin-left:auto;padding:6px 14px;border-radius:20px;background:${work.liked ? 'rgba(196,40,48,.2)' : 'rgba(255,255,255,.06)'};border:1px solid ${work.liked ? 'rgba(196,40,48,.4)' : 'rgba(255,255,255,.1)'};color:${work.liked ? 'var(--bloom)' : 'var(--cream)'};cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px">
                    ${work.liked ? '❤️' : '🤍'} ${work.likes}
                </button>
            </div>

            <div style="border-radius:12px;overflow:hidden;margin-bottom:16px">
                <img src="${work.cover}" style="width:100%;max-height:300px;object-fit:cover" alt="${work.title}">
            </div>

            <div style="padding:16px;border-radius:10px;background:rgba(212,148,58,.05);border:1px solid rgba(212,148,58,.12);margin-bottom:16px">
                <div style="font-size:13px;font-weight:700;color:var(--sun-l);margin-bottom:8px">📖 通关秘籍</div>
                <div style="font-size:13px;color:rgba(250,240,208,.75);line-height:1.8">${work.guide}</div>
            </div>

            <div style="display:flex;gap:8px;margin-bottom:16px">
                <button onclick="app.openReviewRequest('${work.id}')" class="btn btn-sun" style="flex:1">📝 邀请${work.author}审图（${work.reviewPrice}${work.reviewPriceType === 'money' ? '¥' : '💰'}）</button>
            </div>

            <div style="padding:16px;border-radius:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)">
                <div style="font-size:13px;font-weight:700;color:var(--cream);margin-bottom:12px">💬 交流评论（${work.comments.length}条）</div>
                <div style="display:flex;gap:8px;margin-bottom:12px">
                    <input id="comment-input-${work.id}" type="text" placeholder="写下你的问题或感想..." style="flex:1;padding:8px 12px;border-radius:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:var(--cream);font-family:inherit;font-size:12px">
                    <button onclick="app.addComment('${work.id}')" class="btn btn-ghost btn-sm">发送</button>
                </div>
                <div style="display:flex;flex-direction:column;gap:10px">
                    ${work.comments.length > 0 ? work.comments.map(c => `
                        <div style="padding:10px;border-radius:8px;background:rgba(255,255,255,.03)">
                            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                                <span style="font-size:12px;font-weight:600;color:var(--cream)">${c.user}</span>
                                <span style="font-size:11px;color:rgba(250,240,208,.3)">${c.time}</span>
                            </div>
                            <div style="font-size:12px;color:rgba(250,240,208,.6)">${c.text}</div>
                        </div>
                    `).join('') : '<div style="font-size:12px;color:rgba(250,240,208,.3);text-align:center">暂无评论，来抢沙发吧！</div>'}
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    },

    toggleLike(id) {
        const work = this.communityWorks.find(w => w.id === id);
        if (!work) return;
        work.liked = !work.liked;
        work.likes += work.liked ? 1 : -1;
        this.openWorkDetail(id); // 刷新弹窗
        this.renderCommunityWorks(); // 刷新列表
    },

    addComment(id) {
        const input = document.getElementById('comment-input-' + id);
        const text = input?.value?.trim();
        if (!text) return;
        const work = this.communityWorks.find(w => w.id === id);
        if (!work) return;
        work.comments.unshift({ user: '我', text, time: '刚刚' });
        input.value = '';
        this.openWorkDetail(id);
        this.renderCommunityWorks();
        showToast('评论已发送！', 'success');
    },

    openReviewRequest(id) {
        const work = this.communityWorks.find(w => w.id === id);
        if (!work) return;
        const modal = document.getElementById('review-request-modal');
        const content = document.getElementById('review-request-content');
        if (!modal || !content) return;

        content.innerHTML = `
            <div style="text-align:center;margin-bottom:16px">
                <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,var(--sea-m),var(--palm-m));display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 10px">${work.avatar}</div>
                <div style="font-size:15px;font-weight:700;color:var(--cream)">邀请 ${work.author} 为你审图</div>
                <div style="font-size:12px;color:${work.rankColor};margin-top:4px">${work.rankLabel}</div>
            </div>

            <div style="padding:12px;border-radius:8px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);margin-bottom:16px">
                <div style="font-size:12px;color:rgba(250,240,208,.5);margin-bottom:4px">审图费用</div>
                <div style="font-size:20px;font-weight:700;color:var(--sun-l)">${work.reviewPrice} ${work.reviewPriceType === 'money' ? '元' : '金币'}</div>
                <div style="font-size:11px;color:rgba(250,240,208,.4);margin-top:4px">审图包含：方案逻辑审核、图纸问题指出、优化建议、1对1语音沟通15分钟</div>
            </div>

            <div style="margin-bottom:16px">
                <label style="display:block;font-size:12px;color:rgba(250,240,208,.5);margin-bottom:6px">你的项目简介（方便审图师了解背景）</label>
                <textarea id="review-project-desc" rows="3" style="width:100%;font-size:12px" placeholder="例如：500㎡别墅庭院，甲方偏好日式风格，目前卡在效果图色调统一...">${app.currentProject?.summary || ''}</textarea>
            </div>

            <div style="margin-bottom:16px">
                <label style="display:block;font-size:12px;color:rgba(250,240,208,.5);margin-bottom:6px">需要重点审核的部分</label>
                <div style="display:flex;flex-wrap:wrap;gap:6px">
                    <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer"><input type="checkbox" class="review-focus" value="concept"> 概念逻辑</label>
                    <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer"><input type="checkbox" class="review-focus" value="layout"> 平面布局</label>
                    <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer"><input type="checkbox" class="review-focus" value="render"> 效果图</label>
                    <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer"><input type="checkbox" class="review-focus" value="narrative"> 景观叙事</label>
                    <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer"><input type="checkbox" class="review-focus" value="ppt"> PPT/展板</label>
                    <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer"><input type="checkbox" class="review-focus" value="cad"> 施工图</label>
                </div>
            </div>

            <div style="display:flex;gap:8px">
                <button onclick="document.getElementById('review-request-modal').style.display='none'" class="btn btn-ghost" style="flex:1">取消</button>
                <button onclick="app.submitReviewRequest('${work.id}')" class="btn btn-sun" style="flex:1">确认邀请并支付</button>
            </div>
        `;
        modal.style.display = 'flex';
    },

    submitReviewRequest(id) {
        const work = this.communityWorks.find(w => w.id === id);
        if (!work) return;
        const desc = document.getElementById('review-project-desc')?.value?.trim();
        const focusEls = document.querySelectorAll('.review-focus:checked');
        const focus = Array.from(focusEls).map(el => el.value);

        if (!desc) { showToast('请填写项目简介', 'warning'); return; }
        if (focus.length === 0) { showToast('请至少选择一项审核重点', 'warning'); return; }

        // 检查余额
        if (work.reviewPriceType === 'coins') {
            const coins = gameWorkflow?.coins || 0;
            if (coins < work.reviewPrice) {
                showToast('💰 金币不足！完成工作流关卡可获得金币。', 'warning');
                return;
            }
            if (gameWorkflow) {
                gameWorkflow.coins -= work.reviewPrice;
                gameWorkflow.saveState();
            }
        }

        document.getElementById('review-request-modal').style.display = 'none';
        showToast(`✅ 已成功邀请 ${work.author} 审图！审图师会在24小时内回复。`, 'success');
    }
};

// ═══════════════════════════════════════════════════════
// 全局Toast提示
// ═══════════════════════════════════════════════════════
window.showToast = function(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    const icons = { info: '💡', success: '✅', error: '❌', warning: '⚠️' };
    toast.innerHTML = `<span>${icons[type] || '💡'}</span> <span>${message}</span>`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
};

// 启动
document.addEventListener('DOMContentLoaded', () => app.init());
