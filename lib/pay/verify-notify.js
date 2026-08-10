/**
 * 支付回调验签
 * - 微信 APIv3：Wechatpay-Timestamp/Nonce/Signature + 平台证书公钥；resource AES-GCM 解密
 * - 支付宝：RSA2 验签（ALIPAY_PUBLIC_KEY）
 * - 兼容桥：X-Lingjing-Pay-Secret（PLAN_PAY_ALLOW_SECRET_NOTIFY 默认允许）
 */

import { createVerify, createDecipheriv, createPublicKey } from 'crypto'
import { normalizePem, alipaySignContent } from './sign'
import { verifyNotifySecret } from './providers'

export function secretNotifyAllowed() {
  return process.env.PLAN_PAY_ALLOW_SECRET_NOTIFY !== '0'
}

export function wechatPlatformKeyConfigured() {
  return !!(process.env.WECHAT_PAY_PLATFORM_CERT || process.env.WECHAT_PAY_PLATFORM_PUBLIC_KEY)
}

export function alipayPublicKeyConfigured() {
  return !!process.env.ALIPAY_PUBLIC_KEY
}

/**
 * RSA-SHA256 验签（微信平台证书 / 支付宝公钥）
 */
export function rsaSha256Verify(content, signatureBase64, publicKeyPem) {
  const keyPem = normalizePem(publicKeyPem)
  if (!keyPem) return false
  try {
    const key = createPublicKey(keyPem)
    const verifier = createVerify('RSA-SHA256')
    verifier.update(content, 'utf8')
    verifier.end()
    return verifier.verify(key, signatureBase64, 'base64')
  } catch {
    return false
  }
}

function wechatPlatformPem() {
  return normalizePem(
    process.env.WECHAT_PAY_PLATFORM_CERT || process.env.WECHAT_PAY_PLATFORM_PUBLIC_KEY || '',
  )
}

/**
 * 微信回调：校验头签名
 * message = `${timestamp}\n${nonce}\n${body}\n`
 */
export function verifyWechatNotifyHeaders({ timestamp, nonce, body, signature, serial }) {
  if (!timestamp || !nonce || body == null || !signature) {
    return { ok: false, error: '缺少微信回调签名头' }
  }
  const expectedSerial = process.env.WECHAT_PAY_PLATFORM_SERIAL
  if (expectedSerial && serial && serial !== expectedSerial) {
    return { ok: false, error: '平台证书序列号不匹配' }
  }
  const pem = wechatPlatformPem()
  if (!pem) {
    return { ok: false, error: '未配置 WECHAT_PAY_PLATFORM_CERT / WECHAT_PAY_PLATFORM_PUBLIC_KEY' }
  }
  const message = `${timestamp}\n${nonce}\n${body}\n`
  const ok = rsaSha256Verify(message, signature, pem)
  return ok ? { ok: true } : { ok: false, error: '微信平台签名校验失败' }
}

/**
 * 微信 resource AES-256-GCM 解密（APIv3 Key）
 */
export function decryptWechatResource(resource, apiV3Key) {
  const key = apiV3Key || process.env.WECHAT_PAY_API_V3_KEY || process.env.WECHAT_PAY_API_KEY
  if (!key || String(key).length !== 32) {
    return { ok: false, error: 'WECHAT_PAY_API_V3_KEY 须为 32 字节' }
  }
  if (!resource?.ciphertext || !resource?.nonce) {
    return { ok: false, error: '缺少加密 resource' }
  }
  try {
    const ciphertext = Buffer.from(resource.ciphertext, 'base64')
    const authTag = ciphertext.subarray(ciphertext.length - 16)
    const data = ciphertext.subarray(0, ciphertext.length - 16)
    const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key), Buffer.from(resource.nonce))
    if (resource.associated_data) {
      decipher.setAAD(Buffer.from(resource.associated_data))
    }
    decipher.setAuthTag(authTag)
    const decoded = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
    return { ok: true, plain: JSON.parse(decoded) }
  } catch (e) {
    return { ok: false, error: e.message || 'resource 解密失败' }
  }
}

