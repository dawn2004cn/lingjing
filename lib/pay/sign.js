/**
 * 支付签名工具（Node crypto，不依赖第三方 SDK）
 */

import { createSign, createHmac, randomBytes, createHash } from 'crypto'

export function randomNonce(bytes = 16) {
  return randomBytes(bytes).toString('hex')
}

/** PEM 规范化：支持 .env 里用 \n 字面量 */
export function normalizePem(raw) {
  if (!raw) return ''
  let s = String(raw).trim()
  if (s.includes('\\n')) s = s.replace(/\\n/g, '\n')
  return s
}

/**
 * RSA-SHA256 签名（支付宝 RSA2 / 微信 V3 商户私钥）
 * @returns {string} base64
 */
export function rsaSha256SignBase64(content, privateKeyPem) {
  const key = normalizePem(privateKeyPem)
  if (!key) throw new Error('缺少商户私钥')
  const signer = createSign('RSA-SHA256')
  signer.update(content, 'utf8')
  signer.end()
  return signer.sign(key, 'base64')
}

/** 微信 APIv3：HMAC-SHA256(key, message) → 小写 hex（部分场景） */
export function hmacSha256Hex(key, message) {
  return createHmac('sha256', key).update(message, 'utf8').digest('hex')
}

export function sha256Hex(message) {
  return createHash('sha256').update(message, 'utf8').digest('hex')
}

/**
 * 支付宝：参数按 key ASCII 排序后 key=value&...（排除 sign、空值）
 */
export function alipaySignContent(params) {
  return Object.keys(params)
    .filter(
      (k) =>
        k !== 'sign' &&
        k !== 'sign_type' &&
        params[k] !== undefined &&
        params[k] !== '' &&
        params[k] !== null,
    )
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')
}

export function payDryRunEnabled() {
  // 默认 dry-run，避免误打生产网关；显式 PLAN_PAY_DRY_RUN=0 才允许真实 HTTP
  return process.env.PLAN_PAY_DRY_RUN !== '0'
}

export function publicAppBaseUrl() {
  return (
    process.env.PLAN_PAY_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
}
