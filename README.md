# 伍师浅谈设计助手

AI景观设计工作流平台 — 像玩通关游戏一样完成景观设计。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/wushiqiantan/wu&project-name=wushiqiantan&repository-name=wushiqiantan)

## 一键部署

点击上方按钮，Vercel 会自动导入本仓库并部署。部署完成后，请配置以下环境变量：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API Key | `sk-...` |
| `DEEPSEEK_BASE_URL` | DeepSeek 接口地址 | `https://api.deepseek.com` |
| `KIMI_API_KEY` | Kimi API Key | `sk-...` |
| `KIMI_BASE_URL` | Kimi 接口地址 | `https://api.moonshot.cn/v1` |
| `API_SECRET` | 后端鉴权密码 | 自定义，如 `wushi123456` |
| `OPENAI_API_KEY` | OpenAI/中转平台 Key（可选） | `sk-...` |
| `OPENAI_BASE_URL` | 中转平台地址（可选） | `https://xxx.com/v1` |

配置后 Vercel 会自动重新部署，访问 `https://wushiqiantan.vercel.app` 即可使用。

## 本地开发

```bash
cd backend
cp .env.example .env
# 编辑 .env 填入你的 API Key
node server.js
```

浏览器打开 `http://localhost:3000`

## 技术栈

- 前端：纯 HTML/CSS/JS，油画色彩系统
- 后端：Node.js Serverless Functions（Vercel）
- AI：DeepSeek（文本分析）+ Kimi（PPT生成）+ OpenAI DALL-E（图像生成）
