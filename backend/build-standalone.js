const fs = require('fs');
const path = require('path');

const BASE_DIR = path.join(__dirname, '..');

function readFile(relPath) {
    const fullPath = path.join(BASE_DIR, relPath);
    return fs.readFileSync(fullPath, 'utf8');
}

// 读取 index.html
let html = readFile('index.html');

// 替换 CSS 链接为内联样式
const cssLinks = [
    { href: 'css/styles.css', id: 'styles' },
    { href: 'css/game-enhance.css', id: 'game-enhance' }
];

for (const { href, id } of cssLinks) {
    const cssContent = readFile(href);
    const linkTag = `<link rel="stylesheet" href="${href}">`;
    const styleTag = `<style id="${id}">\n/* ${href} */\n${cssContent}\n</style>`;
    html = html.replace(linkTag, styleTag);
}

// 替换 JS 脚本为内联脚本
const jsScripts = [
    'js/api-config.js',
    'js/ai-guide.js',
    'js/workflow.js',
    'js/image-studio.js',
    'js/ppt-gen.js',
    'js/board-gen.js',
    'js/app.js'
];

for (const src of jsScripts) {
    const jsContent = readFile(src);
    const scriptTag = `<script src="${src}"></script>`;
    const inlineTag = `<script>\n/* ${src} */\n${jsContent}\n</script>`;
    html = html.replace(scriptTag, inlineTag);
}

// 修改 api-config.js 中的后端地址，使其更灵活
// 对于 standalone.html，使用相对路径或当前页面地址
html = html.replace(
    "baseURL: 'http://localhost:3000'",
    "baseURL: (window.location.protocol === 'file:' ? 'http://localhost:3001' : (window.location.origin || ''))"
);

// 添加一个启动提示，说明这是独立文件版本
const standaloneNotice = `
<script>
console.log('🌴 伍师浅谈设计助手 - 独立文件版');
console.log('📌 提示：AI功能需要后端服务器支持（node server.js）');
console.log('📌 如未启动服务器，AI生成等功能将不可用，但基础界面可正常浏览');
</script>`;

html = html.replace('</body>', standaloneNotice + '\n</body>');

// 写入文件
const outputPath = path.join(BASE_DIR, '伍师浅谈设计助手.html');
fs.writeFileSync(outputPath, html, 'utf8');

console.log('✅ 独立文件已生成：' + outputPath);
console.log('📄 文件大小：' + (fs.statSync(outputPath).size / 1024).toFixed(1) + ' KB');
console.log('📌 可直接双击打开，无需服务器');
