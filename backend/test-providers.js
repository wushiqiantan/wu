/**
 * API中转平台自动测试脚本
 * 用法：node test-providers.js
 * 
 * 测试内容：
 * 1. 平台连通性（能否连上）
 * 2. 图像生成能力（能否成功出图）
 * 3. 生成速度和成本估算
 * 4. 输出对比报告
 */

const https = require('https');
const http = require('http');

// ============ 候选平台配置（填入你找到的） ============
// 格式：每个平台填 { name, baseURL, apiKey, model }
const CANDIDATES = [
    // 示例1：官方OpenAI（如果你有境外信用卡）
    // {
    //     name: 'OpenAI官方',
    //     baseURL: 'https://api.openai.com/v1',
    //     apiKey: 'sk-xxx',
    //     model: 'dall-e-3'
    // },
    
    // 示例2：中转平台A（把xxx换成你拿到的真实信息）
    // {
    //     name: '中转A',
    //     baseURL: 'https://xxx.com/v1',
    //     apiKey: 'sk-xxx',
    //     model: 'dall-e-3'
    // },
    
    // 示例3：中转平台B
    // {
    //     name: '中转B',
    //     baseURL: 'https://yyy.com/v1',
    //     apiKey: 'sk-xxx',
    //     model: 'dall-e-3'
    // },
];

// 景观设计专用测试提示词
const TEST_PROMPT = 'A professional landscape architecture rendering of a modern Chinese courtyard garden with bamboo grove, water feature, stone pathway, and traditional pavilion. Aerial view, golden hour lighting, photorealistic, 4k quality, architectural visualization style.';

// ============ 工具函数 ============
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
            timeout: 90000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode,
                    data,
                    json: () => { try { return JSON.parse(data); } catch(e) { return null; } }
                });
            });
        });
        
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        if (options.body) req.write(options.body);
        req.end();
    });
}

async function testProvider(candidate) {
    const result = {
        name: candidate.name,
        connected: false,
        imageGenerated: false,
        latency: 0,
        costEstimate: null,
        error: null,
        imageSize: 0
    };
    
    const startTime = Date.now();
    
    try {
        // 测试1：调用 /images/generations
        const response = await fetchProxy(`${candidate.baseURL}/images/generations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${candidate.apiKey}`
            },
            body: JSON.stringify({
                model: candidate.model,
                prompt: TEST_PROMPT,
                n: 1,
                size: '1024x1024',
                quality: 'standard',
                response_format: 'b64_json'
            })
        });
        
        result.latency = Date.now() - startTime;
        
        if (response.ok) {
            const data = response.json();
            result.connected = true;
            
            if (data && data.data && data.data.length > 0 && data.data[0].b64_json) {
                result.imageGenerated = true;
                result.imageSize = Math.round(data.data[0].b64_json.length * 3 / 4 / 1024); // KB
                
                // 估算成本（DALL-E 3 标准质量 1024x1024 官方约 $0.04/张）
                result.costEstimate = '~$0.04/张 (官方参考价)';
            } else {
                result.error = '返回成功但无图像数据';
            }
        } else {
            result.error = `HTTP ${response.status}: ${response.data.substring(0, 200)}`;
        }
    } catch (err) {
        result.latency = Date.now() - startTime;
        result.error = err.message;
    }
    
    return result;
}

// ============ 主程序 ============
async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  AI图像API中转平台 - 自动测试工具                        ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║  测试提示词：现代中式庭院景观效果图                        ║');
    console.log('║  图片尺寸：1024x1024 标准质量                              ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    
    if (CANDIDATES.length === 0) {
        console.log('⚠️  请在脚本中填入至少一个候选平台配置');
        console.log('   编辑 backend/test-providers.js，修改 CANDIDATES 数组\n');
        return;
    }
    
    const results = [];
    for (const candidate of CANDIDATES) {
        console.log(`🔄 测试中: ${candidate.name} ...`);
        const result = await testProvider(candidate);
        results.push(result);
        
        const status = result.imageGenerated ? '✅ 成功' : '❌ 失败';
        console.log(`   ${status} | 耗时: ${result.latency}ms | ${result.error || '图像已生成'}\n`);
    }
    
    // 输出报告
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  测试报告                                                 ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    
    const success = results.filter(r => r.imageGenerated);
    const failed = results.filter(r => !r.imageGenerated);
    
    console.log(`║  总计: ${results.length} 个平台 | 成功: ${success.length} | 失败: ${failed.length}${' '.repeat(28 - results.length.toString().length - success.length.toString().length - failed.length.toString().length)}║`);
    console.log('╠══════════════════════════════════════════════════════════╣');
    
    results.forEach(r => {
        const icon = r.imageGenerated ? '✅' : '❌';
        const latency = r.latency > 0 ? `${r.latency}ms` : 'N/A';
        const size = r.imageSize > 0 ? `${r.imageSize}KB` : 'N/A';
        console.log(`║  ${icon} ${r.name.padEnd(20)} | ${latency.padEnd(8)} | ${size.padEnd(8)} | ${r.error ? '失败' : 'OK'}${' '.repeat(10)}║`);
    });
    
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    
    // 推荐
    if (success.length > 0) {
        const best = success.reduce((a, b) => a.latency < b.latency ? a : b);
        console.log(`⭐ 推荐选择: ${best.name} (速度最快: ${best.latency}ms)`);
        console.log('   请复制以下配置到 backend/.env 文件:\n');
        const candidate = CANDIDATES.find(c => c.name === best.name);
        console.log(`   OPENAI_BASE_URL=${candidate.baseURL}`);
        console.log(`   OPENAI_API_KEY=${candidate.apiKey}`);
        console.log(`   OPENAI_IMAGE_MODEL=${candidate.model}\n`);
    } else {
        console.log('❌ 所有平台测试失败，请检查配置或换其他平台\n');
    }
}

main().catch(err => {
    console.error('测试异常:', err.message);
    process.exit(1);
});
