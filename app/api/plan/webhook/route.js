/**
 * 支付通道回调占位：当前仅接受 provider=mock 且开启演示支付时的内部确认。
 * 接入微信/支付宝后在此验签并调用 markOrderPaidByOrderNo。
 */
import { markOrderPaidByOrderNo, mockPayAllowed } from '@/lib/checkout'

export async function POST(request) {
  try {
    const body = await request.json()
    const provider = body.provider || 'mock'
    const orderNo = body.orderNo

    if (!orderNo) {
      return Response.json({ error: '缺少 orderNo' }, { status: 400 })
    }

    if (provider === 'mock') {
      if (!mockPayAllowed()) {
        return Response.json({ error: '演示支付已关闭' }, { status: 403 })
      }
      // 简单共享密钥（可选）
      const secret = process.env.PLAN_MOCK_WEBHOOK_SECRET
      if (secret && body.secret !== secret) {
        return Response.json({ error: 'webhook 校验失败' }, { status: 403 })
      }
      const result = markOrderPaidByOrderNo(orderNo, 'mock')
      if (!result.ok) {
        return Response.json({ error: result.error }, { status: 400 })
      }
      return Response.json({ ok: true, order: result.order })
    }

    return Response.json(
      { error: `支付通道「${provider}」尚未接入，请使用兑换码或演示支付` },
      { status: 501 },
    )
  } catch (err) {
    console.error('plan webhook error', err)
    return Response.json({ error: '回调处理失败' }, { status: 500 })
  }
}
