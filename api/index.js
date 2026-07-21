/**
 * Vercel Serverless Function - AI后端代理
 * 路径：/api/* 自动映射
 */

const https = require('https');
const http = require('http');

// ============ 从环境变量读取配置 ============
// 与前端 api-config.js 中的 apiSecret 保持一致
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
        
        const { service, messages, options = {} } = json;
        
        if (!service || !['deepseek', 'kimi'].includes(service)) {
            sendJSON(res, 400, { error: 'service须为deepseek或kimi', code: 'BAD_SERVICE' });
            return;
        }
        if (!messages || !Array.isArray(messages)) {
            sendJSON(res, 400, { error: 'messages不能为空', code: 'BAD_MESSAGES' });
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
                service
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
        
        const { prompt, n = 1, size = '1024x1024', quality = 'medium' } = json;
        
        if (!prompt || !prompt.trim()) {
            sendJSON(res, 400, { error: 'prompt不能为空', code: 'BAD_PROMPT' });
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
                        sendJSON(res, 200, { success: true, images, count: images.length, provider: provider.name });
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
    
    // 404
    sendJSON(res, 404, { error: 'Not Found', path: pathname });
};
