/**
 * 支付通道适配器骨架
 * - mock：演示确认（受 PLAN_ALLOW_MOCK_PAY 控制）
 * - wechat / alipay：凭环境变量声明就绪；正式下单 SDK 未内置，走 notify 回调占位
 *
 * 环境变量（任一商户通道）：
 *   WECHAT_PAY_MCH_ID + WECHAT_PAY_API_V3_KEY（或 WECHAT_PAY_API_KEY）
 *   ALIPAY_APP_ID + ALIPAY_PRIVATE_KEY
 *   PLAN_PAY_NOTIFY_SECRET —— 回调共用密钥（必填方可接受正式 notify）
 */

import { mockPayAllowed } from '../checkout'

export const PAY_PROVIDERS = ['mock', 'wechat', 'alipay']

export function wechatConfigured() {
  return !!(
    process.env.WECHAT_PAY_MCH_ID &&
    (process.env.WECHAT_PAY_API_V3_KEY || process.env.WECHAT_PAY_API_KEY)
  )
}

export function alipayConfigured() {
  return !!(process.env.ALIPAY_APP_ID && process.env.ALIPAY_PRIVATE_KEY)
}

export function notifySecretConfigured() {
  return !!process.env.PLAN_PAY_NOTIFY_SECRET
}

/**
 * @returns {{ id: string, label: string, available: boolean, mode: string, hint: string }[]}
 */
export function listPayProviders() {
  return [
    {
      id: 'mock',
      label: '演示支付',
      available: mockPayAllowed(),
      mode: 'mock',
      hint: mockPayAllowed()
        ? '本地演示：确认即开通（非真实扣款）'
        : '演示支付已关闭（PLAN_ALLOW_MOCK_PAY=0）',
    },
    {
      id: 'wechat',
      label: '微信支付',
      available: wechatConfigured() && notifySecretConfigured(),
      mode: wechatConfigured() ? 'notify' : 'not_configured',
      hint: wechatConfigured()
        ? notifySecretConfigured()
          ? '商户已配置；下单后由微信回调 /api/plan/pay/notify/wechat 验签入账'
          : '已填商户号，但仍需 PLAN_PAY_NOTIFY_SECRET'
        : '未配置 WECHAT_PAY_MCH_ID / WECHAT_PAY_API_V3_KEY',
    },
    {
      id: 'alipay',
      label: '支付宝',
      available: alipayConfigured() && notifySecretConfigured(),
      mode: alipayConfigured() ? 'notify' : 'not_configured',
      hint: alipayConfigured()
        ? notifySecretConfigured()
          ? '商户已配置；下单后由支付宝回调 /api/plan/pay/notify/alipay 验签入账'
          : '已填 AppId，但仍需 PLAN_PAY_NOTIFY_SECRET'
        : '未配置 ALIPAY_APP_ID / ALIPAY_PRIVATE_KEY',
    },
  ]
}

export function normalizePayProvider(raw) {
  const id = String(raw || 'mock').toLowerCase()
  return PAY_PROVIDERS.includes(id) ? id : 'mock'
}

/**
 * 创建支付意图（不发起真实第三方 API；正式 SDK 可在此替换）
 * @returns {{ ok: true, intent: object } | { ok: false, error: string, code?: string }}
 */
export function createPaymentIntent(order, providerRaw) {
  const provider = normalizePayProvider(providerRaw)
  const providers = listPayProviders()
  const meta = providers.find((p) => p.id === provider)

  if (!meta?.available) {
    return {
      ok: false,
      error: meta?.hint || '支付通道不可用',
      code: 'not_available',
      provider,
    }
  }

  if (provider === 'mock') {
    return {
      ok: true,
      intent: {
        provider: 'mock',
        mode: 'mock',
        orderNo: order.orderNo,
        amountFen: order.amountFen,
        amountYuan: order.amountYuan,
        nextAction: 'confirm',
        message: '演示模式：调用 checkout confirm 即可开通',
      },
    }
  }

  // 正式通道：返回回调路径与占位字段，供接入方拼装 SDK 预下单
  return {
    ok: true,
    intent: {
      provider,
      mode: 'external',
      orderNo: order.orderNo,
      amountFen: order.amountFen,
      amountYuan: order.amountYuan,
      notifyPath: `/api/plan/pay/notify/${provider}`,
      nextAction: 'await_notify',
      message:
        provider === 'wechat'
          ? '请用商户平台/SDK 创建预支付，支付成功后回调 notify 入账（本仓库不内置微信 SDK）'
          : '请用支付宝 SDK 创建交易，支付成功后回调 notify 入账（本仓库不内置支付宝 SDK）',
      configured: true,
    },
  }
}

/**
 * 校验 notify 密钥（timing-safe 简化版）
 */
export function verifyNotifySecret(headerOrBodySecret) {
  const expected = process.env.PLAN_PAY_NOTIFY_SECRET || ''
  if (!expected) return false
  const got = String(headerOrBodySecret || '')
  if (got.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= got.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}
