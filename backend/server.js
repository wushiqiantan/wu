/**
 * AI Design Workflow Platform - Backend Server
 * 纯 Node.js 内置模块实现，无需 npm install
 * 
 * 启动：node server.js
 * 端口：默认 3000（可通过 PORT 环境变量修改）
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// ============ 读取 .env 配置 ============
function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        console.error('❌ 未找到 .env 文件，请复制 .env.example 并填入 API Key');
        process.exit(1);
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const eq = line.indexOf('=');
        if (eq > 0 && !line.startsWith('#')) {
            const key = line.substring(0, eq).trim();
            const val = line.substring(eq + 1).trim();
            if (key && val) process.env[key] = val;
        }
    });
}

loadEnv();

// ============ 配置 ============
const PORT = parseInt(process.env.PORT) || 3000;
const API_SECRET = process.env.API_SECRET || 'default-secret-change-me';

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
    // OpenAI / 图像生成
    // 支持第三方API中转平台：只需把 BASE_URL 和 KEY 换成中转商提供的即可
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

// ============ 用量统计 ============
const usageStats = {
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
        console.log(`📅 用量统计已重置：${today}`);
    }
}

function logRequest(type, status) {
    checkDailyReset();
    usageStats.totalRequests++;
    if (type === 'image') usageStats.todayImageRequests++;
    else usageStats.todayRequests++;
}

// ============ 内置 fetch（Node 18+）===========
// Node 24 内置了 fetch，但保险起见使用 https 模块
const https = require('https');
const httpAgent = require('http');

function fetchProxy(url, options = {}) {
    return new Promise((resolve, reject) => {
        const isHttps = url.startsWith('https://');
        const client = isHttps ? https : httpAgent;
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
                    json: () => Promise.resolve(JSON.parse(data)),
                    text: () => Promise.resolve(data)
                });
            });
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        if (options.body) req.write(options.body);
        req.end();
    });
}

// ============ CORS 响应头 ============
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
};

// ============ 路由处理 ============
async function handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;
    
    // 预检请求
    if (method === 'OPTIONS') {
        res.writeHead(204, CORS_HEADERS);
        res.end();
        return;
    }
    
    // 设置 CORS 头
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    // 1. 健康检查
    if (pathname === '/api/health' && method === 'GET') {
        const services = {};
        for (const [name, config] of Object.entries(AI_SERVICES)) {
            services[name] = {
                configured: !!(config.baseURL && config.apiKey),
                model: config.model
            };
        }
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'ok',
            timestamp: new Date().toISOString(),
            services,
            usage: {
                todayTotal: usageStats.todayRequests + usageStats.todayImageRequests,
                todayChat: usageStats.todayRequests,
                todayImages: usageStats.todayImageRequests,
                limits: LIMITS
            }
        }));
        return;
    }
    
    // 2. 前端配置（无需鉴权）
    if (pathname === '/api/config' && method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify({
            backendVersion: '1.0.0',
            services: {
                deepseek: { configured: !!AI_SERVICES.deepseek.apiKey },
                kimi: { configured: !!AI_SERVICES.kimi.apiKey },
                openai: { configured: !!AI_SERVICES.openai.apiKey }
            },
            limits: LIMITS
        }));
        return;
    }
    
    // 3. 用量查询
    if (pathname === '/api/usage' && method === 'GET') {
        if (!checkAuth(req, res)) return;
        checkDailyReset();
        res.writeHead(200);
        res.end(JSON.stringify({
            today: {
                chatRequests: usageStats.todayRequests,
                imageRequests: usageStats.todayImageRequests,
                total: usageStats.todayRequests + usageStats.todayImageRequests
            },
            total: usageStats.totalRequests,
            limits: LIMITS,
            lastReset: usageStats.lastResetDate
        }));
        return;
    }
    
    // 4. 文本 AI 代理
    if (pathname === '/api/ai/chat' && method === 'POST') {
        if (!checkAuth(req, res)) return;
        
        const body = await readBody(req);
        let json;
        try { json = JSON.parse(body); } catch (e) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: '无效的 JSON', code: 'BAD_JSON' }));
            return;
        }
        
        const { service, messages, options = {} } = json;
        
        if (!service || !['deepseek', 'kimi'].includes(service)) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'service 必须为 "deepseek" 或 "kimi"', code: 'BAD_SERVICE' }));
            return;
        }
        
        if (!messages || !Array.isArray(messages)) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'messages 不能为空', code: 'BAD_MESSAGES' }));
            return;
        }
        
        // 用量检查
        checkDailyReset();
        if (usageStats.todayRequests >= LIMITS.maxDailyRequests) {
            res.writeHead(429);
            res.end(JSON.stringify({ error: `今日已达上限 (${LIMITS.maxDailyRequests})`, code: 'LIMIT_EXCEEDED' }));
            return;
        }
        
        const config = AI_SERVICES[service];
        if (!config.apiKey) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: `${service} 未配置`, code: 'NOT_CONFIGURED' }));
            return;
        }
        
        try {
            console.log(`🤖 代理: ${service} | ${messages.length} 条消息`);
            
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
            
            const data = await response.json();
            logRequest('chat', 'success');
            
            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                content: data.choices?.[0]?.message?.content || '',
                usage: data.usage,
                service
            }));
            
        } catch (err) {
            console.error('❌ AI 错误:', err.message);
            logRequest('chat', 'error');
            res.writeHead(502);
            res.end(JSON.stringify({ error: err.message, code: 'AI_PROXY_ERROR' }));
        }
        return;
    }
    
    // 5. 图像生成代理（支持多提供商备用）
    if (pathname === '/api/ai/image' && method === 'POST') {
        if (!checkAuth(req, res)) return;
        
        const body = await readBody(req);
        let json;
        try { json = JSON.parse(body); } catch (e) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: '无效的 JSON', code: 'BAD_JSON' }));
            return;
        }
        
        const { prompt, n = 1, size = '1024x1024', quality = 'medium' } = json;
        
        if (!prompt || !prompt.trim()) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'prompt 不能为空', code: 'BAD_PROMPT' }));
            return;
        }
        
        // 用量检查
        checkDailyReset();
        if (usageStats.todayImageRequests >= LIMITS.maxImageRequestsPerDay) {
            res.writeHead(429);
            res.end(JSON.stringify({ error: `今日图像已达上限 (${LIMITS.maxImageRequestsPerDay})`, code: 'IMAGE_LIMIT_EXCEEDED' }));
            return;
        }
        
        // 配置图像提供商列表（支持多备用）
        // 优先级：主OpenAI配置 → 备用中转1 → 备用中转2
        const providers = [];
        if (AI_SERVICES.openai.apiKey && AI_SERVICES.openai.baseURL) {
            providers.push({
                name: 'openai',
                baseURL: AI_SERVICES.openai.baseURL,
                apiKey: AI_SERVICES.openai.apiKey,
                model: AI_SERVICES.openai.model
            });
        }
        // 备用中转平台（通过环境变量配置）
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
            console.log('⚠️ 无图像提供商配置，返回占位图');
            const placeholderImages = generatePlaceholders(n, prompt);
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, images: placeholderImages, count: placeholderImages.length, fallback: true, reason: '未配置图像API' }));
            return;
        }
        
        try {
            console.log(`🎨 图像: ${n}张 | ${prompt.substring(0, 50)}...`);
            
            // 依次尝试每个提供商
            let lastError = null;
            for (const provider of providers) {
                try {
                    console.log(`🔄 尝试提供商: ${provider.name}`);
                    
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
                        const data = await response.json();
                        const images = data.data.map(item => ({
                            b64_json: item.b64_json,
                            url: `data:image/png;base64,${item.b64_json}`,
                            revised_prompt: item.revised_prompt || prompt
                        }));
                        
                        logRequest('image', 'success');
                        console.log(`✅ 图像成功 (${provider.name}): ${images.length} 张`);
                        
                        res.writeHead(200);
                        res.end(JSON.stringify({ success: true, images, count: images.length, provider: provider.name }));
                        return;
                    } else {
                        const errorText = await response.text();
                        lastError = `[${provider.name}] ${response.status}: ${errorText}`;
                        console.warn(`⚠️ ${provider.name} 失败: ${lastError}`);
                    }
                } catch (e) {
                    lastError = `[${provider.name}] ${e.message}`;
                    console.warn(`⚠️ ${provider.name} 异常: ${lastError}`);
                }
            }
            
            // 所有提供商都失败
            console.log('🎨 所有提供商失败，返回占位图');
            const placeholderImages = generatePlaceholders(n, prompt);
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, images: placeholderImages, count: placeholderImages.length, fallback: true, reason: lastError }));
            
        } catch (err) {
            console.error('❌ 图像错误:', err.message);
            logRequest('image', 'error');
            const placeholderImages = generatePlaceholders(n, prompt);
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, images: placeholderImages, count: placeholderImages.length, fallback: true }));
        }
        return;
    }
    
    // 静态文件服务（前端）
    let filePath = pathname;
    if (filePath === '/') filePath = '/index.html';
    
    const publicPath = path.join(__dirname, '..');
    const fullPath = path.join(publicPath, filePath);
    
    // 安全检查：防止目录遍历
    if (!fullPath.startsWith(publicPath)) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'Forbidden' }));
        return;
    }
    
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        const ext = path.extname(fullPath).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon'
        };
        res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
        res.writeHead(200);
        res.end(fs.readFileSync(fullPath));
        return;
    }
    
    // 404
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not Found', path: pathname }));
}

function generatePlaceholders(n, prompt) {
    const placeholders = [];
    for (let i = 0; i < n; i++) {
        // 生成一个SVG占位图，编码为base64
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

// ============ 辅助函数 ============
function checkAuth(req, res) {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: '缺少 Authorization', code: 'NO_AUTH' }));
        return false;
    }
    if (auth.substring(7) !== API_SECRET) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: '无效的 Token', code: 'INVALID_TOKEN' }));
        return false;
    }
    return true;
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}

// ============ 启动 ============
const server = http.createServer(async (req, res) => {
    const start = Date.now();
    res.on('finish', () => {
        console.log(`${new Date().toISOString()} | ${req.method} ${req.url} | ${res.statusCode} | ${Date.now() - start}ms`);
    });
    await handleRequest(req, res);
});

server.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║  AI景观设计工作流平台 - 后端服务器                   ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log(`║  端口: ${PORT.toString().padEnd(40)} ║`);
    console.log(`║  地址: http://localhost:${PORT.toString().padEnd(32)} ║`);
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log('║  可用端点:                                           ║');
    console.log('║  • GET  /api/health       - 健康检查                 ║');
    console.log('║  • GET  /api/config       - 前端配置                  ║');
    console.log('║  • POST /api/ai/chat      - AI文本代理              ║');
    console.log('║  • POST /api/ai/image     - AI图像生成代理          ║');
    console.log('║  • GET  /api/usage        - 用量统计                ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    
    const services = [];
    if (AI_SERVICES.deepseek.apiKey) services.push('DeepSeek');
    if (AI_SERVICES.kimi.apiKey) services.push('Kimi');
    if (AI_SERVICES.openai.apiKey) services.push('OpenAI');
    console.log(`║  已配置AI服务: ${services.join(', ').padEnd(33)} ║`);
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log('║  提示: 浏览器访问 http://localhost:3000 打开前端     ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');
});

server.on('error', (err) => {
    console.error('❌ 服务器错误:', err.message);
    if (err.code === 'EADDRINUSE') {
        console.error(`端口 ${PORT} 已被占用，请修改 .env 中的 PORT 或关闭其他进程`);
    }
});
