import { markOrderPaidByOrderNo } from '@/lib/checkout'
import { normalizePayProvider, verifyNotifySecret, listPayProviders } from '@/lib/pay/providers'
import { getQuotaStatus } from '@/lib/plan'

/**
 * 微信/支付宝异步通知占位：
 * - Header: X-Lingjing-Pay-Secret: <PLAN_PAY_NOTIFY_SECRET>
 *   或 body.secret
 * - body: { orderNo, tradeNo? }
 *
 * 正式环境应先完成渠道侧签名验签，再调用本接口或在此内联验签后 markOrderPaid。
 */
export async function POST(request, context) {
  try {
    const params = await context.params
    const provider = normalizePayProvider(params?.provider)
    if (provider === 'mock') {
      return Response.json({ error: '演示支付请走 /api/plan/checkout confirm' }, { status: 400 })
    }

    const meta = listPayProviders().find((p) => p.id === provider)
    if (!meta?.available) {
      return Response.json(
        { error: meta?.hint || '通道未就绪', code: 'not_available', provider },
        { status: 503 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const secret =
      request.headers.get('x-lingjing-pay-secret') ||
      request.headers.get('X-Lingjing-Pay-Secret') ||
      body.secret

    if (!verifyNotifySecret(secret)) {
      return Response.json({ error: '验签失败' }, { status: 401 })
    }

    const orderNo = body.orderNo || body.out_trade_no || body.outTradeNo
    if (!orderNo) {
      return Response.json({ error: '缺少 orderNo' }, { status: 400 })
    }

    const result = markOrderPaidByOrderNo(String(orderNo), provider)
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 })
    }

    const quota = result.order?.userId ? getQuotaStatus(result.order.userId) : null
    return Response.json({
      ok: true,
      provider,
      order: result.order,
      alreadyPaid: !!result.alreadyPaid,
      tradeNo: body.tradeNo || body.trade_no || null,
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
    available: !!meta?.available,
    mode: meta?.mode,
    hint: meta?.hint,
    notify: `POST /api/plan/pay/notify/${provider}`,
  })
}
