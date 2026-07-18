# API 接入指南：GPT Image2 与 Kimi

> 基于实际搜索到的最新 API 文档（2025-2026）

---

## 一、GPT Image2（OpenAI）— 图像生成

### 1.1 你需要的准备

| 项目 | 说明 |
|------|------|
| **API Key** | 在 [OpenAI Platform](https://platform.openai.com/api-keys) 创建 |
| **模型名称** | `gpt-image-2`（最新）或 `gpt-image-1` |
| **计费方式** | 按 Token 计费，约 $0.02-0.07/张（1024×1024） |
| **速率限制** | 根据账户 Tier，Tier1 约 5张/分钟 |

### 1.2 API 调用方式

#### 基础文生图

```bash
# HTTP 请求
curl https://api.openai.com/v1/images/generations \
  -H "Authorization: Bearer 你的_OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-image-2",
    "prompt": "A modern landscape architecture master plan, aerial view, green parks, winding pathways, water features, photorealistic rendering, golden hour lighting",
    "n": 4,
    "size": "1024x1024",
    "quality": "medium",
    "output_format": "png"
  }'
```

#### JavaScript/Fetch 调用

```javascript
async function generateImage(prompt, n = 4) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer 你的_OPENAI_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-image-2',
      prompt: prompt,
      n: n,
      size: '1024x1024',
      quality: 'medium',
      output_format: 'png'
    })
  });

  const data = await response.json();
  
  // 返回的是 base64 编码的图片数据
  const images = data.data.map(item => item.b64_json);
  return images; // base64 字符串数组
}

// 使用示例
const images = await generateImage('现代城市公园鸟瞰图，生态设计，景观建筑', 4);
// images[0] 就是第一张图的 base64，可直接放入 <img src="data:image/png;base64,...">
```

### 1.3 关键参数说明

| 参数 | 类型 | 可选值 | 说明 |
|------|------|--------|------|
| `model` | string | `gpt-image-2`, `gpt-image-1` | 模型版本 |
| `prompt` | string | - | 图像描述提示词 |
| `n` | integer | 1-10 | 生成数量 |
| `size` | string | `1024x1024`, `1024x1536`, `1536x1024`, `auto` | 图像尺寸 |
| `quality` | string | `low`, `medium`, `high` | 质量等级（影响价格） |
| `output_format` | string | `png`, `jpeg`, `webp` | 输出格式 |
| `background` | string | `transparent`, `opaque` | 是否透明背景（png支持） |

### 1.4 重要注意事项

1. **默认返回 base64**，不是 URL。要取 `result.data[0].b64_json`，不是 `.url`
2. **中文文字渲染**：GPT Image2 对中文支持比 DALL·E 3 好，但建议把需要渲染的文字用引号括起来并单独强调
3. **测试阶段用 `quality: low`**，成本低很多
4. **并发限制严格**，建议每次请求间隔 2 秒，并发不超过 3 个

### 1.5 图像编辑（基于参考图）

```javascript
// 传入参考图进行编辑
const response = await fetch('https://api.openai.com/v1/images/edits', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer 你的_KEY',
  },
  body: JSON.stringify({
    model: 'gpt-image-2',
    image: 'base64编码的参考图',
    prompt: '保持构图，将背景改为白色，添加柔和阴影',
    size: '1024x1024'
  })
});
```

---

## 二、Kimi API — 文本生成与PPT

### 2.1 重要发现：Kimi 没有开放的 PPT 生成 API

根据搜索结果，**Kimi 的 PPT 生成功能目前只在网页版提供**，API 开放平台暂未开放直接的 PPT 生成端点。

但是，**Kimi 的聊天 API 完全可以实现 PPT 内容生成**，然后前端自己渲染导出。

### 2.2 你需要的准备

| 项目 | 说明 |
|------|------|
| **API Key** | 在 [Kimi 开放平台](https://platform.kimi.com/) 创建 |
| **Base URL** | `https://api.moonshot.cn/v1` |
| **模型** | `kimi-k2.6`（通用）或 `kimi-k2.7-code-highspeed`（代码） |
| **计费** | 按 Token 计费，输入+输出分别计价 |

### 2.3 API 调用方式（兼容 OpenAI 格式）

```bash
# HTTP 请求
curl https://api.moonshot.cn/v1/chat/completions \
  -H "Authorization: Bearer 你的_KIMI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "kimi-k2.6",
    "messages": [
      {"role": "system", "content": "你是一位PPT设计专家"},
      {"role": "user", "content": "请为城市公园景观设计方案生成PPT大纲"}
    ],
    "temperature": 0.7,
    "max_tokens": 4096
  }'
```

```javascript
async function callKimi(messages, options = {}) {
  const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer 你的_KIMI_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model || 'kimi-k2.6',
      messages: messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 4096,
      stream: options.stream ?? false
    })
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// 使用示例：生成PPT大纲
const outline = await callKimi([
  { role: 'system', content: '你是一位景观设计PPT专家，擅长生成结构清晰、重点突出的汇报大纲。' },
  { role: 'user', content: '请为"城市公园改造项目"生成一份15页的竞赛汇报PPT大纲，用Markdown格式。' }
]);
console.log(outline);
```

### 2.4 关于 Kimi PPT 的替代方案

由于 Kimi 没有直接输出 .pptx 文件的 API，推荐两种方案：

#### 方案A：前端自渲染 + 导出（推荐）

1. 用 Kimi API 生成每页 PPT 的**标题+内容+要点**（纯文本）
2. 前端用 HTML/CSS 渲染成幻灯片预览
3. 用 `html2canvas` + `jsPDF` 导出为 PDF
4. 或用 `pptxgenjs` 库直接生成 .pptx 文件

```javascript
// 前端生成 PPTX 示例（需要引入 pptxgenjs）
import PptxGenJS from 'pptxgenjs';

function exportPPTX(slides) {
  const pptx = new PptxGenJS();
  
  slides.forEach(slide => {
    const s = pptx.addSlide();
    s.addText(slide.title, { x: 0.5, y: 0.5, fontSize: 24, bold: true });
    slide.bullets.forEach((b, i) => {
      s.addText(b, { x: 0.5, y: 1.5 + i * 0.5, fontSize: 14 });
    });
  });
  
  pptx.writeFile({ fileName: '景观设计方案.pptx' });
}
```

#### 方案B：Kimi 网页版手动生成

1. 在 Kimi 网页版（kimi.moonshot.cn）的 PPT 助手中
2. 把 DeepSeek 生成的大纲贴进去
3. 点击"一键生成PPT"
4. 下载后再上传回本系统

本系统已预留"上传参考PPT"功能，支持此工作流。

---

## 三、接入你的系统的步骤

### 第一步：获取 API Key

| 服务 | 注册地址 | 费用 |
|------|---------|------|
| GPT Image2 | [platform.openai.com](https://platform.openai.com) | 需绑定信用卡，按量计费 |
| Kimi | [platform.kimi.com](https://platform.kimi.com) | 有免费额度，超出按量计费 |

### 第二步：填入配置文件

打开 `js/api-config.js`，填入你的 Key：

```javascript
const API_CONFIG = {
    deepseek: {
        baseURL: 'https://api.deepseek.com',
        apiKey: 'sk-31506ba166e8408bbea4b31a2d2bd03d',  // ✅ 已填入
        model: 'deepseek-chat'
    },
    openai: {
        baseURL: 'https://api.openai.com/v1',
        apiKey: '你的_OPENAI_API_KEY',  // ← 填入这里
        model: 'gpt-image-2'
    },
    kimi: {
        baseURL: 'https://api.moonshot.cn/v1',
        apiKey: '你的_KIMI_API_KEY',  // ← 填入这里
        model: 'kimi-k2.6'
    }
};
```

### 第三步：替换模拟调用为真实 API

我已经在代码中预留了 `callAI()` 函数，只需把图像生成和 PPT 内容生成的模拟逻辑替换为真实调用即可。

具体位置：
- 图像生成：`js/image-studio.js` → `generateBatch()`
- PPT内容：`js/ppt-gen.js` → `generateOutline()`

---

## 四、快速测试

拿到 Key 后，你可以先用下面的命令测试 API 是否通：

```bash
# 测试 GPT Image2
curl https://api.openai.com/v1/images/generations \
  -H "Authorization: Bearer 你的_OPENAI_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-image-2","prompt":"test","n":1}'

# 测试 Kimi
curl https://api.moonshot.cn/v1/chat/completions \
  -H "Authorization: Bearer 你的_KIMI_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"kimi-k2.6","messages":[{"role":"user","content":"hello"}]}'
```

如果返回了结果（不是 401/403），说明 Key 有效，可以接入系统。

---

## 五、费用参考

| 服务 | 场景 | 预估单次成本 |
|------|------|-------------|
| DeepSeek | 方案概览生成（~3000 tokens） | ¥0.01-0.03 |
| DeepSeek | PPT大纲生成（~2000 tokens） | ¥0.01-0.02 |
| GPT Image2 | 单张图 1024×1024, medium | $0.02-0.04 |
| GPT Image2 | 单张图 1024×1024, high | $0.05-0.07 |
| Kimi | PPT内容生成（~4000 tokens） | ¥0.02-0.05 |

一个完整项目（概览+4张图+PPT）预估成本：¥0.5-2 元

---

*文档版本：v1.0 | 基于 2025-2026 最新 API 文档*
