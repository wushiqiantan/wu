/**
 * AI Reverse Questioning Guide Engine
 * AI反向提问引擎 —— 核心创新模块
 * 
 * 逻辑：AI主动提问，通过结构化问答引导用户逐步明确设计方向。
 * 新增：参考图上传、方案迭代优化、审核确认机制
 */

const aiGuide = {
    currentStep: 0,
    totalSteps: 8,
    qaHistory: [],
    projectType: null,
    projectTypeLabel: '',
    isComplete: false,

    // 新增状态
    referenceImages: [],
    iterationCount: 0,
    currentSummary: '',
    reviewResult: null,
    isReviewed: false,
    isFinalConfirmed: false,

    // ═══════════════════════════════════════════════════════
    // 项目类型定义
    // ═══════════════════════════════════════════════════════
    projectTypes: [
        { id: 'villa',      label: '别墅庭院设计',   emoji: '🏡', desc: '私家花园、庭院景观、豪宅户外空间', category: '住宅' },
        { id: 'realestate', label: '地产景观设计',   emoji: '🏘️', desc: '楼盘示范区、售楼处景观、大区景观', category: '住宅' },
        { id: 'park',       label: '公园设计',       emoji: '🌳', desc: '城市公园、口袋公园、专类公园、湿地公园', category: '公共' },
        { id: 'community',  label: '社区花园设计',   emoji: '🌻', desc: '社区绿地、邻里花园、共享菜园、屋顶花园', category: '社区' },
        { id: 'rural',      label: '乡村景观设计',   emoji: '🌾', desc: '乡村振兴、田园综合体、民宿景观、农业观光', category: '乡村' },
        { id: 'commercial', label: '商业空间景观',   emoji: '🏢', desc: '商业街区、办公园区、酒店景观、购物中心', category: '商业' },
        { id: 'campus',     label: '校园景观设计',   emoji: '🎓', desc: '高校/中小学景观、教育空间、文化节点', category: '教育' },
        { id: 'riverside',  label: '滨水空间设计',   emoji: '🌊', desc: '河岸、湖畔、海岸线、湿地、雨水花园', category: '生态' },
        { id: 'street',     label: '街道更新设计',   emoji: '🛣️', desc: '道路景观、街道家具、慢行系统、城市家具', category: '城市' },
        { id: 'rooftop',    label: '屋顶/立体绿化',  emoji: '🏔️', desc: '屋顶花园、垂直绿化、阳台景观、立体农场', category: '特殊' },
        { id: 'tourism',    label: '文旅景观设计',   emoji: '⛩️', desc: '景区规划、文旅小镇、主题公园、文化遗产', category: '文旅' },
        { id: 'other',      label: '其他类型',       emoji: '📐', desc: '特殊场地、实验性项目、跨界设计', category: '其他' }
    ],

    // ═══════════════════════════════════════════════════════
    // 问题模板库
    // ═══════════════════════════════════════════════════════
    questionBank: {
        common: [
            {
                id: 'site_basic',
                question: '请描述一下项目场地的基本情况：',
                subQuestions: ['场地面积大约多少平方米？', '场地现状是什么？（空地/改造/更新）', '场地周边有什么重要环境要素？'],
                purpose: '收集场地基础信息',
                aiHint: 'AI需要了解场地尺度与现状，才能给出合适的空间建议',
                quickOptions: ['<500㎡小型场地', '500-3000㎡中型', '3000-10000㎡大型', '>10000㎡超大型', '微更新/改造']
            },
            {
                id: 'target_users',
                question: '这个项目的主要使用者是谁？',
                subQuestions: ['主要使用人群的年龄段？', '使用高峰时段？', '是否有特殊人群需求？'],
                purpose: '明确用户画像',
                aiHint: '不同人群对空间的需求差异很大，比如儿童需要安全的活动区，老年人需要休息座椅和遮荫',
                quickOptions: ['家庭/全龄段', '儿童为主', '老年人为主', '青年白领', '学生群体', '游客']
            },
            {
                id: 'design_challenge',
                question: '你认为这个项目面临的最大设计挑战是什么？',
                subQuestions: ['场地本身有什么限制条件？', '预算或工期有约束吗？', '有没有必须保留或避开的要素？'],
                purpose: '识别核心矛盾',
                aiHint: '设计挑战往往就是方案的突破口。是地形高差？是生态恢复？还是功能复合？',
                quickOptions: ['场地条件限制', '生态/环境问题', '功能需求复杂', '预算紧张', '文化表达', '风格定位']
            },
            {
                id: 'style_pref',
                question: '你希望这个项目的整体风格倾向是什么？',
                subQuestions: ['有没有喜欢的设计案例或参考？', '与周边建筑风格是否需要协调？', '有没有文化或地域特色需要体现？'],
                purpose: '确定设计调性',
                aiHint: '风格不是表面的装饰，而是回应场地和使用者的方式',
                quickOptions: ['现代简约', '自然生态', '新中式/东方', '在地文化', '艺术创意', '日式禅意', '英式花园', '地中海']
            },
            {
                id: 'key_functions',
                question: '项目必须包含哪些核心功能或空间？',
                subQuestions: ['按优先级排列最重要的3个功能', '有没有必须满足的技术指标？', '未来是否有扩展可能？'],
                purpose: '梳理功能需求',
                aiHint: '功能的优先级排序会影响空间布局和尺度分配',
                quickOptions: ['休憩+交流', '运动+健身', '儿童游乐', '观赏游赏', '生态展示', '文化展示', '商业外摆', '种植体验']
            },
            {
                id: 'sustainability',
                question: '对生态可持续和后期维护有什么考虑？',
                subQuestions: ['是否有雨水管理需求？', '植物选择有偏好吗？', '维护团队的能力如何？'],
                purpose: '评估可持续策略',
                aiHint: '好的设计不仅要好看，更要能长期健康运行',
                quickOptions: ['低维护优先', '海绵城市/雨水花园', '本土植物为主', '智慧养护', '有机种植', '全生命周期']
            },
            {
                id: 'budget_timeline',
                question: '项目的预算范围和期望工期是怎样的？',
                subQuestions: ['单方造价预期？', '分阶段实施还是一次性？', '有没有申报竞赛或奖项的计划？'],
                purpose: '评估实施可行性',
                aiHint: '了解约束条件才能给出 realistic 的建议',
                quickOptions: ['课程作业/概念方案', '竞赛方案', '实际项目（严控预算）', '实际项目（品质优先）', '高端定制']
            },
            {
                id: 'output_format',
                question: '最终你需要哪些交付成果？',
                subQuestions: ['汇报PPT？A1展板？', '需要文本讲稿吗？', '图纸深度要求？'],
                purpose: '确认交付物',
                aiHint: '不同的交付目标会影响内容组织的策略',
                quickOptions: ['PPT汇报', 'A1展板', 'PPT+展板', '概念文本', '全套方案（含施工图）']
            }
        ],

        villa: [
            { id: 'villa_owner', question: '业主的家庭结构和生活习惯是怎样的？', quickOptions: ['三口之家', '三代同堂', '二人世界', '单身独居', '多宠物家庭'] },
            { id: 'villa_purpose', question: '庭院的主要使用场景是什么？', quickOptions: ['日常休闲', '社交聚会', '亲子活动', '园艺种植', '宠物活动', '多用途复合'] },
            { id: 'villa_style', question: '建筑风格是什么？庭院需要与之呼应吗？', quickOptions: ['现代极简', '新中式', '欧式古典', '日式', '地中海', '美式乡村'] },
            { id: 'villa_budget', question: '庭院景观的预算范围（含硬景+软景）？', quickOptions: ['<5万', '5-15万', '15-30万', '30-80万', '>80万'] }
        ],
        realestate: [
            { id: 're_phase', question: '这是哪个阶段的设计？', quickOptions: ['示范区/售楼处', '大区交付', '交付后提升', '旧改更新'] },
            { id: 're_brand', question: '开发商的品牌定位是什么？', quickOptions: ['刚需/首置', '改善型', '高端/豪宅', '文旅度假'] },
            { id: 're_sales', question: '景观对销售展示的作用期望？', quickOptions: ['强展示性（出效果）', '成本可控（重功能）', '平衡型', '标杆/获奖'] },
            { id: 're_limit', question: '有没有消防登高面、地库顶板等硬性约束？', quickOptions: ['有消防登高面', '地库顶板覆土限制', '管线密集', '无障碍要求高', '无明显限制'] }
        ],
        park: [
            { id: 'park_type', question: '这是哪种类型的公园？', quickOptions: ['综合公园', '社区公园', '专类公园（儿童/体育/湿地）', '带状公园/绿道', '口袋公园'] },
            { id: 'park_service', question: '公园服务半径覆盖的人口规模？', quickOptions: ['<1万人', '1-5万人', '5-20万人', '>20万人'] },
            { id: 'park_ecology', question: '场地内或周边有生态敏感区吗？', quickOptions: ['有湿地/水系', '有古树名木', '有野生动物栖息', '无明显生态要素', '需生态修复'] }
        ],
        community: [
            { id: 'comm_type', question: '社区花园的性质？', quickOptions: ['社区公共绿地', '共享菜园', '疗愈花园', '儿童自然教育', '长者友好花园'] },
            { id: 'comm_manage', question: '后期由谁维护管理？', quickOptions: ['物业统一维护', '居民自治', '专业团队', '志愿者+专家指导', '尚未确定'] },
            { id: 'comm_participation', question: '居民参与设计的程度？', quickOptions: ['已调研需求', '计划参与式设计', '设计师主导', '完全由居民决定'] }
        ],
        rural: [
            { id: 'rural_strategy', question: '这是乡村振兴的哪个层面？', quickOptions: ['产业带动（观光农业）', '人居环境整治', '文旅融合', '生态修复', '非遗文化传承'] },
            { id: 'rural_participant', question: '当地村民参与意愿如何？', quickOptions: ['积极参与', '观望态度', '主要听村干部', '需要引导动员'] },
            { id: 'rural_funding', question: '资金来源？', quickOptions: ['政府专项资金', '村集体自筹', '企业投资', '社会众筹', '混合来源'] }
        ],
        commercial: [
            { id: 'comm_brand', question: '商业品牌定位？', quickOptions: ['高端精品', '大众消费', '创意园区', '文旅商业', '社区商业'] },
            { id: 'comm_traffic', question: '主要客流到达方式？', quickOptions: ['地铁直达', '公交/步行', '自驾为主', '旅游大巴'] },
            { id: 'comm_stay', question: '期望客人在景观区停留多久？', quickOptions: ['快速通过', '短暂停留（<15分钟）', '中等停留（15-60分钟）', '长时间停留（>1小时）'] }
        ],
        campus: [
            { id: 'campus_level', question: '学校类型？', quickOptions: ['幼儿园', '小学', '中学', '高校', '职业学校'] },
            { id: 'campus_safety', question: '对安全性的特殊要求？', quickOptions: ['低龄儿童防护', '无障碍通行', '夜间照明', '应急疏散', '植物无毒无刺'] },
            { id: 'campus_culture', question: '校园有什么历史文化需要传承？', quickOptions: ['无特殊要求', '校训/精神', '历史建筑', '名人典故', '地域文化'] }
        ],
        riverside: [
            { id: 'river_type', question: '水体类型？', quickOptions: ['自然河流', '城市河道', '湖泊/水库', '海岸线', '人工湿地'] },
            { id: 'river_flood', question: '防洪要求？', quickOptions: ['有洪水位要求', '潮汐影响', '无明显洪涝风险', '需做海绵措施'] },
            { id: 'river_eco', question: '水生态状况？', quickOptions: ['水质优良', '轻度污染', '需生态修复', '黑臭水体治理'] }
        ],
        street: [
            { id: 'street_type', question: '街道类型？', quickOptions: ['商业街', '生活性街道', '景观大道', '背街小巷', '历史街区'] },
            { id: 'street_stakeholder', question: '主要利益相关方？', quickOptions: ['沿街商户', '周边居民', '通勤行人', '游客', '多主体混合'] },
            { id: 'street_car', question: '机动车与慢行系统的优先级？', quickOptions: ['完全步行', '步行优先', '人车共板', '机动车优先'] }
        ],
        rooftop: [
            { id: 'roof_load', question: '屋顶荷载允许范围？', quickOptions: ['花园式（>300kg/㎡）', '简单式（150-300kg/㎡）', '轻型（<150kg/㎡）', '不确定需验算'] },
            { id: 'roof_access', question: '使用频率和可达性？', quickOptions: ['日常可达', '偶尔使用', '仅供观赏', '需要预约'] },
            { id: 'roof_irrigation', question: '灌溉条件？', quickOptions: ['自动喷灌', '滴灌系统', '人工浇水', '雨水收集+自动'] }
        ],
        tourism: [
            { id: 'tour_theme', question: '文旅项目的主题定位？', quickOptions: ['自然观光', '文化体验', '休闲度假', '亲子研学', '康养疗愈'] },
            { id: 'tour_capacity', question: '设计客流量？', quickOptions: ['<1000人/日', '1000-5000人/日', '5000-20000人/日', '>20000人/日'] },
            { id: 'tour_night', question: '是否有夜间运营需求？', quickOptions: ['日间为主', '夜间灯光秀', '全天候运营', '季节性夜间活动'] }
        ],
        other: [
            { id: 'other_desc', question: '请详细描述项目类型和特殊需求：', quickOptions: ['实验性/艺术性', '临时性/可移动', '灾后重建', '工业遗址改造', '其他特殊场地'] }
        ]
    },

    // ═══════════════════════════════════════════════════════
    // 初始化
    // ═══════════════════════════════════════════════════════
    init() {
        const grid = document.getElementById('project-type-grid');
        if (!grid) return;

        const hasSession = this.loadFromStorage();
        this.renderTypeGrid(grid);

        if (hasSession && this.projectType && !this.isFinalConfirmed) {
            const step0 = document.getElementById('guide-step-0');
            if (step0) {
                const resumeDiv = document.createElement('div');
                resumeDiv.id = 'guide-resume-notice';
                resumeDiv.style.cssText = 'max-width:600px;margin:0 auto 16px;padding:14px 18px;background:rgba(232,160,32,.1);border:1px solid rgba(232,160,32,.25);border-radius:12px;display:flex;align-items:center;justify-content:space-between';
                resumeDiv.innerHTML = `
                    <div>
                        <div style="font-size:13px;font-weight:600;color:var(--sun-f)">检测到未完成的 ${this.projectTypeLabel} 项目</div>
                        <div style="font-size:12px;color:rgba(250,240,208,.5);margin-top:2px">已回答 ${this.qaHistory.length} 个问题${this.currentSummary ? '，已有方案概览' : ''}</div>
                    </div>
                    <div style="display:flex;gap:8px">
                        <button onclick="aiGuide.restoreSession()" style="padding:6px 14px;border-radius:8px;border:none;background:var(--sun-m);color:var(--cream);font-size:12px;cursor:pointer;font-family:inherit">继续</button>
                        <button onclick="aiGuide.clearAndRestart()" style="padding:6px 14px;border-radius:8px;border:1px solid rgba(250,240,208,.2);background:transparent;color:rgba(250,240,208,.6);font-size:12px;cursor:pointer;font-family:inherit">放弃</button>
                    </div>
                `;
                step0.insertBefore(resumeDiv, step0.firstChild);
            }
        }
    },

    renderTypeGrid(grid) {
        this.typeGridEl = grid;
        const allTypes = this.projectTypes.filter(t => t.category !== '其他');
        const isCustom = this.projectType === '__custom__';

        // Directly set grid styles on the element - no nested divs
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
        grid.style.gap = '12px';
        grid.style.width = '100%';

        let html = '';
        allTypes.forEach(t => {
            const selected = this.projectType === t.id;
            html += `
                <div onclick="aiGuide.selectType('${t.id}', '${t.label}')" 
                     style="background:rgba(255,255,255,.04);border:2px solid ${selected ? 'var(--sun)' : 'rgba(212,148,58,.15)'};border-radius:14px;padding:20px 12px;cursor:pointer;transition:all .18s;text-align:center;user-select:none;position:relative;overflow:hidden;"
                     onmouseover="this.style.borderColor='var(--sun)';this.style.background='rgba(232,160,32,.12)';this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,.2)'"
                     onmouseout="this.style.borderColor='${selected ? 'var(--sun)' : 'rgba(212,148,58,.15)'}';this.style.background='rgba(255,255,255,.04)';this.style.transform='translateY(0)';this.style.boxShadow='none'">
                    ${selected ? '<div style="position:absolute;top:6px;right:6px;width:20px;height:20px;border-radius:50%;background:var(--sun);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--ink);font-weight:700">✓</div>' : ''}
                    <div style="font-size:40px;margin-bottom:8px">${t.emoji}</div>
                    <div style="font-weight:700;color:var(--cream);font-size:14px;margin-bottom:4px;line-height:1.3">${t.label}</div>
                    <div style="font-size:11px;color:rgba(250,240,208,.5);line-height:1.5">${t.desc}</div>
                </div>
            `;
        });

        html += `
            <div onclick="aiGuide.selectType('__custom__', '自定义')" 
                 style="background:rgba(255,255,255,.04);border:2px solid ${isCustom ? 'var(--sun)' : 'rgba(212,148,58,.15)'};border-radius:14px;padding:20px 12px;cursor:pointer;transition:all .18s;text-align:center;user-select:none;position:relative;overflow:hidden;"
                 onmouseover="this.style.borderColor='var(--sun)';this.style.background='rgba(232,160,32,.12)';this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,.2)'"
                 onmouseout="this.style.borderColor='${isCustom ? 'var(--sun)' : 'rgba(212,148,58,.15)'}';this.style.background='rgba(255,255,255,.04)';this.style.transform='translateY(0)';this.style.boxShadow='none'">
                ${isCustom ? '<div style="position:absolute;top:6px;right:6px;width:20px;height:20px;border-radius:50%;background:var(--sun);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--ink);font-weight:700">✓</div>' : ''}
                <div style="font-size:40px;margin-bottom:8px">🔤</div>
                <div style="font-weight:700;color:var(--cream);font-size:14px;margin-bottom:4px;line-height:1.3">其他/自定义</div>
                <div style="font-size:11px;color:rgba(250,240,208,.5);line-height:1.5">输入任意类型</div>
            </div>
        `;

        if (isCustom) {
            html += `
                <div style="grid-column:1/-1;margin-top:16px;text-align:center">
                    <input type="text" id="custom-type-input" placeholder="输入自定义项目类型，如：康养花园、墓园景观..." 
                        style="width:100%;max-width:400px;padding:12px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.05);color:var(--cream);font-size:14px;outline:none;box-sizing:border-box"
                        onkeydown="if(event.key==='Enter')aiGuide.confirmCustomType()" autofocus>
                    <div style="margin-top:12px">
                        <button onclick="aiGuide.confirmCustomType()" style="padding:10px 28px;border-radius:10px;border:none;background:var(--sun);color:var(--cream);font-size:14px;cursor:pointer;font-family:inherit;font-weight:700">确认自定义</button>
                    </div>
                </div>
            `;
        }

        grid.innerHTML = html;
    },
    selectType(typeId, label) {
        this.projectType = typeId;
        this.projectTypeLabel = label;
        this.currentStep = 0;
        this.qaHistory = [];
        this.isComplete = false;
        this.referenceImages = [];
        this.iterationCount = 0;
        this.currentSummary = '';
        this.reviewResult = null;
        this.isReviewed = false;
        this.isFinalConfirmed = false;

        if (typeId === '__custom__') {
            this.saveToStorage();
            this.renderTypeGrid(this.typeGridEl);
            setTimeout(() => {
                const input = document.getElementById('custom-type-input');
                if (input) input.focus();
            }, 50);
            return;
        }

        const step0 = document.getElementById('guide-step-0');
        const chatArea = document.getElementById('guide-chat-area');
        const typeLabel = document.getElementById('guide-current-type');
        
        if (step0) step0.style.display = 'none';
        if (chatArea) { chatArea.style.display = 'block'; setTimeout(() => chatArea.scrollIntoView({behavior:'smooth'}), 100); }
        if (typeLabel) {
            typeLabel.textContent = label;
            typeLabel.className = 'tag tg-palm';
        }
        
        this.saveToStorage();
        this.askNextQuestion();
    },

    confirmCustomType() {
        const input = document.getElementById('custom-type-input');
        const value = input ? input.value.trim() : '';
        if (!value) {
            showToast('请输入自定义项目类型', 'warning');
            return;
        }
        this.projectType = '__custom__';
        this.projectTypeLabel = value;
        this.saveToStorage();

        const step0 = document.getElementById('guide-step-0');
        const chatArea = document.getElementById('guide-chat-area');
        const typeLabel = document.getElementById('guide-current-type');
        
        if (step0) step0.style.display = 'none';
        if (chatArea) { chatArea.style.display = 'block'; setTimeout(() => chatArea.scrollIntoView({behavior:'smooth'}), 100); }
        if (typeLabel) {
            typeLabel.textContent = value;
            typeLabel.className = 'tag tg-palm';
        }

        this.askNextQuestion();
    },

    ensureUploadButton() {
        const inputArea = document.getElementById('guide-input-area');
        if (!inputArea) return;

        // 上传按钮
        if (!document.getElementById('guide-upload-btn')) {
            const uploadBtn = document.createElement('button');
            uploadBtn.id = 'guide-upload-btn';
            uploadBtn.innerHTML = '📎';
            uploadBtn.title = '上传参考图';
            uploadBtn.style.cssText = 'width:36px;height:36px;border-radius:10px;border:1px solid rgba(212,148,58,.2);background:rgba(255,255,255,.06);color:var(--cream);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;margin-right:6px;transition:all .15s;flex-shrink:0';
            uploadBtn.onmouseover = function() { this.style.borderColor='rgba(232,160,32,.4)'; this.style.background='rgba(232,160,32,.1)'; };
            uploadBtn.onmouseout = function() { this.style.borderColor='rgba(212,148,58,.2)'; this.style.background='rgba(255,255,255,.06)'; };
            uploadBtn.onclick = () => this.uploadReferenceImage();

            const textarea = document.getElementById('guide-user-input');
            if (textarea) {
                inputArea.insertBefore(uploadBtn, textarea);
            }
        }

        // 返回工作台按钮（退出场地分析，保存进度）
        if (!document.getElementById('guide-back-btn')) {
            const backBtn = document.createElement('button');
            backBtn.id = 'guide-back-btn';
            backBtn.innerHTML = '←';
            backBtn.title = '返回工作台（保存进度）';
            backBtn.style.cssText = 'width:36px;height:36px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:rgba(250,240,208,.5);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;margin-right:6px;transition:all .15s;flex-shrink:0';
            backBtn.onmouseover = function() { this.style.borderColor='rgba(232,160,32,.4)'; this.style.background='rgba(232,160,32,.08)'; this.style.color='var(--cream)'; };
            backBtn.onmouseout = function() { this.style.borderColor='rgba(255,255,255,.12)'; this.style.background='rgba(255,255,255,.04)'; this.style.color='rgba(250,240,208,.5)'; };
            backBtn.onclick = () => this.backToDashboard();

            const textarea = document.getElementById('guide-user-input');
            if (textarea) {
                inputArea.insertBefore(backBtn, textarea);
            }
        }
    },

    // ═══════════════════════════════════════════════════════
    // 上传参考图
    // ═══════════════════════════════════════════════════════
    uploadReferenceImage() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target.result;
                this.referenceImages.push({ data: base64, name: file.name, timestamp: Date.now() });
                this.addImageMessage(base64, file.name);
                this.saveToStorage();
                showToast('参考图已上传', 'success');
            };
            reader.readAsDataURL(file);
        };

        document.body.appendChild(input);
        input.click();
        setTimeout(() => input.remove(), 1000);
    },

    addImageMessage(base64, filename) {
        const history = document.getElementById('guide-chat-history');
        if (!history) return;

        const msgDiv = document.createElement('div');
        msgDiv.className = 'fade-in';
        msgDiv.style.cssText = 'display:flex;gap:10px;margin-bottom:10px;flex-direction:row-reverse';

        msgDiv.innerHTML = `
            <div style="width:28px;height:28px;border-radius:50%;background:rgba(250,240,208,.15);border:1.5px solid rgba(250,240,208,.3);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--cream);flex-shrink:0;margin-top:2px">我</div>
            <div style="max-width:70%;background:rgba(232,160,32,.12);border:.5px solid rgba(232,160,32,.25);border-radius:14px 14px 4px 14px;padding:10px">
                <img src="${base64}" style="max-width:200px;max-height:150px;border-radius:8px;display:block;margin-bottom:6px;object-fit:cover" alt="参考图">
                <div style="font-size:11px;color:rgba(250,240,208,.5);text-align:right">${filename}</div>
            </div>
        `;

        history.appendChild(msgDiv);
        this.scrollToBottom();
    },

    // ═══════════════════════════════════════════════════════
    // 获取当前问题
    // ═══════════════════════════════════════════════════════
    getCurrentQuestion() {
        const typeSpecific = this.questionBank[this.projectType] || [];
        const commonQuestions = [...this.questionBank.common];
        const allQuestions = [...typeSpecific, ...commonQuestions];

        const answeredIds = this.qaHistory.map(q => q.questionId);
        const nextQ = allQuestions.find(q => !answeredIds.includes(q.id));

        return nextQ || null;
    },

    // ═══════════════════════════════════════════════════════
    // AI提问
    // ═══════════════════════════════════════════════════════
    askNextQuestion() {
        if (this.isComplete) return;

        const question = this.getCurrentQuestion();

        if (!question) {
            this.completeGuide();
            return;
        }

        const totalQ = (this.questionBank[this.projectType] || []).length + this.questionBank.common.length;
        const answered = this.qaHistory.length;
        const progress = Math.min(95, Math.round((answered / totalQ) * 100));
        
        const bar = document.getElementById('guide-progress-bar');
        const pct = document.getElementById('guide-progress-pct');
        const label = document.getElementById('guide-step-label');
        
        if (bar) bar.style.width = progress + '%';
        if (pct) pct.textContent = progress + '%';
        if (label) label.textContent = `步骤 ${answered + 1} / ${totalQ}`;

        let message = `**${question.question}**\n\n`;
        if (question.aiHint) {
            message += `💡 *${question.aiHint}*\n\n`;
        }
        if (question.subQuestions) {
            message += question.subQuestions.map(sq => `· ${sq}`).join('\n');
        }

        this.addAIMessage(message, question.quickOptions || []);
        this.currentStep++;
    },

    // ═══════════════════════════════════════════════════════
    // 添加AI消息
    // ═══════════════════════════════════════════════════════
    addAIMessage(content, quickOptions = []) {
        const history = document.getElementById('guide-chat-history');
        if (!history) return;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = 'fade-in';
        msgDiv.style.cssText = 'display:flex;gap:10px;margin-bottom:10px';

        const optionsHtml = quickOptions.length > 0
            ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${quickOptions.map(opt =>
                `<button onclick="aiGuide.selectQuickOption(this)" style="font-size:11px;padding:5px 10px;border-radius:8px;border:.5px solid rgba(212,148,58,.2);background:rgba(255,255,255,.06);color:rgba(250,240,208,.7);cursor:pointer;transition:all .1s;font-family:inherit" onmouseover="this.style.borderColor='rgba(232,160,32,.4)';this.style.color='var(--sun-f)'" onmouseout="this.style.borderColor='rgba(212,148,58,.2)';this.style.color='rgba(250,240,208,.7)'">${opt}</button>`
            ).join('')}</div>`
            : '';

        const parsedContent = content
            .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--sun-f)">$1</strong>')
            .replace(/\*(.+?)\*/g, '<em style="color:rgba(250,240,208,.5)">$1</em>')
            .replace(/\n/g, '<br>');

        msgDiv.innerHTML = `
            <div style="width:28px;height:28px;border-radius:50%;background:var(--sun-m);border:1.5px solid var(--sun);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--cream);flex-shrink:0;margin-top:2px">伍</div>
            <div style="flex:1;min-width:0">
                <div class="msg-ws">${parsedContent}</div>
                ${optionsHtml}
            </div>
        `;

        history.appendChild(msgDiv);
        this.scrollToBottom();
    },

    // ═══════════════════════════════════════════════════════
    // 添加用户消息
    // ═══════════════════════════════════════════════════════
    addUserMessage(content) {
        const history = document.getElementById('guide-chat-history');
        if (!history) return;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = 'fade-in';
        msgDiv.style.cssText = 'display:flex;gap:10px;margin-bottom:10px;flex-direction:row-reverse';
        
        msgDiv.innerHTML = `
            <div style="width:28px;height:28px;border-radius:50%;background:rgba(250,240,208,.15);border:1.5px solid rgba(250,240,208,.3);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--cream);flex-shrink:0;margin-top:2px">我</div>
            <div class="msg-me">${content}</div>
        `;
        
        history.appendChild(msgDiv);
        this.scrollToBottom();
    },

    // ═══════════════════════════════════════════════════════
    // 选择快捷选项
    // ═══════════════════════════════════════════════════════
    selectQuickOption(btn) {
        const input = document.getElementById('guide-user-input');
        if (input) {
            input.value = btn.textContent;
            this.submitAnswer();
        }
    },

    // ═══════════════════════════════════════════════════════
    // 提交回答
    // ═══════════════════════════════════════════════════════
    submitAnswer() {
        const input = document.getElementById('guide-user-input');
        if (!input) return;
        
        const answer = input.value.trim();
        if (!answer) return;

        const currentQ = this.getCurrentQuestion();
        this.qaHistory.push({
            questionId: currentQ?.id || `q_${Date.now()}`,
            question: currentQ?.question || '自定义问题',
            answer: answer,
            timestamp: Date.now()
        });
        this.saveToStorage();

        this.addUserMessage(answer);
        input.value = '';

        this.showTyping();
        setTimeout(() => {
            this.hideTyping();
            this.askNextQuestion();
        }, 1200 + Math.random() * 800);
    },

    // ═══════════════════════════════════════════════════════
    // 显示"正在输入"
    // ═══════════════════════════════════════════════════════
    showTyping() {
        const history = document.getElementById('guide-chat-history');
        if (!history) return;
        
        const typingDiv = document.createElement('div');
        typingDiv.id = 'ai-typing';
        typingDiv.style.cssText = 'display:flex;gap:10px;margin-bottom:10px';
        typingDiv.innerHTML = `
            <div style="width:28px;height:28px;border-radius:50%;background:var(--sun-m);border:1.5px solid var(--sun);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--cream);flex-shrink:0;margin-top:2px">伍</div>
            <div style="background:rgba(255,255,255,.06);border:.5px solid rgba(255,255,255,.1);border-radius:14px 14px 14px 4px;padding:11px 14px">
                <div style="display:flex;gap:4px">
                    <div style="width:6px;height:6px;background:rgba(250,240,208,.3);border-radius:50%;animation:pulse 1.5s infinite"></div>
                    <div style="width:6px;height:6px;background:rgba(250,240,208,.3);border-radius:50%;animation:pulse 1.5s infinite .2s"></div>
                    <div style="width:6px;height:6px;background:rgba(250,240,208,.3);border-radius:50%;animation:pulse 1.5s infinite .4s"></div>
                </div>
            </div>
        `;
        history.appendChild(typingDiv);
        this.scrollToBottom();
    },

    hideTyping() {
        const typing = document.getElementById('ai-typing');
        if (typing) typing.remove();
    },

    scrollToBottom() {
        const history = document.getElementById('guide-chat-history');
        if (history) history.scrollTop = history.scrollHeight;
    },

    // ═══════════════════════════════════════════════════════
    // 完成引导 — 进入方案生成
    // ═══════════════════════════════════════════════════════
    async completeGuide() {
        if (this.isComplete) return;
        this.isComplete = true;

        const bar = document.getElementById('guide-progress-bar');
        const pct = document.getElementById('guide-progress-pct');
        const inputArea = document.getElementById('guide-input-area');
        
        if (bar) bar.style.width = '100%';
        if (pct) pct.textContent = '100%';
        if (inputArea) inputArea.style.display = 'none';

        this.addAIMessage('✅ 问答收集完成！\n\n🔍 **DeepSeek 正在深度分析你的需求，生成专业设计方案概览...**\n\n请稍候，约需 5-15 秒。');

        let summary = '';
        try {
            summary = await this.callDeepSeekForSummary();
            showToast('DeepSeek 分析完成！', 'success');
        } catch (err) {
            console.error('DeepSeek API调用失败:', err);
            showToast('DeepSeek API调用失败，使用本地生成作为备用', 'warning');
            summary = this.generateSummaryFallback();
        }

        this.iterationCount = 1;
        this.currentSummary = summary;
        this.saveToStorage();

        this.showLivePreview(summary);
        this.showIterationControls();
    },

    // ═══════════════════════════════════════════════════════
    // 显示迭代控制
    // ═══════════════════════════════════════════════════════
    showIterationControls() {
        const preview = document.getElementById('guide-live-preview');
        if (!preview) return;

        let oldControls = document.getElementById('guide-preview-controls');
        if (oldControls) oldControls.remove();

        const controls = document.createElement('div');
        controls.id = 'guide-preview-controls';
        controls.style.cssText = 'margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.08)';

        const iterationNote = this.iterationCount > 1
            ? '<span style="font-size:11px;color:rgba(250,240,208,.4)">基于修改意见重新生成</span>'
            : '<span style="font-size:11px;color:rgba(250,240,208,.4)">可提出修改意见进行迭代</span>';

        controls.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
                <span style="font-size:13px;color:var(--sun-f);font-weight:700">第${this.iterationCount}稿</span>
                ${iterationNote}
            </div>
            <div style="display:flex;gap:8px;margin-bottom:12px">
                <textarea id="guide-modify-input" rows="2" style="flex:1;background:rgba(0,0,0,.2);border:1px solid rgba(212,148,58,.2);border-radius:10px;padding:10px 12px;color:var(--cream);font-family:inherit;font-size:13px;resize:none;outline:none" placeholder="📝 对当前方案提出修改意见..."></textarea>
                <button onclick="aiGuide.regenerateSummary()" style="padding:10px 16px;border-radius:10px;border:none;background:linear-gradient(135deg,var(--sun-m),var(--sun));color:var(--cream);font-weight:600;cursor:pointer;font-size:13px;font-family:inherit;white-space:nowrap;transition:all .15s" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">🔄 重新生成</button>
            </div>
            <div style="display:flex;gap:10px;justify-content:center">
                <button onclick="aiGuide.showConfirmationOptions()" style="padding:8px 20px;border-radius:10px;border:1px solid rgba(212,148,58,.3);background:rgba(232,160,32,.1);color:var(--sun-f);cursor:pointer;font-size:13px;font-family:inherit;font-weight:600;transition:all .15s" onmouseover="this.style.background='rgba(232,160,32,.2)'" onmouseout="this.style.background='rgba(232,160,32,.1)'">✅ 方案满意，进入确认</button>
            </div>
        `;

        preview.appendChild(controls);
    },

    // ═══════════════════════════════════════════════════════
    // 重新生成方案
    // ═══════════════════════════════════════════════════════
    async regenerateSummary() {
        const input = document.getElementById('guide-modify-input');
        if (!input) return;

        const note = input.value.trim();
        if (!note) {
            showToast('请先输入修改意见', 'warning');
            return;
        }

        this.addUserMessage(`📝 修改意见：${note}`);

        const preview = document.getElementById('guide-live-preview');
        if (preview) {
            let oldControls = document.getElementById('guide-preview-controls');
            if (oldControls) oldControls.remove();

            const loading = document.createElement('div');
            loading.id = 'guide-preview-controls';
            loading.style.cssText = 'margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.08);text-align:center';
            loading.innerHTML = `<div style="font-size:13px;color:var(--sun-f)">🔄 DeepSeek 正在根据修改意见重新生成方案...</div>`;
            preview.appendChild(loading);
        }

        try {
            const summary = await this.callDeepSeekForSummary(note);
            this.iterationCount++;
            this.currentSummary = summary;
            this.saveToStorage();

            this.showLivePreview(summary);
            this.showIterationControls();
            showToast(`第${this.iterationCount}稿方案已生成！`, 'success');
        } catch (err) {
            console.error('重新生成失败:', err);
            showToast('重新生成失败，请重试', 'error');
            this.showIterationControls();
        }
    },

    // ═══════════════════════════════════════════════════════
    // 显示确认选项
    // ═══════════════════════════════════════════════════════
    showConfirmationOptions() {
        const preview = document.getElementById('guide-live-preview');
        if (!preview) return;

        let oldControls = document.getElementById('guide-preview-controls');
        if (oldControls) oldControls.remove();

        const controls = document.createElement('div');
        controls.id = 'guide-preview-controls';
        controls.style.cssText = 'margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.08)';

        controls.innerHTML = `
            <div style="text-align:center;margin-bottom:14px">
                <div style="font-size:14px;font-weight:600;color:var(--cream);margin-bottom:4px">请选择确认方式</div>
                <div style="font-size:12px;color:rgba(250,240,208,.5)">确认后将进入工作流画布进行详细设计</div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
                <button onclick="aiGuide.selfConfirm()" style="padding:12px 8px;border-radius:12px;border:1px solid rgba(212,148,58,.2);background:rgba(255,255,255,.04);color:var(--cream);cursor:pointer;font-family:inherit;transition:all .15s" onmouseover="this.style.borderColor='rgba(232,160,32,.4)';this.style.background='rgba(232,160,32,.08)'" onmouseout="this.style.borderColor='rgba(212,148,58,.2)';this.style.background='rgba(255,255,255,.04)'">
                    <div style="font-size:20px;margin-bottom:6px">✅</div>
                    <div style="font-size:13px;font-weight:600">自己确认</div>
                    <div style="font-size:11px;color:rgba(250,240,208,.5);margin-top:4px">直接确认方案</div>
                </button>
                <button onclick="aiGuide.performReview('wushi')" style="padding:12px 8px;border-radius:12px;border:1px solid rgba(212,148,58,.2);background:rgba(255,255,255,.04);color:var(--cream);cursor:pointer;font-family:inherit;transition:all .15s" onmouseover="this.style.borderColor='rgba(232,160,32,.4)';this.style.background='rgba(232,160,32,.08)'" onmouseout="this.style.borderColor='rgba(212,148,58,.2)';this.style.background='rgba(255,255,255,.04)'">
                    <div style="font-size:20px;margin-bottom:6px">🌴</div>
                    <div style="font-size:13px;font-weight:600">伍师自审</div>
                    <div style="font-size:11px;color:rgba(250,240,208,.5);margin-top:4px">资深设计师点评优化</div>
                </button>
                <button onclick="aiGuide.performReview('expert')" style="padding:12px 8px;border-radius:12px;border:1px solid rgba(212,148,58,.2);background:rgba(255,255,255,.04);color:var(--cream);cursor:pointer;font-family:inherit;transition:all .15s" onmouseover="this.style.borderColor='rgba(232,160,32,.4)';this.style.background='rgba(232,160,32,.08)'" onmouseout="this.style.borderColor='rgba(212,148,58,.2)';this.style.background='rgba(255,255,255,.04)'">
                    <div style="font-size:20px;margin-bottom:6px">👨‍🏫</div>
                    <div style="font-size:13px;font-weight:600">专家审核</div>
                    <div style="font-size:11px;color:rgba(250,240,208,.5);margin-top:4px">严格专业审核把关</div>
                </button>
            </div>
        `;

        preview.appendChild(controls);
    },

    selfConfirm() {
        this.addAIMessage('✅ 你选择了自己确认方案。');
        this.showFinalConfirmation();
    },

    // ═══════════════════════════════════════════════════════
    // 执行审核
    // ═══════════════════════════════════════════════════════
    async performReview(mode) {
        const preview = document.getElementById('guide-live-preview');
        if (!preview) return;

        let oldControls = document.getElementById('guide-preview-controls');
        if (oldControls) oldControls.remove();

        const loading = document.createElement('div');
        loading.id = 'guide-preview-controls';
        loading.style.cssText = 'margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.08);text-align:center';
        loading.innerHTML = `<div style="font-size:13px;color:var(--sun-f)">🔍 正在${mode === 'wushi' ? '伍师自审' : '专家审核'}中，请稍候...</div>`;
        preview.appendChild(loading);

        let systemPrompt = '';
        if (mode === 'wushi') {
            systemPrompt = `你是一位经验丰富、性格直率的景观设计师"伍师"。请对以下设计方案进行审核点评，指出优点和不足，并给出具体的优化建议。语言风格像资深前辈对后辈的指导，既有鼓励也有批评。用中文，Markdown格式。输出结构：1.整体评价 2.优点 3.不足 4.优化建议`;
        } else {
            systemPrompt = `你是一位资深景观设计专家，拥有30年以上项目经验，参与过众多国家级重点项目评审。请对以下设计方案进行严格审核，从专业角度指出所有问题，包括但不限于：功能布局合理性、生态策略、文化表达、技术可行性、造价控制、维护管理。给出详细的修改意见和优化建议。用中文，Markdown格式。输出结构：1.整体评价 2.专业审核 3.问题清单 4.优化建议`;
        }

        const userPrompt = `项目类型：${this.projectTypeLabel}\n\n设计方案概览：\n\n${this.currentSummary}\n\n请进行审核并输出审核意见。`;

        try {
            const review = await callAI('deepseek', [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ], { temperature: 0.8, max_tokens: 3000 });

            this.reviewResult = { mode, content: review };
            this.isReviewed = true;
            this.saveToStorage();

            this.showReviewResult();
        } catch (err) {
            console.error('审核失败:', err);
            showToast('审核服务暂时不可用，请直接确认', 'warning');
            this.selfConfirm();
        }
    },

    // ═══════════════════════════════════════════════════════
    // 显示审核结果
    // ═══════════════════════════════════════════════════════
    showReviewResult() {
        const preview = document.getElementById('guide-live-preview');
        if (!preview || !this.reviewResult) return;

        let oldControls = document.getElementById('guide-preview-controls');
        if (oldControls) oldControls.remove();

        const controls = document.createElement('div');
        controls.id = 'guide-preview-controls';
        controls.style.cssText = 'margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.08)';

        const modeLabel = this.reviewResult.mode === 'wushi' ? '🌴 伍师自审意见' : '👨‍🏫 专家审核意见';

        const reviewHtml = this.reviewResult.content
            .replace(/## (.+)/g, '<h4 style="font-size:14px;font-weight:600;color:var(--sun-f);margin:10px 0 6px">$1</h4>')
            .replace(/### (.+)/g, '<h5 style="font-size:13px;font-weight:600;color:var(--cream);margin:8px 0 4px">$1</h5>')
            .replace(/^- (.+)/gm, '<li style="margin-left:16px;color:rgba(250,240,208,.75);font-size:13px;line-height:1.8">$1</li>')
            .replace(/^\d+\. (.+)/gm, '<li style="margin-left:16px;color:rgba(250,240,208,.75);font-size:13px;line-height:1.8">$1</li>')
            .replace(/\n\n/g, '</p><p style="color:rgba(250,240,208,.7);font-size:13px;line-height:1.8;margin:8px 0">')
            .replace(/^(?!<[hl]|<li)/gm, '<p style="color:rgba(250,240,208,.7);font-size:13px;line-height:1.8;margin:8px 0">')
            .replace(/<p[^>]*>\s*<\/p>/g, '');

        controls.innerHTML = `
            <div style="font-size:14px;font-weight:700;color:var(--cream);margin-bottom:10px">${modeLabel}</div>
            <div style="background:rgba(0,0,0,.15);border-radius:10px;padding:12px;margin-bottom:14px;max-height:300px;overflow-y:auto">
                ${reviewHtml}
            </div>
            <div style="display:flex;gap:10px;justify-content:center">
                <button onclick="aiGuide.applyReviewChanges()" style="padding:8px 18px;border-radius:10px;border:none;background:linear-gradient(135deg,var(--palm-m),var(--palm-l));color:var(--cream);cursor:pointer;font-size:13px;font-family:inherit;font-weight:600;transition:all .15s" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">✅ 采纳修改</button>
                <button onclick="aiGuide.keepOriginalPlan()" style="padding:8px 18px;border-radius:10px;border:1px solid rgba(250,240,208,.2);background:rgba(255,255,255,.06);color:rgba(250,240,208,.8);cursor:pointer;font-size:13px;font-family:inherit;font-weight:600;transition:all .15s" onmouseover="this.style.borderColor='rgba(250,240,208,.4)';this.style.color='var(--cream)'" onmouseout="this.style.borderColor='rgba(250,240,208,.2)';this.style.color='rgba(250,240,208,.8)'">📋 保持原方案</button>
            </div>
        `;

        preview.appendChild(controls);
    },

    // ═══════════════════════════════════════════════════════
    // 采纳审核修改
    // ═══════════════════════════════════════════════════════
    async applyReviewChanges() {
        if (!this.reviewResult) {
            this.showFinalConfirmation();
            return;
        }

        const preview = document.getElementById('guide-live-preview');
        if (preview) {
            let oldControls = document.getElementById('guide-preview-controls');
            if (oldControls) oldControls.remove();

            const loading = document.createElement('div');
            loading.id = 'guide-preview-controls';
            loading.style.cssText = 'margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.08);text-align:center';
            loading.innerHTML = `<div style="font-size:13px;color:var(--sun-f)">🔄 正在根据审核意见优化方案...</div>`;
            preview.appendChild(loading);
        }

        try {
            const systemPrompt = `你是一位资深景观设计师。请根据原方案和审核意见，生成优化后的完整方案概览。保留原方案的优点，针对审核意见进行改进。用中文，Markdown格式。包含：场地认知、用户分析、核心挑战、设计策略方向、功能建议、风格建议、下一步行动。`;

            const userPrompt = `【原方案】\n${this.currentSummary}\n\n【审核意见】\n${this.reviewResult.content}\n\n请生成优化后的方案概览。`;

            const optimized = await callAI('deepseek', [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ], { temperature: 0.8, max_tokens: 3000 });

            this.currentSummary = optimized;
            this.iterationCount++;
            this.showLivePreview(this.currentSummary);
            this.saveToStorage();

            showToast('方案已优化！', 'success');
        } catch (err) {
            console.error('优化失败:', err);
            showToast('优化失败，保持原方案', 'warning');
        }

        this.showFinalConfirmation();
    },

    keepOriginalPlan() {
        this.addAIMessage('📋 你选择了保持原方案。');
        this.showFinalConfirmation();
    },

    // ═══════════════════════════════════════════════════════
    // 最终确认
    // ═══════════════════════════════════════════════════════
    showFinalConfirmation() {
        this.isFinalConfirmed = true;
        this.saveToStorage();

        const preview = document.getElementById('guide-live-preview');
        if (preview) {
            let oldControls = document.getElementById('guide-preview-controls');
            if (oldControls) oldControls.remove();
        }

        const completedArea = document.getElementById('guide-completed-area');
        if (completedArea) {
            completedArea.innerHTML = `
                <p style="color:var(--palm-l);font-weight:600;margin-bottom:12px">✅ 方案已最终确认！</p>
                <button class="btn btn-sun" onclick="aiGuide.finalConfirmAndGo()">进入工作流画布</button>
            `;
            completedArea.style.display = 'block';
        }

        this.addAIMessage('🎉 方案已确认！点击下方按钮进入工作流画布，开始详细设计。');
    },

    // ═══════════════════════════════════════════════════════
    // 最终确认并创建工作流
    // ═══════════════════════════════════════════════════════
    finalConfirmAndGo() {
        const projectName = this.qaHistory.find(q => q.questionId === 'site_basic')?.answer.substring(0, 30) || `${this.projectTypeLabel}项目`;

        const project = app.createProject({
            name: projectName,
            type: this.projectType,
            typeLabel: this.projectTypeLabel,
            qaHistory: this.qaHistory,
            summary: this.currentSummary,
            referenceImages: this.referenceImages,
            iterationCount: this.iterationCount,
            reviewResult: this.reviewResult
        });

        this.saveProjectToHistory(project);
        this.clearStorage();
        app.navigate('workflow');
    },

    finishAndGoWorkflow() {
        this.finalConfirmAndGo();
    },

    // ═══════════════════════════════════════════════════════
    // 返回工作台（保存当前进度）
    // ═══════════════════════════════════════════════════════
    backToDashboard() {
        this.saveToStorage();
        showToast('进度已保存，正在返回工作台...', 'info');
        app.navigate('dashboard');
    },

    // ═══════════════════════════════════════════════════════
    // 调用DeepSeek API生成方案概览
    // ═══════════════════════════════════════════════════════
    async callDeepSeekForSummary(modificationNote = '') {
        const systemPrompt = `你是一位资深景观/建筑设计师，擅长通过用户访谈提炼设计策略。
请根据用户的问答记录，生成一份专业的景观设计方案概览。
要求：
1. 用中文输出，Markdown格式
2. 包含：场地认知、用户分析、核心挑战、设计策略方向、功能建议、风格建议、下一步行动
3. 语言专业但不晦涩，适合设计师汇报使用
4. 每个部分要有具体的、可操作的建议，不要泛泛而谈
5. 如果用户提到了具体面积、风格偏好、功能需求，必须在策略中体现`;

        let userPrompt = `项目类型：${this.projectTypeLabel}\n\n`;

        if (this.referenceImages.length > 0) {
            userPrompt += `【参考意向图】用户上传了 ${this.referenceImages.length} 张参考图片/意向图，请在设计策略中考虑用户的视觉偏好和参考意向。\n\n`;
        }

        const qaText = this.qaHistory.map((q, i) => {
            return `Q${i + 1}: ${q.question}\nA${i + 1}: ${q.answer}`;
        }).join('\n\n');

        userPrompt += `用户问答记录：\n\n${qaText}\n\n`;

        if (this.iterationCount > 0 && this.currentSummary) {
            userPrompt += `【当前方案第${this.iterationCount}稿】\n${this.currentSummary}\n\n`;
        }

        if (modificationNote) {
            userPrompt += `【用户修改意见】${modificationNote}\n\n请基于以上修改意见，重新生成方案概览。保留原方案的优点，针对修改意见进行优化。`;
        } else {
            userPrompt += `请基于以上信息，生成完整的景观设计方案概览。`;
        }

        const content = await callAI('deepseek', [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ], { temperature: 0.8, max_tokens: 3000 });

        return content;
    },

    // ═══════════════════════════════════════════════════════
    // 本地备用方案（API失败时fallback）
    // ═══════════════════════════════════════════════════════
    generateSummaryFallback() {
        const answers = this.qaHistory;
        const typeLabel = this.projectTypeLabel;
        const siteInfo = answers.find(a => a.questionId === 'site_basic')?.answer || '待定';
        const users = answers.find(a => a.questionId === 'target_users')?.answer || '待定';
        const challenge = answers.find(a => a.questionId === 'design_challenge')?.answer || '待定';
        const style = answers.find(a => a.questionId === 'style_pref')?.answer || '待定';
        const functions = answers.find(a => a.questionId === 'key_functions')?.answer || '待定';
        const output = answers.find(a => a.questionId === 'output_format')?.answer || 'PPT+展板';

        return `## ${typeLabel}设计方案概览\n\n` +
            `### 1. 场地认知\n${siteInfo}\n\n` +
            `### 2. 目标用户\n${users}\n\n` +
            `### 3. 核心挑战\n${challenge}\n\n` +
            `### 4. 设计策略方向\n` +
            `- 风格定位：${style}\n` +
            `- 功能配置：${functions}\n` +
            `- 以用户为中心，回应场地特质\n\n` +
            `### 5. 交付目标\n${output}\n\n` +
            `### 6. 下一步建议\n` +
            `1. 进入工作流画布，细化设计节点\n` +
            `2. 使用效果图与表达生成概念方案\n` +
            `3. 基于方案生成PPT与展板\n`;
    },

    // ═══════════════════════════════════════════════════════
    // 显示实时预览
    // ═══════════════════════════════════════════════════════
    showLivePreview(summary) {
        const preview = document.getElementById('guide-live-preview');
        const content = document.getElementById('guide-preview-content');
        if (!preview || !content) return;
        
        preview.style.display = 'block';

        const html = summary
            .replace(/## (.+)/g, '<h3 style="font-size:16px;font-weight:700;color:var(--cream);margin:14px 0 8px">$1</h3>')
            .replace(/### (.+)/g, '<h4 style="font-size:14px;font-weight:600;color:var(--sun-f);margin:10px 0 6px">$1</h4>')
            .replace(/^- (.+)/gm, '<li style="margin-left:16px;color:rgba(250,240,208,.75);font-size:13px;line-height:1.8">$1</li>')
            .replace(/^\d+\. (.+)/gm, '<li style="margin-left:16px;color:rgba(250,240,208,.75);font-size:13px;line-height:1.8"><span style="color:var(--sun-f);font-weight:600">$1</span> $2</li>')
            .replace(/\n\n/g, '</p><p style="color:rgba(250,240,208,.7);font-size:13px;line-height:1.8;margin:8px 0">')
            .replace(/^(?!<[hl]|<li)/gm, '<p style="color:rgba(250,240,208,.7);font-size:13px;line-height:1.8;margin:8px 0">')
            .replace(/<p[^>]*>\s*<\/p>/g, '');

        content.innerHTML = html;

        // 自动滚动到预览区域，让用户看到方案
        preview.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    // ═══════════════════════════════════════════════════════
    // localStorage 持久化
    // ═══════════════════════════════════════════════════════
    saveToStorage() {
        try {
            const data = {
                qaHistory: this.qaHistory,
                projectType: this.projectType,
                projectTypeLabel: this.projectTypeLabel,
                referenceImages: this.referenceImages,
                currentSummary: this.currentSummary,
                iterationCount: this.iterationCount,
                reviewResult: this.reviewResult,
                isComplete: this.isComplete,
                isReviewed: this.isReviewed,
                isFinalConfirmed: this.isFinalConfirmed
            };
            localStorage.setItem('aiGuide_session', JSON.stringify(data));
        } catch (e) {
            console.error('保存会话失败:', e);
        }
    },

    loadFromStorage() {
        try {
            const raw = localStorage.getItem('aiGuide_session');
            if (!raw) return false;
            const data = JSON.parse(raw);
            if (!data.projectType) return false;

            this.qaHistory = data.qaHistory || [];
            this.projectType = data.projectType;
            this.projectTypeLabel = data.projectTypeLabel || '';
            this.referenceImages = data.referenceImages || [];
            this.currentSummary = data.currentSummary || '';
            this.iterationCount = data.iterationCount || 0;
            this.reviewResult = data.reviewResult || null;
            this.isComplete = data.isComplete || false;
            this.isReviewed = data.isReviewed || false;
            this.isFinalConfirmed = data.isFinalConfirmed || false;

            return true;
        } catch (e) {
            console.error('加载会话失败:', e);
            return false;
        }
    },

    clearStorage() {
        try {
            localStorage.removeItem('aiGuide_session');
        } catch (e) {}
    },

    saveProjectToHistory(project) {
        try {
            const history = JSON.parse(localStorage.getItem('aiGuide_projects') || '[]');
            history.unshift({
                id: project.id,
                name: project.name,
                type: project.type,
                typeLabel: project.typeLabel,
                createdAt: Date.now(),
                summary: project.summary
            });
            if (history.length > 50) history.pop();
            localStorage.setItem('aiGuide_projects', JSON.stringify(history));
        } catch (e) {
            console.error('保存项目历史失败:', e);
        }
    },

    restoreSession() {
        const resumeNotice = document.getElementById('guide-resume-notice');
        if (resumeNotice) resumeNotice.remove();

        const step0 = document.getElementById('guide-step-0');
        const chatArea = document.getElementById('guide-chat-area');
        const typeLabel = document.getElementById('guide-current-type');
        
        if (step0) step0.style.display = 'none';
        if (chatArea) chatArea.style.display = 'block';
        if (typeLabel) {
            typeLabel.textContent = this.projectTypeLabel;
            typeLabel.className = 'tag tg-palm';
        }

        const history = document.getElementById('guide-chat-history');
        if (history) history.innerHTML = '';

        this.addAIMessage(`欢迎回来！继续你的 **${this.projectTypeLabel}** 项目。`);

        for (const qa of this.qaHistory) {
            this.addUserMessage(qa.answer);
        }

        for (const img of this.referenceImages) {
            this.addImageMessage(img.data, img.name);
        }

        const totalQ = (this.questionBank[this.projectType] || []).length + this.questionBank.common.length;
        const answered = this.qaHistory.length;
        const progress = this.isComplete ? 100 : Math.min(95, Math.round((answered / totalQ) * 100));

        const bar = document.getElementById('guide-progress-bar');
        const pct = document.getElementById('guide-progress-pct');
        const label = document.getElementById('guide-step-label');

        if (bar) bar.style.width = progress + '%';
        if (pct) pct.textContent = progress + '%';
        if (label) label.textContent = `步骤 ${answered + 1} / ${totalQ}`;

        this.ensureUploadButton();

        if (this.isComplete) {
            const inputArea = document.getElementById('guide-input-area');
            if (inputArea) inputArea.style.display = 'none';

            if (this.currentSummary) {
                this.showLivePreview(this.currentSummary);
                if (this.isFinalConfirmed) {
                    this.showFinalConfirmation();
                } else if (this.isReviewed && this.reviewResult) {
                    this.showReviewResult();
                } else {
                    this.showIterationControls();
                }
            } else {
                this.completeGuide();
            }
        } else {
            const inputArea = document.getElementById('guide-input-area');
            if (inputArea) inputArea.style.display = 'flex';
            setTimeout(() => this.askNextQuestion(), 800);
        }
    },

    clearAndRestart() {
        this.clearStorage();
        this.currentStep = 0;
        this.qaHistory = [];
        this.projectType = null;
        this.projectTypeLabel = '';
        this.isComplete = false;
        this.referenceImages = [];
        this.iterationCount = 0;
        this.currentSummary = '';
        this.reviewResult = null;
        this.isReviewed = false;
        this.isFinalConfirmed = false;

        const resumeNotice = document.getElementById('guide-resume-notice');
        if (resumeNotice) resumeNotice.remove();
    }
};

// 初始化
document.addEventListener('DOMContentLoaded', () => aiGuide.init());
