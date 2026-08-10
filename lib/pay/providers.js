/**
 * 支付通道适配器
 * - mock：演示确认（受 PLAN_ALLOW_MOCK_PAY 控制）
 * - wechat / alipay：商户密钥齐全时可预下单（默认 PLAN_PAY_DRY_RUN，不打真实网关）
 *
 * 环境变量见 .env.example
 */

import { wechatFullyConfigured, wechatConfigHint } from './wechat-prepay'
import { alipayFullyConfigured, alipayConfigHint } from './alipay-prepay'
import { payDryRunEnabled } from './sign'

export const PAY_PROVIDERS = ['mock', 'wechat', 'alipay']

function mockPayAllowedLocal() {
  return process.env.PLAN_ALLOW_MOCK_PAY !== '0'
}

export function wechatConfigured() {
  return wechatFullyConfigured()
}

export function alipayConfigured() {
  return alipayFullyConfigured()
}

export function notifySecretConfigured() {
  return !!process.env.PLAN_PAY_NOTIFY_SECRET
}

/**
 * @returns {{ id: string, label: string, available: boolean, mode: string, hint: string }[]}
 */
export function listPayProviders() {
  const dry = payDryRunEnabled()
  return [
    {
      id: 'mock',
      label: '演示支付',
      available: mockPayAllowedLocal(),
      mode: 'mock',
      hint: mockPayAllowedLocal()
        ? '本地演示：确认即开通（非真实扣款）'
        : '演示支付已关闭（PLAN_ALLOW_MOCK_PAY=0）',
    },
    {
      id: 'wechat',
      label: '微信支付',
      available: wechatFullyConfigured(),
      mode: wechatFullyConfigured() ? (dry ? 'prepay_dry_run' : 'prepay_live') : 'not_configured',
      hint: wechatFullyConfigured()
        ? dry
          ? '已配置：可预下单（dry-run，本地签名不请求微信）'
          : '已配置：预下单将请求微信 Native API'
        : `未就绪：缺 ${wechatConfigHint().join(', ') || '密钥'}`,
    },
    {
      id: 'alipay',
      label: '支付宝',
      available: alipayFullyConfigured(),
      mode: alipayFullyConfigured() ? (dry ? 'prepay_dry_run' : 'prepay_live') : 'not_configured',
      hint: alipayFullyConfigured()
        ? dry
          ? '已配置：可预下单（dry-run，本地 RSA2 签名）'
          : '已配置：返回支付宝 page.pay 跳转参数'
        : `未就绪：缺 ${alipayConfigHint().join(', ') || '密钥'}`,
    },
  ]
}

export function normalizePayProvider(raw) {
  const id = String(raw || 'mock').toLowerCase()
  return PAY_PROVIDERS.includes(id) ? id : 'mock'
}

/**
 * 创建支付意图元数据（同步）；正式预下单请调 createPrepay / checkout action=prepay
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

  return {
    ok: true,
    intent: {
      provider,
      mode: meta.mode,
      orderNo: order.orderNo,
      amountFen: order.amountFen,
      amountYuan: order.amountYuan,
      notifyPath: `/api/plan/pay/notify/${provider}`,
      nextAction: 'prepay',
      message: `请调用 checkout action=prepay（provider=${provider}）获取${provider === 'wechat' ? '扫码' : '跳转'}参数`,
      configured: true,
      dryRun: payDryRunEnabled(),
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
