# AI设计工作流平台 — 使用说明

> 一个可直接在浏览器中运行的景观设计AI助手平台
> 支持AI反向提问引导、工作流节点画布、图像生成、PPT生成、A1展板生成

---

## 📁 文件结构

```
AI景观设计工作流/
├── index.html          # 主入口（双击即可打开）
├── css/
│   └── styles.css      # 全局样式
├── js/
│   ├── app.js          # 主应用逻辑、路由、数据管理
│   ├── ai-guide.js     # AI反向提问引擎（核心）
│   ├── workflow.js     # 工作流节点画布
│   ├── image-studio.js # 图像生成工作室
│   ├── ppt-gen.js      # PPT生成器
│   └── board-gen.js    # A1展板生成器
└── system-architecture.md  # 系统架构文档
```

---

## 🚀 快速开始

### 方式一：直接打开（推荐）
1. 双击 `index.html` 文件
2. 浏览器会自动打开平台首页
3. 所有数据自动保存在浏览器本地（localStorage）

### 方式二：本地服务器（开发调试）
```bash
# 使用 Python 启动本地服务器
cd AI景观设计工作流
python -m http.server 8080

# 然后在浏览器打开 http://localhost:8080
```

---

## 🎯 核心功能使用指南

### 1. AI反向提问引导（创建项目）

**路径**：工作台 → 开始新项目 / 左侧导航"AI需求引导"

**操作流程**：
1. 选择项目类型（城市公园/社区景观/校园改造等8种）
2. AI会自动提出一系列专业问题（场地情况、用户画像、设计挑战等）
3. 你可以详细回答，或点击快捷选项
4. 完成8步问答后，AI生成完整方案概览
5. 项目自动保存，可直接进入工作流

**核心设计**：AI主动提问而非用户自由输入，确保需求收集全面、结构化

---

### 2. 工作流节点画布

**路径**：工作台 → 工作流画布

**功能**：
- 从左侧拖拽节点到画布（DeepSeek分析、GPT Image2、自检确认、Kimi PPT等）
- 点击节点打开右侧属性面板，配置参数
- 任意节点参数修改后，下游节点自动标记"待刷新"
- 点击"运行工作流"批量执行

**节点类型**：
| 节点 | 功能 |
|------|------|
| 需求输入 | 导入AI引导阶段的需求数据 |
| DeepSeek分析 | 生成设计策略文本、讲稿、提示词大纲 |
| 提示词生成 | 为图像生成准备专业提示词 |
| GPT Image2 | 生成方案效果图（支持批量） |
| 自检确认 | 用户/教师/专家三级确认 |
| Kimi PPT | 生成汇报PPT |
| 出图画板 | 选择最终方案图 |
| A1展板 | 生成竞赛展板 |

---

### 3. 图像工作室

**路径**：工作台 → 图像工作室

**操作流程**：
1. 选择图像类型（鸟瞰图/人视效果图/剖面图/节点详图等）
2. 选择风格参考（现代简约/自然生态/中式园林等）
3. 编辑正/负提示词（支持模板加载）
4. 完成自检清单
5. 可选：勾选"需要专家审核"
6. 点击"确认并生成"
7. 从多方案中选择最佳，添加到"出图画板"
8. 支持迭代优化和上传参考图

---

### 4. PPT与展板工作室

**路径**：工作台 → PPT与展板

**PPT生成**：
1. 选择汇报类型（竞赛/学术/客户/答辩）
2. 设置页数
3. 点击"DeepSeek生成大纲"
4. AI自动生成完整大纲和幻灯片
5. 选择风格模板（学术/极简/竞赛/商务）
6. 可上传参考PPT
7. 逐页预览，支持AI迭代优化和手动编辑
8. 导出PPT文件

**A1展板生成**：
1. 选择内容来源（基于PPT/自定义/混合）
2. 选择排版风格（标准竞赛/横向分区/网格/自由）
3. 点击"生成A1展板"
4. 预览并迭代优化
5. 导出高清展板（594×841mm，300dpi）

---

### 5. 项目库

- 所有创建的项目自动保存
- 支持按类型筛选（城市公园/社区景观/校园改造等）
- 查看项目进度
- 删除项目

---

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl/Cmd + 1 | 工作台 |
| Ctrl/Cmd + 2 | AI需求引导 |
| Ctrl/Cmd + 3 | 工作流画布 |
| Ctrl/Cmd + 4 | 图像工作室 |
| Ctrl/Cmd + 5 | PPT与展板 |

---

## 🔌 接入真实AI API（部署配置）

当前版本为**前端演示版**，AI调用为模拟实现。要接入真实API：

### 1. DeepSeek（文本分析）
编辑 `js/ai-guide.js` 中的 `generateSummary()` 和 `ppt-gen.js` 中的 `generateOutline()`：
```javascript
// 替换为真实API调用
const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer YOUR_API_KEY' },
    body: JSON.stringify({ model: 'deepseek-chat', messages: [...] })
});
```

### 2. GPT Image2（图像生成）
编辑 `js/image-studio.js` 中的 `generateBatch()`：
```javascript
const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer YOUR_OPENAI_KEY' },
    body: JSON.stringify({ model: 'gpt-image-2', prompt: prompt, n: 4 })
});
```

### 3. Kimi PPT（PPT生成）
编辑 `js/ppt-gen.js` 中的 `generateOutline()`：
```javascript
const response = await fetch('https://api.moonshot.cn/v1/ppt/generate', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer YOUR_KIMI_KEY' },
    body: JSON.stringify({ outline: outline, style: style })
});
```

### 4. Hoop 自动化
编辑 `js/workflow.js` 中的审核节点，接入Hoop Webhook实现自动审批流。

---

## 💡 使用技巧

1. **AI引导阶段尽量详细回答** — 信息越充分，后续生成的内容越精准
2. **善用风格参考** — 上传参考图能让AI更准确地理解你的审美偏好
3. **工作流节点可随时调整** — 上游修改后下游自动标记待刷新，支持迭代
4. **自检清单不可忽视** — 减少返工，提高输出质量
5. **利用延迟确认机制** — 最终PPT和展板确认前都可调整，不急于锁定

---

## 📝 技术说明

- **前端框架**：纯 HTML5 + Tailwind CSS (CDN) + Vanilla JavaScript
- **数据存储**：浏览器 localStorage（项目数据本地保存）
- **部署方式**：任何静态文件服务器均可（Vercel / Netlify / Nginx / GitHub Pages）
- **浏览器支持**：Chrome / Edge / Firefox / Safari 最新版

---

*版本：v1.0 | 直接可用，无需构建工具*
