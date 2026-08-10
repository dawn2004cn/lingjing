/**
 * 统一预下单入口
 */

import { createWechatNativePrepay, wechatFullyConfigured, wechatConfigHint } from './wechat-prepay'
import { createAlipayPagePrepay, alipayFullyConfigured, alipayConfigHint } from './alipay-prepay'
import { normalizePayProvider, listPayProviders } from './providers'
import { payDryRunEnabled } from './sign'

/**
 * @param {{ orderNo: string, amountFen: number, amountYuan?: string }} order
 * @param {string} providerRaw
 */
export async function createPrepay(order, providerRaw) {
  const provider = normalizePayProvider(providerRaw)
  if (provider === 'mock') {
    return {
      ok: false,
      error: '演示支付请用 checkout confirm，无需预下单',
      code: 'mock_no_prepay',
    }
  }

  if (provider === 'wechat') {
    if (!wechatFullyConfigured()) {
      return {
        ok: false,
        error: `微信未配置：缺 ${wechatConfigHint().join(', ') || '密钥'}`,
        code: 'not_configured',
      }
    }
    return createWechatNativePrepay(order)
  }

  if (provider === 'alipay') {
    if (!alipayFullyConfigured()) {
      return {
        ok: false,
        error: `支付宝未配置：缺 ${alipayConfigHint().join(', ') || '密钥'}`,
        code: 'not_configured',
      }
    }
    return createAlipayPagePrepay(order)
  }

  return { ok: false, error: '未知通道', code: 'unknown_provider' }
}

export function prepayStatusSummary() {
  const providers = listPayProviders()
  return {
    dryRun: payDryRunEnabled(),
    wechatReady: wechatFullyConfigured(),
    alipayReady: alipayFullyConfigured(),
    wechatMissing: wechatConfigHint(),
    alipayMissing: alipayConfigHint(),
    providers,
  }
}
