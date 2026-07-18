/**
 * API中转平台信息搜集助手
 * 自动从 GitHub 搜索相关开源项目，输出候选清单
 * 用法：node search-providers.js
 */

const https = require('https');

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch(e) { resolve(null); }
            });
        }).on('error', reject).setTimeout(15000, () => reject(new Error('timeout')));
    });
}

async function searchGitHub() {
    // 搜索关键词：one-api, new-api, openai-proxy 等开源项目
    const keywords = [
        'one-api',
        'new-api',
        'openai-proxy',
        'chatgpt-api-proxy',
        'dalle-api-proxy'
    ];
    
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  GitHub 开源中转项目搜索                                  ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║  搜索关键词：                                            ║');
    keywords.forEach(k => console.log(`║    • ${k.padEnd(48)}║`));
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║  手动搜索方法：                                          ║');
    console.log('║  1. 访问 https://github.com/search                       ║');
    console.log('║  2. 输入关键词：one-api 或 openai-proxy                   ║');
    console.log('║  3. 按 "Most stars" 排序                                ║');
    console.log('║  4. 看 README 里的部署文档和 pricing                      ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    
    // 尝试搜索 GitHub API（有速率限制，失败则跳过）
    for (const keyword of keywords) {
        try {
            const data = await fetchJSON(
                `https://api.github.com/search/repositories?q=${keyword}&sort=stars&order=desc&per_page=3`
            );
            if (data && data.items) {
                console.log(`\n📌 关键词 "${keyword}" 的Top项目：`);
                data.items.forEach((item, i) => {
                    console.log(`   ${i+1}. ${item.full_name} ⭐${item.stargazers_count}`);
                    console.log(`      ${item.html_url}`);
                    console.log(`      ${item.description?.substring(0, 60) || '无描述'}...\n`);
                });
            }
        } catch (e) {
            // GitHub API 速率限制，忽略错误
        }
    }
}

function printChecklist() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  选择中转平台 checklist                                   ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║  ✅ 有 GitHub 仓库（开源或文档公开）                       ║');
    console.log('║  ✅ 支持 DALL-E / images/generations 接口                  ║');
    console.log('║  ✅ 支持微信支付 / 支付宝                                 ║');
    console.log('║  ✅ 最低充值 ≤ 50 元                                     ║');
    console.log('║  ✅ 有用户群或 issue 反馈渠道                             ║');
    console.log('║  ❌ 强制大额充值（≥500元）                                ║');
    console.log('║  ❌ 没有公开联系方式或文档                                 ║');
    console.log('║  ❌ 价格明显低于官方（可能封号）                           ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
}

function printNextSteps() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  下一步操作                                              ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║  1. 在 GitHub 搜 "one-api" 或 "openai-proxy"              ║');
    console.log('║  2. 找 2-3 个候选平台，各充 10-20 元                      ║');
    console.log('║  3. 拿到他们的 BaseURL 和 API Key                        ║');
    console.log('║  4. 编辑 backend/test-providers.js 填入 CANDIDATES      ║');
    console.log('║  5. 运行: node test-providers.js                         ║');
    console.log('║  6. 看测试报告，选最快最稳定的                            ║');
    console.log('║  7. 把推荐配置复制到 backend/.env                        ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
}

async function main() {
    await searchGitHub();
    printChecklist();
    printNextSteps();
}

main().catch(() => {
    printChecklist();
    printNextSteps();
});
