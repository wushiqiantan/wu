/**
 * 持久化 KV 存储（基于 Upstash Redis REST API）
 * 用于替代此前"进程内变量、Vercel冷启动即丢失"的用量统计/订单状态存储。
 *
 * 需要在 Vercel 项目环境变量中配置：
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 * 两者由 Upstash 免费 Redis 数据库创建后自动提供（也可通过 Vercel 集成市场一键关联）。
 *
 * 未配置时，所有方法会抛出错误，调用方应捕获并按"服务未就绪"处理，
 * 不应静默失败为内存对象——这正是之前限流形同虚设的根源。
 */

const https = require('https');
const http = require('http');

function getConfig() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
        throw new Error('KV_NOT_CONFIGURED: 未配置 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN');
    }
    return { url, token };
}

function upstashRequest(command) {
    const { url, token } = getConfig();
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(command);
        const u = new URL(url);
        const isHttps = u.protocol === 'https:';
        const client = isHttps ? https : http;
        const req = client.request({
            hostname: u.hostname,
            port: u.port || (isHttps ? 443 : 80),
            path: u.pathname || '/',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            },
            timeout: 10000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) {
                        reject(new Error('UPSTASH_ERROR: ' + parsed.error));
                    } else {
                        resolve(parsed.result);
                    }
                } catch (e) {
                    reject(new Error('UPSTASH_PARSE_ERROR: ' + data));
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('UPSTASH_TIMEOUT')); });
        req.write(body);
        req.end();
    });
}

// 获取字符串值，不存在返回 null
async function kvGet(key) {
    const result = await upstashRequest(['GET', key]);
    return result === null ? null : result;
}

// 获取并JSON解析，不存在或解析失败返回 null
async function kvGetJSON(key) {
    const raw = await kvGet(key);
    if (raw === null) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
}

// 设置字符串值，可选过期秒数
async function kvSet(key, value, exSeconds) {
    const cmd = exSeconds
        ? ['SET', key, value, 'EX', String(exSeconds)]
        : ['SET', key, value];
    return upstashRequest(cmd);
}

// 设置JSON值，可选过期秒数
async function kvSetJSON(key, obj, exSeconds) {
    return kvSet(key, JSON.stringify(obj), exSeconds);
}

// 原子自增，返回自增后的值；可在首次自增时设置过期（用于按日计数器）
async function kvIncrWithExpire(key, exSeconds) {
    const result = await upstashRequest(['INCR', key]);
    if (Number(result) === 1 && exSeconds) {
        // 首次创建该key时才设置过期，避免每次自增都刷新过期时间
        await upstashRequest(['EXPIRE', key, String(exSeconds)]);
    }
    return Number(result);
}

async function kvDel(key) {
    return upstashRequest(['DEL', key]);
}

module.exports = { kvGet, kvGetJSON, kvSet, kvSetJSON, kvIncrWithExpire, kvDel };
