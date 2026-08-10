/**
 * 微信支付 Native 预下单（APIv3 契约）
 * dry-run：本地组装并签名 Authorization，返回合成 code_url
 * live：POST https://api.mch.weixin.qq.com/v3/pay/transactions/native
 */

import {
  normalizePem,
  randomNonce,
  rsaSha256SignBase64,
  payDryRunEnabled,
  publicAppBaseUrl,
} from './sign'

export function wechatFullyConfigured() {
  return !!(
    process.env.WECHAT_PAY_MCH_ID &&
    process.env.WECHAT_PAY_APP_ID &&
    (process.env.WECHAT_PAY_API_V3_KEY || process.env.WECHAT_PAY_API_KEY) &&
    process.env.WECHAT_PAY_MCH_PRIVATE_KEY &&
    process.env.WECHAT_PAY_MCH_SERIAL &&
    process.env.PLAN_PAY_NOTIFY_SECRET
  )
}

function buildNativeBody(order) {
  const base = publicAppBaseUrl()
  return {
    appid: process.env.WECHAT_PAY_APP_ID,
    mchid: process.env.WECHAT_PAY_MCH_ID,
    description: '灵镜专业档',
    out_trade_no: order.orderNo,
    notify_url: `${base}/api/plan/pay/notify/wechat`,
    amount: {
      total: Number(order.amountFen),
      currency: 'CNY',
    },
  }
}

function buildAuthorization(method, path, bodyStr, timestamp, nonce) {
  const message = `${method}\n${path}\n${timestamp}\n${nonce}\n${bodyStr}\n`
  const signature = rsaSha256SignBase64(message, process.env.WECHAT_PAY_MCH_PRIVATE_KEY)
  const serial = process.env.WECHAT_PAY_MCH_SERIAL
  const mchId = process.env.WECHAT_PAY_MCH_ID
  return `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${serial}"`
}

/**
 * @returns {Promise<{ ok: true, prepay: object } | { ok: false, error: string, detail?: any }>}
 */
export async function createWechatNativePrepay(order) {
  if (!wechatFullyConfigured()) {
    return { ok: false, error: '微信预下单未就绪：需 APP_ID/MCH_ID/商户私钥/证书序列号/NOTIFY_SECRET' }
  }

  const path = '/v3/pay/transactions/native'
  const body = buildNativeBody(order)
  const bodyStr = JSON.stringify(body)
  const timestamp = String(Math.floor(Date.now() / 1000))
  const nonce = randomNonce(16)
  let authorization
  try {
    authorization = buildAuthorization('POST', path, bodyStr, timestamp, nonce)
  } catch (e) {
    return { ok: false, error: e.message || '微信签名失败' }
  }

  if (payDryRunEnabled()) {
    const codeUrl = `weixin://wxpay/bizpayurl?pr=DRYRUN_${order.orderNo}`
    return {
      ok: true,
      prepay: {
        provider: 'wechat',
        mode: 'dry_run',
        channel: 'native',
        orderNo: order.orderNo,
        amountFen: order.amountFen,
        codeUrl,
        request: body,
        authorizationPreview: authorization.slice(0, 80) + '…',
        message: 'dry-run：已本地签名，未请求微信网关。设 PLAN_PAY_DRY_RUN=0 可打真实 API。',
        notifyPath: '/api/plan/pay/notify/wechat',
        hint: '回调仍须带 X-Lingjing-Pay-Secret；生产应改为验微信平台证书签名后再 markOrderPaid',
      },
    }
  }

  try {
    const res = await fetch(`https://api.mch.weixin.qq.com${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: authorization,
      },
      body: bodyStr,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        ok: false,
        error: data?.message || data?.code || `微信预下单失败 HTTP ${res.status}`,
        detail: data,
      }
    }
    return {
      ok: true,
      prepay: {
        provider: 'wechat',
        mode: 'live',
        channel: 'native',
        orderNo: order.orderNo,
        amountFen: order.amountFen,
        codeUrl: data.code_url,
        prepayId: data.prepay_id || null,
        message: '微信 Native 预下单成功，请扫码支付',
        notifyPath: '/api/plan/pay/notify/wechat',
      },
    }
  } catch (e) {
    return { ok: false, error: e.message || '微信网关请求失败' }
  }
}

/** 同步 dry-run 预下单（回归用；live 请走 createWechatNativePrepay） */
export function createWechatNativePrepayDry(order) {
  const prev = process.env.PLAN_PAY_DRY_RUN
  process.env.PLAN_PAY_DRY_RUN = '1'
  // createWechatNativePrepay 在 dry-run 下同步 resolve——仍返回 Promise
  // 直接复用构建逻辑：
  try {
    if (!wechatFullyConfigured()) {
      return { ok: false, error: '微信未配置' }
    }
    const path = '/v3/pay/transactions/native'
    const body = buildNativeBody(order)
    const bodyStr = JSON.stringify(body)
    const timestamp = String(Math.floor(Date.now() / 1000))
    const nonce = randomNonce(16)
    const authorization = buildAuthorization('POST', path, bodyStr, timestamp, nonce)
    return {
      ok: true,
      prepay: {
        provider: 'wechat',
        mode: 'dry_run',
        channel: 'native',
        orderNo: order.orderNo,
        amountFen: order.amountFen,
        codeUrl: `weixin://wxpay/bizpayurl?pr=DRYRUN_${order.orderNo}`,
        request: body,
        authorizationPreview: authorization.slice(0, 80) + '…',
        message: 'dry-run sync',
        notifyPath: '/api/plan/pay/notify/wechat',
      },
    }
  } catch (e) {
    return { ok: false, error: e.message || '签名失败' }
  } finally {
    if (prev === undefined) delete process.env.PLAN_PAY_DRY_RUN
    else process.env.PLAN_PAY_DRY_RUN = prev
  }
}

export function wechatConfigHint() {
  const missing = []
  if (!process.env.WECHAT_PAY_APP_ID) missing.push('WECHAT_PAY_APP_ID')
  if (!process.env.WECHAT_PAY_MCH_ID) missing.push('WECHAT_PAY_MCH_ID')
  if (!process.env.WECHAT_PAY_MCH_PRIVATE_KEY) missing.push('WECHAT_PAY_MCH_PRIVATE_KEY')
  if (!process.env.WECHAT_PAY_MCH_SERIAL) missing.push('WECHAT_PAY_MCH_SERIAL')
  if (!(process.env.WECHAT_PAY_API_V3_KEY || process.env.WECHAT_PAY_API_KEY)) {
    missing.push('WECHAT_PAY_API_V3_KEY')
  }
  if (!process.env.PLAN_PAY_NOTIFY_SECRET) missing.push('PLAN_PAY_NOTIFY_SECRET')
  return missing
}