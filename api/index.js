/**
 * Vercel Serverless Function - AI后端代理
 * 路径：/api/* 自动映射
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');
const kv = require('./_kv');
const wxpay = require('./_wxpay');

// ============ 从环境变量读取配置 ============
const API_SECRET = process.env.API_SECRET || '65ba25906dd2192d4586b44a0d0070345a461449606d1f549179c4056b8a73c5';

const AI_SERVICES = {
    deepseek: {
        baseURL: process.env.DEEPSEEK_BASE_URL,
        apiKey: process.env.DEEPSEEK_API_KEY,
        model: 'deepseek-chat'
    },
    kimi: {
        baseURL: process.env.KIMI_BASE_URL,
        apiKey: process.env.KIMI_API_KEY,
        model: 'kimi-k2.6'
    },
    openai: {
        baseURL: process.env.OPENAI_BASE_URL,
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3'
    }
};

const LIMITS = {
    maxDailyRequests: parseInt(process.env.MAX_DAILY_REQUESTS) || 200,
    maxImageRequestsPerDay: parseInt(process.env.MAX_IMAGE_REQUESTS_PER_DAY) || 50
};

// ============ 订阅方案 ============
// 价格单位：分（1元=100分）。与你此前验证过的 ¥39 定价一致，可自行调整。
const PLANS = {
    monthly: { amount: 3900, days: 31, label: '伍师助手 月度会员' }
};
const FREE_TRIAL_LIMIT = parseInt(process.env.FREE_TRIAL_LIMIT) || 3; // 每个匿名设备每日免费次数（未订阅时）


// ============ 用量统计（Vercel冷启动会重置，仅单次请求内有效）===========
let usageStats = {
    totalRequests: 0,
    todayRequests: 0,
    todayImageRequests: 0,
    lastResetDate: new Date().toISOString().split('T')[0]
};

function checkDailyReset() {
    const today = new Date().toISOString().split('T')[0];
    if (today !== usageStats.lastResetDate) {
        usageStats.todayRequests = 0;
        usageStats.todayImageRequests = 0;
        usageStats.lastResetDate = today;
    }
}

function logRequest(type) {
    checkDailyReset();
    usageStats.totalRequests++;
    if (type === 'image') usageStats.todayImageRequests++;
    else usageStats.todayRequests++;
}

// ============ HTTP请求代理 ============
function fetchProxy(url, options = {}) {
    return new Promise((resolve, reject) => {
        const isHttps = url.startsWith('https://');
        const client = isHttps ? https : http;
        const u = new URL(url);
        
        const req = client.request({
            hostname: u.hostname,
            port: u.port || (isHttps ? 443 : 80),
            path: u.pathname + u.search,
            method: options.method || 'GET',
            headers: options.headers || {},
            timeout: 60000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode,
                    data,
                    json: () => { try { return JSON.parse(data); } catch(e) { return null; } },
                    text: () => data
                });
            });
        });
        
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        if (options.body) req.write(options.body);
        req.end();
    });
}

// ============ CORS ============
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
};

function sendJSON(res, status, data) {
    res.statusCode = status;
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(data));
}

function checkAuth(req) {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return false;
    return auth.substring(7) === API_SECRET;
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}

function generatePlaceholders(n, prompt) {
    const placeholders = [];
    for (let i = 0; i < n; i++) {
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512'>
            <rect width='100%' height='100%' fill='%231A1000'/>
            <rect x='20' y='20' width='472' height='472' rx='12' fill='none' stroke='%23D4943A' stroke-width='2' stroke-dasharray='8,4' opacity='0.3'/>
            <text x='50%' y='45%' font-family='Arial' font-size='18' fill='%23F5C860' text-anchor='middle'>🎨 AI景观效果图</text>
            <text x='50%' y='55%' font-family='Arial' font-size='12' fill='%23D4943A' text-anchor='middle' opacity='0.7'>${prompt.substring(0, 40).replace(/</g, '&lt;')}...</text>
            <text x='50%' y='65%' font-family='Arial' font-size='11' fill='%23E87844' text-anchor='middle' opacity='0.5'>API暂不可用，占位预览</text>
        </svg>`;
        const b64 = Buffer.from(svg).toString('base64');
        placeholders.push({
            b64_json: b64,
            url: `data:image/svg+xml;base64,${b64}`,
            revised_prompt: prompt
        });
    }
    return placeholders;
}

function generateOrderNo() {
    return 'WS' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(4).toString('hex').toUpperCase();
}

function generateLicenseCode() {
    return 'WS-' + crypto.randomBytes(6).toString('hex').toUpperCase();
}

function todayStr() {
    return new Date().toISOString().split('T')[0];
}

/**
 * 校验本次AI调用是否放行：
 * 1. 有有效订阅 licenseCode -> 放行
 * 2. 没有 -> 按 clientId 计算今日免费次数，超出则拒绝
 * 3. 若 KV 尚未配置（订阅系统还没搭建/未配置环境变量）-> 放行但标记 degraded，
 *    这样在你完成微信支付+Upstash配置之前，已经接好的AI生成功能仍可正常测试。
 */
