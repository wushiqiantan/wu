/**
 * API Configuration - Frontend
 * 前端 API 配置（连接后端代理，不暴露真实 Key）
 */

const API_CONFIG = {
    // 后端服务器地址
    backend: {
        baseURL: 'http://localhost:3000',  // 后端代理地址
        apiSecret: '65ba25906dd2192d4586b44a0d0070345a461449606d1f549179c4056b8a73c5'  // 与后端 API_SECRET 一致
    }
};

/**
 * 通用后端代理调用（文本AI）
 * @param {string} service - 'deepseek' | 'kimi'
 * @param {Array} messages - 对话消息数组
 * @param {Object} options - 额外参数
 */
async function callAI(service, messages, options = {}) {
    const backend = API_CONFIG.backend;
    
    const response = await fetch(`${backend.baseURL}/api/ai/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${backend.apiSecret}`
        },
        body: JSON.stringify({ service, messages, options })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`API错误 (${response.status}): ${error.error || error.message}`);
    }

    const data = await response.json();
    return data.content || '';
}

/**
 * 图像生成API（后端代理）
 * @param {string} prompt - 图像描述
 * @param {number} n - 生成数量
 * @param {string} size - 尺寸
 * @param {string} quality - low/medium/high
 */
async function callImageAPI(prompt, n = 1, size = '1024x1024', quality = 'medium') {
    const backend = API_CONFIG.backend;
    
    const response = await fetch(`${backend.baseURL}/api/ai/image`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${backend.apiSecret}`
        },
        body: JSON.stringify({ prompt, n, size, quality })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`图像生成失败 (${response.status}): ${error.error || error.message}`);
    }

    const data = await response.json();
    return data.images || [];
}

/**
 * 检查后端健康状态
 */
async function checkBackendHealth() {
    try {
        const response = await fetch(`${API_CONFIG.backend.baseURL}/api/health`);
        return await response.json();
    } catch (e) {
        return { status: 'error', reason: e.message };
    }
}

/**
 * 检查API可用性（通过后端）
 */
async function checkAPI(service) {
    try {
        const health = await checkBackendHealth();
        if (health.status !== 'ok') return { ok: false, reason: '后端未启动' };
        
        const serviceConfig = health.services?.[service];
        return { 
            ok: serviceConfig?.configured || false, 
            status: serviceConfig?.configured ? '已配置' : '未配置' 
        };
    } catch (e) {
        return { ok: false, reason: e.message };
    }
}

/**
 * 获取用量统计
 */
async function getUsageStats() {
    const backend = API_CONFIG.backend;
    try {
        const response = await fetch(`${backend.baseURL}/api/usage`, {
            headers: { 'Authorization': `Bearer ${backend.apiSecret}` }
        });
        return await response.json();
    } catch (e) {
        return { error: e.message };
    }
}
