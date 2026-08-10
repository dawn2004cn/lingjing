import { getAuthUser } from '@/lib/auth'
import {
  cancelPendingOrder,
  confirmMockPayment,
  createProOrder,
  getProPriceFen,
  listOrdersForUser,
  mockPayAllowed,
  formatAmountYuan,
} from '@/lib/checkout'
import { getQuotaStatus } from '@/lib/plan'

export async function GET() {
  const user = getAuthUser()
  if (!user?.id) {
    return Response.json({ error: '请先登录' }, { status: 401 })
  }
  return Response.json({
    priceFen: getProPriceFen(),
    priceYuan: formatAmountYuan(getProPriceFen()),
    mockPayAllowed: mockPayAllowed(),
    orders: listOrdersForUser(user.id, 10),
  })
}

export async function POST(request) {
  const user = getAuthUser()
  if (!user?.id) {
    return Response.json({ error: '请先登录' }, { status: 401 })
  }
  try {
    const body = await request.json().catch(() => ({}))
    const action = body.action || 'create'

    if (action === 'create') {
      const result = createProOrder(user.id)
      if (!result.ok) {
        return Response.json({ error: result.error }, { status: 400 })
      }
      return Response.json({
        ok: true,
        order: result.order,
        reused: !!result.reused,
        mockPayAllowed: mockPayAllowed(),
        hint: mockPayAllowed()
          ? '演示模式：可直接确认支付开通专业档（非真实扣款）'
          : '演示支付已关闭；请使用兑换码或等待正式支付通道',
      })
    }

    if (action === 'confirm') {
      const result = confirmMockPayment(user.id, body.orderId || body.orderNo)
      if (!result.ok) {
        return Response.json({ error: result.error }, { status: 400 })
      }
      const quota = getQuotaStatus(user.id)
      return Response.json({
        ok: true,
        order: result.order,
        alreadyPaid: !!result.alreadyPaid,
        plan: 'pro',
        planLabel: quota.label,
        quota,
        message: result.alreadyPaid ? '订单已支付' : '演示支付成功，已开通专业档',
      })
    }

    if (action === 'cancel') {
      const result = cancelPendingOrder(user.id, Number(body.orderId))
      if (!result.ok) {
        return Response.json({ error: result.error }, { status: 400 })
      }
      return Response.json({ ok: true })
    }

    return Response.json({ error: '未知操作' }, { status: 400 })
  } catch (err) {
    console.error('checkout error', err)
    return Response.json({ error: '下单失败' }, { status: 500 })
  }
}