async function checkAccess({ licenseCode, clientId }) {
    let kvReady = true;
    try {
        if (licenseCode) {
            const license = await kv.kvGetJSON(`license:${licenseCode}`);
            if (license && license.status === 'active' && license.expiresAt > Date.now()) {
                return { allowed: true, mode: 'subscribed', expiresAt: license.expiresAt };
            }
            return { allowed: false, code: 'LICENSE_INVALID', error: '订阅码无效或已过期' };
        }
        if (!clientId) {
            return { allowed: false, code: 'NO_CLIENT_ID', error: '缺少 clientId' };
        }
        const count = await kv.kvIncrWithExpire(`trial:${clientId}:${todayStr()}`, 86400);
        if (count > FREE_TRIAL_LIMIT) {
            return { allowed: false, code: 'SUBSCRIPTION_REQUIRED', error: `今日免费次数已用完（${FREE_TRIAL_LIMIT}次/天），订阅后可无限使用`, trialUsed: count - 1, trialLimit: FREE_TRIAL_LIMIT };
        }
        return { allowed: true, mode: 'trial', trialUsed: count, trialLimit: FREE_TRIAL_LIMIT };
    } catch (e) {
        if (String(e.message).startsWith('KV_NOT_CONFIGURED')) {
            kvReady = false;
            return { allowed: true, mode: 'degraded', degraded: true, reason: '订阅系统尚未配置（缺少 Upstash 环境变量），暂不限制调用' };
        }
        // KV 请求本身出错（网络等），保守放行，避免因存储服务抖动导致所有付费用户被误挡
        return { allowed: true, mode: 'degraded', degraded: true, reason: 'KV_ERROR: ' + e.message };
    }
}

