/**
 * 微信支付 APIv3 封装（Native扫码支付）
 * 基于 wechatpay-node-v3 库（package.json 中已加入依赖）。
 *
 * 需要在 Vercel 项目环境变量中配置：
 *   WECHAT_APPID              - 公众号/移动应用 appid
 *   WECHAT_MCHID               - 商户号
 *   WECHAT_SERIAL_NO            - 商户API证书序列号（openssl x509 -in apiclient_cert.pem -noout -serial 获取）
 *   WECHAT_PRIVATE_KEY_BASE64   - 商户私钥 apiclient_key.pem 文件内容，整体做 base64 编码后填入
 *                                （因为 Vercel 环境变量不支持直接粘贴多行 PEM 文件，需要转成单行 base64）
 *   WECHAT_API_V3_KEY           - APIv3密钥（商户平台 -> 账户中心 -> API安全 中设置的32位字符串）
 *   WECHAT_NOTIFY_URL            - 支付结果回调地址，例如 https://your-domain.vercel.app/api/subscribe/notify
 *
 * 本地生成 base64 私钥的方法（在你的电脑终端执行，不要把私钥文件本身传到任何第三方）：
 *   base64 -i apiclient_key.pem | tr -d '\n'   (macOS/Linux)
 *   certutil -encode apiclient_key.pem tmp.b64 (Windows，再手动去掉首尾行)
 */

const crypto = require('crypto');
const https = require('https');

function getPrivateKey() {
    const b64 = process.env.WECHAT_PRIVATE_KEY_BASE64;
    if (!b64) throw new Error('WXPAY_NOT_CONFIGURED: 缺少 WECHAT_PRIVATE_KEY_BASE64');
    return Buffer.from(b64, 'base64').toString('utf8');
}

function getConfig() {
    const { WECHAT_APPID, WECHAT_MCHID, WECHAT_SERIAL_NO, WECHAT_API_V3_KEY, WECHAT_NOTIFY_URL } = process.env;
    if (!WECHAT_APPID || !WECHAT_MCHID || !WECHAT_SERIAL_NO || !WECHAT_API_V3_KEY || !WECHAT_NOTIFY_URL) {
        throw new Error('WXPAY_NOT_CONFIGURED: 缺少微信支付必要环境变量（APPID/MCHID/SERIAL_NO/API_V3_KEY/NOTIFY_URL）');
    }
    return { appid: WECHAT_APPID, mchid: WECHAT_MCHID, serial_no: WECHAT_SERIAL_NO, apiV3Key: WECHAT_API_V3_KEY, notifyUrl: WECHAT_NOTIFY_URL };
}

// 构造 Authorization 头（WECHATPAY2-SHA256-RSA2048 签名）
function buildAuthorization(method, urlPath, body, cfg, privateKey) {
    const nonceStr = crypto.randomBytes(16).toString('hex');
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const bodyStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : '';
    const signStr = `${method}\n${urlPath}\n${timestamp}\n${nonceStr}\n${bodyStr}\n`;
    const sign = crypto.createSign('RSA-SHA256').update(signStr).sign(privateKey, 'base64');
    return `WECHATPAY2-SHA256-RSA2048 mchid="${cfg.mchid}",nonce_str="${nonceStr}",signature="${sign}",timestamp="${timestamp}",serial_no="${cfg.serial_no}"`;
}

function httpsRequestJSON(method, hostname, path, headers, body) {
    return new Promise((resolve, reject) => {
        const bodyStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined;
        const req = https.request({
            hostname, port: 443, path, method,
            headers: Object.assign({}, headers, bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
            timeout: 20000
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                let json = null;
                try { json = data ? JSON.parse(data) : {}; } catch (e) { json = { raw: data }; }
                resolve({ statusCode: res.statusCode, headers: res.headers, json });
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('WXPAY_TIMEOUT')); });
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

/**
 * 创建 Native 扫码支付订单
 * @param {string} outTradeNo 商户订单号（需保证唯一）
 * @param {string} description 商品描述
 * @param {number} totalFen 金额，单位：分
 * @returns {Promise<{code_url: string}>}
 */
async function createNativeOrder(outTradeNo, description, totalFen) {
    const cfg = getConfig();
    const privateKey = getPrivateKey();
    const path = '/v3/pay/transactions/native';
    const body = {
        appid: cfg.appid,
        mchid: cfg.mchid,
        description,
        out_trade_no: outTradeNo,
        notify_url: cfg.notifyUrl,
        amount: { total: totalFen, currency: 'CNY' }
    };
    const authorization = buildAuthorization('POST', path, body, cfg, privateKey);
    const res = await httpsRequestJSON('POST', 'api.mch.weixin.qq.com', path, {
        'Authorization': authorization,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'wushi-design-assistant/1.0'
    }, body);
    if (res.statusCode !== 200) {
        throw new Error(`WXPAY_CREATE_ORDER_FAILED: ${res.statusCode} ${JSON.stringify(res.json)}`);
    }
    return res.json; // { code_url: 'weixin://wxpay/bizpayurl?pr=xxxx' }
}

/**
 * 按商户订单号查询订单状态（服务端主动查询，不依赖回调，避免"公钥模式/平台证书模式"验签差异带来的不确定性）
 * @param {string} outTradeNo
 * @returns {Promise<object>} 微信支付订单详情，其中 trade_state 为 SUCCESS/NOTPAY/CLOSED 等
 */
async function queryOrderByOutTradeNo(outTradeNo) {
    const cfg = getConfig();
    const privateKey = getPrivateKey();
    const path = `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${cfg.mchid}`;
    const authorization = buildAuthorization('GET', path, '', cfg, privateKey);
    const res = await httpsRequestJSON('GET', 'api.mch.weixin.qq.com', path, {
        'Authorization': authorization,
        'Accept': 'application/json',
        'User-Agent': 'wushi-design-assistant/1.0'
    });
    if (res.statusCode !== 200) {
        throw new Error(`WXPAY_QUERY_FAILED: ${res.statusCode} ${JSON.stringify(res.json)}`);
    }
    return res.json;
}

/**
 * 解密回调通知中的 resource 字段（AEAD_AES_256_GCM）
 * 注意：本实现仅用回调作为"有订单变化，去主动查询"的触发信号，
 * 最终是否发货（发放/延长会员）永远以 queryOrderByOutTradeNo 的结果为准，
 * 不直接信任解密后的回调内容——这样即使商户号是2024-11-1后新注册、
 * 默认使用"微信支付公钥模式"验签导致本文件未实现的验签逻辑覆盖不到，
 * 也不会出现"伪造回调即可发货"的安全问题。
 */
function decryptNotifyResource(resource) {
    const cfg = getConfig();
    const { ciphertext, associated_data, nonce } = resource;
    const key = cfg.apiV3Key;
    const buf = Buffer.from(ciphertext, 'base64');
    const authTag = buf.slice(buf.length - 16);
    const data = buf.slice(0, buf.length - 16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAuthTag(authTag);
    decipher.setAAD(Buffer.from(associated_data || ''));
    const decoded = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    return JSON.parse(decoded);
}

module.exports = { createNativeOrder, queryOrderByOutTradeNo, decryptNotifyResource };
