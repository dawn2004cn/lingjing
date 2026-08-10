import { markOrderPaidByOrderNo } from '@/lib/checkout'
import { normalizePayProvider, listPayProviders, notifySecretConfigured } from '@/lib/pay/providers'
import {
  authenticatePayNotify,
  wechatPlatformKeyConfigured,
  alipayPublicKeyConfigured,
  secretNotifyAllowed,
} from '@/lib/pay/verify-notify'
import { getQuotaStatus } from '@/lib/plan'

function notifyChannelReady(provider) {
  if (provider === 'wechat') {
    return wechatPlatformKeyConfigured() || (secretNotifyAllowed() && notifySecretConfigured())
  }
  if (provider === 'alipay') {
    return alipayPublicKeyConfigured() || (secretNotifyAllowed() && notifySecretConfigured())
  }
  return false
}

/**
 * 微信/支付宝异步通知：
 * 1) 微信：Wechatpay-* 头 + 平台证书验签（可选 resource 解密）
 * 2) 支付宝：body.sign + ALIPAY_PUBLIC_KEY RSA2 验签
 * 3) 兼容桥：X-Lingjing-Pay-Secret（可关 PLAN_PAY_ALLOW_SECRET_NOTIFY=0）
 */
export async function POST(request, context) {
  try {
    const params = await context.params
    const provider = normalizePayProvider(params?.provider)
    if (provider === 'mock') {
      return Response.json({ error: '演示支付请走 /api/plan/checkout confirm' }, { status: 400 })
    }

    if (!notifyChannelReady(provider)) {
      const meta = listPayProviders().find((p) => p.id === provider)
      return Response.json(
        {
          error: meta?.hint || '回调通道未就绪：请配置平台证书/公钥或 NOTIFY_SECRET',
          code: 'not_available',
          provider,
        },
        { status: 503 },
      )
    }

    const rawBody = await request.text()
    let parsedBody = {}
    const ct = request.headers.get('content-type') || ''
    if (ct.includes('application/x-www-form-urlencoded')) {
      const sp = new URLSearchParams(rawBody)
      for (const [k, v] of sp.entries()) parsedBody[k] = v
    } else if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody)
      } catch {
        parsedBody = {}
      }
    }

    const auth = authenticatePayNotify(provider, request, rawBody, parsedBody)
    if (!auth.ok) {
      return Response.json({ error: auth.error }, { status: 401 })
    }

    const result = markOrderPaidByOrderNo(String(auth.orderNo), provider)
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 })
    }

    const quota = result.order?.userId ? getQuotaStatus(result.order.userId) : null

    // 支付宝要求 success 明文；微信接受 JSON
    if (provider === 'alipay' && auth.mode === 'alipay_rsa2') {
      return new Response('success', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    return Response.json({
      ok: true,
      provider,
      order: result.order,
      alreadyPaid: !!result.alreadyPaid,
      tradeNo: auth.tradeNo,
      mode: auth.mode,
      quota,
    })
  } catch (err) {
    console.error('pay notify error', err)
    return Response.json({ error: '通知处理失败' }, { status: 500 })
  }
}

export async function GET(_request, context) {
  const params = await context.params
  const provider = normalizePayProvider(params?.provider)
  const meta = listPayProviders().find((p) => p.id === provider)
  return Response.json({
    provider,
    available: notifyChannelReady(provider),
    prepayAvailable: !!meta?.available,
    mode: meta?.mode,
    platformVerify:
      provider === 'wechat'
        ? wechatPlatformKeyConfigured()
        : provider === 'alipay'
          ? alipayPublicKeyConfigured()
          : false,
    secretBridge: secretNotifyAllowed() && notifySecretConfigured(),
    hint: meta?.hint,
    notify: `POST /api/plan/pay/notify/${provider}`,
  })
}
