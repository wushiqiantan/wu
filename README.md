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

## 订阅收款配置（微信支付 + 持久化存储）

这是让"其他人可以直接付费订阅使用"必须配置的部分，缺一不可。没配置之前，AI功能仍可用（走"每设备每日3次免费"额度），但订阅相关接口会返回 501 提示未配置。

| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST 地址 | [upstash.com](https://upstash.com) 免费注册 → 新建 Redis 数据库 → Details 页面复制 |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST Token | 同上页面 |
| `WECHAT_APPID` | 公众号/应用 AppID | 微信支付商户平台 → 产品中心 → AppID账号管理 |
| `WECHAT_MCHID` | 微信支付商户号 | 商户平台首页 |
| `WECHAT_SERIAL_NO` | 商户API证书序列号 | 商户平台 → 账户中心 → API安全 → 申请API证书后可见 |
| `WECHAT_PRIVATE_KEY_BASE64` | 商户私钥（base64编码） | 见下方"私钥转换"步骤 |
| `WECHAT_API_V3_KEY` | APIv3密钥 | 商户平台 → 账户中心 → API安全 → 设置32位密钥 |
| `WECHAT_NOTIFY_URL` | 支付回调地址 | `https://你的域名/api/subscribe/notify` |
| `FREE_TRIAL_LIMIT` | 每设备每日免费次数（可选） | 默认 `3` |

### 私钥转换（本地终端执行，不要把私钥文件上传到任何第三方）

商户平台下载 API 证书后会得到 `apiclient_key.pem` 文件，Vercel 环境变量不支持直接粘贴多行 PEM，需要转成单行 base64：

```bash
# macOS / Linux
base64 -i apiclient_key.pem | tr -d '\n'

# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("apiclient_key.pem"))
```

把输出的一长串字符整体粘贴为 `WECHAT_PRIVATE_KEY_BASE64` 的值。

### 上线前必须做的最后一步：真实小额付款验证

微信支付已取消官方沙箱环境，所有 API v3 商户都只能用真实资金测试。建议：

1. 把 `PLANS.monthly.amount`（`api/index.js` 中，单位：分）临时改成 `1`（即 ¥0.01），部署后自己扫码付一次
2. 确认能收到验证性回调、`/api/subscribe/order-status` 轮询能正确变为 `paid`、能拿到订阅码
3. 改回正式价格（当前默认 ¥39/月），重新部署

### 关于回调验签的一点说明

2024年11月1日后新注册的微信支付商户，回调通知默认使用"微信支付公钥模式"验签。本项目的回调处理 (`/api/subscribe/notify`) **不直接信任回调内容来发放订阅**，而是收到回调后立刻反向调用微信"查单"接口用你自己的商户私钥重新签名确认，真实状态永远以这次主动查询为准——这样无论你的商户号是哪种验签模式，都不影响发货判断的安全性；前端轮询 (`order-status`) 同样走这条"主动查单"逻辑，即便回调因证书模式差异没能正确送达，用户扫码支付后几秒内前端轮询也能自行确认到账，不会出现"钱付了但页面没反应"的情况。

## 本地开发

```bash
cd backend
cp .env.example .env
# 编辑 .env 填入你的 API Key
node server.js
```

浏览器打开 `http://localhost:3000`

> **注意**：`backend/server.js` 是独立于 Vercel 部署之外的本地测试用服务器，本次新增的订阅/微信支付功能只加在了 `api/index.js`（Vercel 线上环境实际运行的文件）中，`backend/server.js` 暂未同步这部分逻辑。本地想联调订阅功能，建议改用 `vercel dev`（会真实运行 `api/index.js`）。

## 技术栈

- 前端：纯 HTML/CSS/JS，油画色彩系统
- 后端：Node.js Serverless Functions（Vercel）
- AI：DeepSeek（文本分析）+ Kimi（PPT生成）+ OpenAI DALL-E（图像生成）