// ============ 主处理函数 ============
module.exports = async (req, res) => {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    const method = req.method;
    
    // OPTIONS 预检
    if (method === 'OPTIONS') {
        sendJSON(res, 204, {});
        return;
    }
    
    // 1. 健康检查
    if (pathname === '/api/health' && method === 'GET') {
        const services = {};
        for (const [name, config] of Object.entries(AI_SERVICES)) {
            services[name] = {
                configured: !!(config.baseURL && config.apiKey),
                model: config.model
            };
        }
        sendJSON(res, 200, {
            status: 'ok',
            timestamp: new Date().toISOString(),
            services,
            usage: {
                todayTotal: usageStats.todayRequests + usageStats.todayImageRequests,
                todayChat: usageStats.todayRequests,
                todayImages: usageStats.todayImageRequests,
                limits: LIMITS
            }
        });
        return;
    }
    
    // 2. 前端配置
    if (pathname === '/api/config' && method === 'GET') {
        sendJSON(res, 200, {
            backendVersion: '1.0.0',
            services: {
                deepseek: { configured: !!AI_SERVICES.deepseek.apiKey },
                kimi: { configured: !!AI_SERVICES.kimi.apiKey },
                openai: { configured: !!AI_SERVICES.openai.apiKey }
            },
            limits: LIMITS
        });
        return;
    }
    
    // 3. 用量查询
    if (pathname === '/api/usage' && method === 'GET') {
        if (!checkAuth(req)) {
            sendJSON(res, 401, { error: '缺少鉴权', code: 'NO_AUTH' });
            return;
        }
        checkDailyReset();
        sendJSON(res, 200, {
            today: {
                chatRequests: usageStats.todayRequests,
                imageRequests: usageStats.todayImageRequests,
                total: usageStats.todayRequests + usageStats.todayImageRequests
            },
            total: usageStats.totalRequests,
            limits: LIMITS,
            lastReset: usageStats.lastResetDate
        });
        return;
    }
    
    // 4. 文本 AI 代理
    if (pathname === '/api/ai/chat' && method === 'POST') {
        if (!checkAuth(req)) {
            sendJSON(res, 401, { error: '缺少鉴权', code: 'NO_AUTH' });
            return;
        }
        
        const body = await readBody(req);
        let json;
        try { json = JSON.parse(body); } catch (e) {
            sendJSON(res, 400, { error: '无效JSON', code: 'BAD_JSON' });
            return;
        }
        
        const { service, messages, options = {}, licenseCode, clientId } = json;
        
        if (!service || !['deepseek', 'kimi'].includes(service)) {
            sendJSON(res, 400, { error: 'service须为deepseek或kimi', code: 'BAD_SERVICE' });
            return;
        }
        if (!messages || !Array.isArray(messages)) {
            sendJSON(res, 400, { error: 'messages不能为空', code: 'BAD_MESSAGES' });
            return;
        }

        const access = await checkAccess({ licenseCode, clientId });
        if (!access.allowed) {
            sendJSON(res, 402, { error: access.error, code: access.code, trialUsed: access.trialUsed, trialLimit: access.trialLimit });
            return;
        }
        
        checkDailyReset();
        if (usageStats.todayRequests >= LIMITS.maxDailyRequests) {
            sendJSON(res, 429, { error: `今日已达上限(${LIMITS.maxDailyRequests})`, code: 'LIMIT_EXCEEDED' });
            return;
        }
        
        const config = AI_SERVICES[service];
        if (!config.apiKey) {
            sendJSON(res, 500, { error: `${service}未配置`, code: 'NOT_CONFIGURED' });
            return;
        }
        
        try {
            const response = await fetchProxy(`${config.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                    model: config.model,
                    messages,
                    temperature: options.temperature ?? 0.7,
                    max_tokens: options.max_tokens ?? 4096,
                    ...options
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`AI ${response.status}: ${errorText}`);
            }
            
            const data = response.json();
            logRequest('chat');
            sendJSON(res, 200, {
                success: true,
                content: data.choices?.[0]?.message?.content || '',
                usage: data.usage,
                service,
                access: { mode: access.mode, trialUsed: access.trialUsed, trialLimit: access.trialLimit, degraded: access.degraded }
            });
        } catch (err) {
            logRequest('chat');
            sendJSON(res, 502, { error: err.message, code: 'AI_PROXY_ERROR' });
        }
        return;
    }
    
    // 5. 图像生成代理
    if (pathname === '/api/ai/image' && method === 'POST') {
        if (!checkAuth(req)) {
            sendJSON(res, 401, { error: '缺少鉴权', code: 'NO_AUTH' });
            return;
        }
        
        const body = await readBody(req);
        let json;
        try { json = JSON.parse(body); } catch (e) {
            sendJSON(res, 400, { error: '无效JSON', code: 'BAD_JSON' });
            return;
        }
        
        const { prompt, n = 1, size = '1024x1024', quality = 'medium', licenseCode, clientId } = json;
        
        if (!prompt || !prompt.trim()) {
            sendJSON(res, 400, { error: 'prompt不能为空', code: 'BAD_PROMPT' });
            return;
        }

        const access = await checkAccess({ licenseCode, clientId });
        if (!access.allowed) {
            sendJSON(res, 402, { error: access.error, code: access.code, trialUsed: access.trialUsed, trialLimit: access.trialLimit });
            return;
        }
        
        checkDailyReset();
        if (usageStats.todayImageRequests >= LIMITS.maxImageRequestsPerDay) {
            sendJSON(res, 429, { error: `今日图像已达上限(${LIMITS.maxImageRequestsPerDay})`, code: 'IMAGE_LIMIT_EXCEEDED' });
            return;
        }
        
        const providers = [];
        if (AI_SERVICES.openai.apiKey && AI_SERVICES.openai.baseURL) {
            providers.push({
                name: 'openai',
                baseURL: AI_SERVICES.openai.baseURL,
                apiKey: AI_SERVICES.openai.apiKey,
                model: AI_SERVICES.openai.model
            });
        }
        for (let i = 1; i <= 2; i++) {
            const backupKey = process.env[`OPENAI_BACKUP_${i}_API_KEY`];
            const backupURL = process.env[`OPENAI_BACKUP_${i}_BASE_URL`];
            if (backupKey && backupURL) {
                providers.push({
                    name: `backup-${i}`,
                    baseURL: backupURL,
                    apiKey: backupKey,
                    model: process.env[`OPENAI_BACKUP_${i}_MODEL`] || 'dall-e-3'
                });
            }
        }
        
        if (providers.length === 0) {
            const placeholderImages = generatePlaceholders(n, prompt);
            sendJSON(res, 200, { success: true, images: placeholderImages, count: placeholderImages.length, fallback: true, reason: '未配置图像API' });
            return;
        }
        
        try {
            let lastError = null;
            for (const provider of providers) {
                try {
                    const response = await fetchProxy(`${provider.baseURL}/images/generations`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${provider.apiKey}`
                        },
                        body: JSON.stringify({
                            model: provider.model,
                            prompt,
                            n: Math.min(n, 1),
                            size,
                            quality,
                            response_format: 'b64_json'
                        })
                    });
                    
                    if (response.ok) {
                        const data = response.json();
                        const images = data.data.map(item => ({
                            b64_json: item.b64_json,
                            url: `data:image/png;base64,${item.b64_json}`,
                            revised_prompt: item.revised_prompt || prompt
                        }));
                        logRequest('image');
                        sendJSON(res, 200, { success: true, images, count: images.length, provider: provider.name, access: { mode: access.mode, trialUsed: access.trialUsed, trialLimit: access.trialLimit, degraded: access.degraded } });
                        return;
                    } else {
                        const errorText = await response.text();
                        lastError = `[${provider.name}] ${response.status}: ${errorText}`;
                    }
                } catch (e) {
                    lastError = `[${provider.name}] ${e.message}`;
                }
            }
            
            const placeholderImages = generatePlaceholders(n, prompt);
            sendJSON(res, 200, { success: true, images: placeholderImages, count: placeholderImages.length, fallback: true, reason: lastError });
        } catch (err) {
            const placeholderImages = generatePlaceholders(n, prompt);
            sendJSON(res, 200, { success: true, images: placeholderImages, count: placeholderImages.length, fallback: true });
        }
        return;
    }
    
    // 6. 订阅方案列表
    if (pathname === '/api/subscribe/plans' && method === 'GET') {
        sendJSON(res, 200, { plans: PLANS, freeTrialLimit: FREE_TRIAL_LIMIT });
        return;
    }

    // 7. 创建微信支付订单（Native扫码）
    if (pathname === '/api/subscribe/create-order' && method === 'POST') {
        const body = await readBody(req);
        let json;
        try { json = JSON.parse(body); } catch (e) {
            sendJSON(res, 400, { error: '无效JSON', code: 'BAD_JSON' });
            return;
        }
        const plan = PLANS[json.plan];
        if (!plan) {
            sendJSON(res, 400, { error: '无效的订阅方案', code: 'BAD_PLAN' });
            return;
        }
        try {
            const outTradeNo = generateOrderNo();
            const wxOrder = await wxpay.createNativeOrder(outTradeNo, plan.label, plan.amount);
            await kv.kvSetJSON(`order:${outTradeNo}`, { status: 'pending', plan: json.plan, amount: plan.amount, createdAt: Date.now() }, 3600);
            sendJSON(res, 200, { outTradeNo, codeUrl: wxOrder.code_url, amount: plan.amount, plan: json.plan, label: plan.label });
        } catch (e) {
            const code = String(e.message).startsWith('WXPAY_NOT_CONFIGURED') ? 'WXPAY_NOT_CONFIGURED' : 'CREATE_ORDER_FAILED';
            sendJSON(res, code === 'WXPAY_NOT_CONFIGURED' ? 501 : 502, { error: e.message, code });
        }
        return;
    }

    // 8. 查询订单状态（前端轮询）——真相始终以主动查询微信支付结果为准
    if (pathname === '/api/subscribe/order-status' && method === 'GET') {
        const outTradeNo = new URL(req.url, `http://${req.headers.host}`).searchParams.get('out_trade_no');
        if (!outTradeNo) {
            sendJSON(res, 400, { error: '缺少 out_trade_no', code: 'BAD_PARAMS' });
            return;
        }
        try {
            let order = await kv.kvGetJSON(`order:${outTradeNo}`);
            if (!order) {
                sendJSON(res, 404, { error: '订单不存在或已过期', code: 'ORDER_NOT_FOUND' });
                return;
            }
            if (order.status === 'paid') {
                sendJSON(res, 200, { status: 'paid', licenseCode: order.licenseCode, expiresAt: order.expiresAt });
                return;
            }
            // 主动向微信查询真实状态，不依赖回调是否已经到达
            const wxResult = await wxpay.queryOrderByOutTradeNo(outTradeNo);
            if (wxResult.trade_state === 'SUCCESS') {
                const plan = PLANS[order.plan];
                const licenseCode = generateLicenseCode();
                const expiresAt = Date.now() + plan.days * 86400000;
                await kv.kvSetJSON(`license:${licenseCode}`, { status: 'active', plan: order.plan, expiresAt, outTradeNo }, plan.days * 86400 + 86400);
                await kv.kvSetJSON(`order:${outTradeNo}`, Object.assign({}, order, { status: 'paid', licenseCode, expiresAt }), 7 * 86400);
                sendJSON(res, 200, { status: 'paid', licenseCode, expiresAt });
            } else if (['CLOSED', 'PAYERROR', 'REVOKED'].includes(wxResult.trade_state)) {
                await kv.kvSetJSON(`order:${outTradeNo}`, Object.assign({}, order, { status: 'closed' }), 3600);
                sendJSON(res, 200, { status: 'closed', tradeState: wxResult.trade_state });
            } else {
                sendJSON(res, 200, { status: 'pending', tradeState: wxResult.trade_state });
            }
        } catch (e) {
            const code = String(e.message).startsWith('WXPAY_NOT_CONFIGURED') || String(e.message).startsWith('KV_NOT_CONFIGURED') ? 501 : 502;
            sendJSON(res, code, { error: e.message, code: 'ORDER_STATUS_FAILED' });
        }
        return;
    }

    // 9. 微信支付结果回调——仅作为"有变化，去查询"的触发信号，不直接信任回调内容发货
    if (pathname === '/api/subscribe/notify' && method === 'POST') {
        try {
            const body = await readBody(req);
            const notification = JSON.parse(body);
            let outTradeNo = null;
            try {
                const resource = wxpay.decryptNotifyResource(notification.resource);
                outTradeNo = resource.out_trade_no;
            } catch (decryptErr) {
                // 解密失败也不直接报错给微信重试风暴，走下面的查单兜底逻辑（如果拿不到订单号则只能放弃本次通知）
            }
            if (outTradeNo) {
                const order = await kv.kvGetJSON(`order:${outTradeNo}`);
                if (order && order.status !== 'paid') {
                    const wxResult = await wxpay.queryOrderByOutTradeNo(outTradeNo);
                    if (wxResult.trade_state === 'SUCCESS') {
                        const plan = PLANS[order.plan];
                        const licenseCode = generateLicenseCode();
                        const expiresAt = Date.now() + plan.days * 86400000;
                        await kv.kvSetJSON(`license:${licenseCode}`, { status: 'active', plan: order.plan, expiresAt, outTradeNo }, plan.days * 86400 + 86400);
                        await kv.kvSetJSON(`order:${outTradeNo}`, Object.assign({}, order, { status: 'paid', licenseCode, expiresAt }), 7 * 86400);
                    }
                }
            }
            // 无论内部处理是否完全成功，只要收到了合法请求就回200，避免微信因5xx持续重试；
            // 真正的发货状态由前端轮询 order-status 兜底确认，不会因为这里漏判而"钱到货不到"
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ code: 'SUCCESS', message: '成功' }));
        } catch (e) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ code: 'SUCCESS', message: '成功' }));
        }
        return;
    }

    // 10. 校验订阅码是否有效
    if (pathname === '/api/subscribe/verify-license' && method === 'POST') {
        const body = await readBody(req);
        let json;
        try { json = JSON.parse(body); } catch (e) {
            sendJSON(res, 400, { error: '无效JSON', code: 'BAD_JSON' });
            return;
        }
        if (!json.licenseCode) {
            sendJSON(res, 400, { error: '缺少 licenseCode', code: 'BAD_PARAMS' });
            return;
        }
        try {
            const license = await kv.kvGetJSON(`license:${json.licenseCode}`);
            if (!license) {
                sendJSON(res, 200, { valid: false, code: 'NOT_FOUND' });
                return;
            }
            const valid = license.status === 'active' && license.expiresAt > Date.now();
            sendJSON(res, 200, { valid, expiresAt: license.expiresAt, plan: license.plan, expired: !valid && license.expiresAt <= Date.now() });
        } catch (e) {
            sendJSON(res, 501, { error: e.message, code: 'KV_NOT_CONFIGURED' });
        }
        return;
    }

    // 404
    sendJSON(res, 404, { error: 'Not Found', path: pathname });
};