/**
 * 支付宝异步通知验签（剔除 sign / sign_type 后排序）
 */
export function verifyAlipayNotifyParams(params) {
  const sign = params?.sign
  if (!sign) return { ok: false, error: '缺少支付宝 sign' }
  const pem = normalizePem(process.env.ALIPAY_PUBLIC_KEY || '')
  if (!pem) return { ok: false, error: '未配置 ALIPAY_PUBLIC_KEY' }
  const content = alipaySignContent(params)
  const ok = rsaSha256Verify(content, sign, pem)
  return ok ? { ok: true } : { ok: false, error: '支付宝签名校验失败' }
}

/**
 * 统一解析回调并得到 orderNo
 */
export function authenticatePayNotify(provider, request, rawBody, parsedBody) {
  if (provider === 'wechat') {
    const timestamp =
      request.headers.get('wechatpay-timestamp') || request.headers.get('Wechatpay-Timestamp')
    const nonce = request.headers.get('wechatpay-nonce') || request.headers.get('Wechatpay-Nonce')
    const signature =
      request.headers.get('wechatpay-signature') || request.headers.get('Wechatpay-Signature')
    const serial =
      request.headers.get('wechatpay-serial') || request.headers.get('Wechatpay-Serial')

    if (signature) {
      const v = verifyWechatNotifyHeaders({
        timestamp,
        nonce,
        body: rawBody,
        signature,
        serial,
      })
      if (!v.ok) return v

      let orderNo = parsedBody?.out_trade_no || parsedBody?.orderNo
      let tradeNo = parsedBody?.transaction_id || parsedBody?.tradeNo
      let plain = null

      if (parsedBody?.resource) {
        const dec = decryptWechatResource(parsedBody.resource)
        if (!dec.ok) return dec
        plain = dec.plain
        orderNo = plain?.out_trade_no || orderNo
        tradeNo = plain?.transaction_id || tradeNo
        if (plain?.trade_state && plain.trade_state !== 'SUCCESS') {
          return { ok: false, error: `微信交易状态非成功：${plain.trade_state}` }
        }
      }

      if (!orderNo) return { ok: false, error: '微信回调缺少 out_trade_no' }
      return {
        ok: true,
        orderNo: String(orderNo),
        tradeNo: tradeNo ? String(tradeNo) : null,
        mode: 'wechat_platform',
        plain,
      }
    }
  }

  if (provider === 'alipay') {
    if (parsedBody?.sign) {
      const v = verifyAlipayNotifyParams(parsedBody)
      if (!v.ok) return v
      const status = parsedBody.trade_status
      if (status && status !== 'TRADE_SUCCESS' && status !== 'TRADE_FINISHED') {
        return { ok: false, error: `支付宝交易状态非成功：${status}` }
      }
      const orderNo = parsedBody.out_trade_no || parsedBody.orderNo
      if (!orderNo) return { ok: false, error: '支付宝回调缺少 out_trade_no' }
      return {
        ok: true,
        orderNo: String(orderNo),
        tradeNo: parsedBody.trade_no ? String(parsedBody.trade_no) : null,
        mode: 'alipay_rsa2',
      }
    }
  }

  if (secretNotifyAllowed()) {
    const secret =
      request.headers.get('x-lingjing-pay-secret') ||
      request.headers.get('X-Lingjing-Pay-Secret') ||
      parsedBody?.secret
    if (verifyNotifySecret(secret)) {
      const orderNo = parsedBody?.orderNo || parsedBody?.out_trade_no || parsedBody?.outTradeNo
      if (!orderNo) return { ok: false, error: '缺少 orderNo' }
      return {
        ok: true,
        orderNo: String(orderNo),
        tradeNo: parsedBody?.tradeNo || parsedBody?.trade_no || null,
        mode: 'secret_bridge',
      }
    }
  }

  return {
    ok: false,
    error:
      provider === 'wechat'
        ? '需微信平台签名头，或配置密钥桥 X-Lingjing-Pay-Secret'
        : '需支付宝 sign，或配置密钥桥 X-Lingjing-Pay-Secret',
  }
}
