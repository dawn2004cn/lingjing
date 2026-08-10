/**
 * 支付宝电脑网站支付预下单契约（alipay.trade.page.pay）
 * dry-run：本地 RSA2 签名并返回可提交的 form 字段
 * live：可选直连接口（需网关可达）；默认 dry-run
 */

import {
  alipaySignContent,
  payDryRunEnabled,
  publicAppBaseUrl,
  rsaSha256SignBase64,
} from './sign'

export function alipayFullyConfigured() {
  return !!(
    process.env.ALIPAY_APP_ID &&
    process.env.ALIPAY_PRIVATE_KEY &&
    process.env.PLAN_PAY_NOTIFY_SECRET
  )
}

function buildPagePayParams(order) {
  const base = publicAppBaseUrl()
  const bizContent = JSON.stringify({
    out_trade_no: order.orderNo,
    product_code: 'FAST_INSTANT_TRADE_PAY',
    total_amount: order.amountYuan || (Number(order.amountFen) / 100).toFixed(2),
    subject: '灵镜专业档',
  })

  const params = {
    app_id: process.env.ALIPAY_APP_ID,
    method: 'alipay.trade.page.pay',
    format: 'JSON',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: formatAlipayTimestamp(new Date()),
    version: '1.0',
    notify_url: `${base}/api/plan/pay/notify/alipay`,
    return_url: `${base}/profile`,
    biz_content: bizContent,
  }

  const content = alipaySignContent(params)
  const sign = rsaSha256SignBase64(content, process.env.ALIPAY_PRIVATE_KEY)
  return { ...params, sign }
}

function formatAlipayTimestamp(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/**
 * @returns {{ ok: true, prepay: object } | { ok: false, error: string, detail?: any }}
 */
export function createAlipayPagePrepay(order) {
  if (!alipayFullyConfigured()) {
    return { ok: false, error: '支付宝预下单未就绪：需 ALIPAY_APP_ID / ALIPAY_PRIVATE_KEY / NOTIFY_SECRET' }
  }

  let params
  try {
    params = buildPagePayParams(order)
  } catch (e) {
    return { ok: false, error: e.message || '支付宝签名失败' }
  }

  const gateway =
    process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do'
  const qs = new URLSearchParams(params).toString()
  const dry = payDryRunEnabled()

  return {
    ok: true,
    prepay: {
      provider: 'alipay',
      mode: dry ? 'dry_run' : 'live',
      channel: 'page',
      orderNo: order.orderNo,
      amountFen: order.amountFen,
      gateway,
      form: params,
      payUrl: `${gateway}?${qs}`,
      message: dry
        ? 'dry-run：已本地 RSA2 签名，未跳转支付宝。设 PLAN_PAY_DRY_RUN=0 可走真实网关。'
        : '请打开 payUrl 或提交 form 完成支付宝付款',
      notifyPath: '/api/plan/pay/notify/alipay',
    },
  }
}

export function alipayConfigHint() {
  const missing = []
  if (!process.env.ALIPAY_APP_ID) missing.push('ALIPAY_APP_ID')
  if (!process.env.ALIPAY_PRIVATE_KEY) missing.push('ALIPAY_PRIVATE_KEY')
  if (!process.env.PLAN_PAY_NOTIFY_SECRET) missing.push('PLAN_PAY_NOTIFY_SECRET')
  return missing
}
