import { getAuthUser } from '@/lib/auth'
import { redeemCodeForUser } from '@/lib/redeem'
import { getQuotaStatus } from '@/lib/plan'

export async function POST(request) {
  const user = getAuthUser()
  if (!user?.id) {
    return Response.json({ error: '请先登录' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const result = redeemCodeForUser(user.id, body.code)
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 })
    }
    const quota = getQuotaStatus(user.id)
    return Response.json({
      ok: true,
      plan: result.plan,
      display: result.display,
      planLabel: quota.label,
      quota,
      message: `已兑换为${quota.label}档`,
    })
  } catch (err) {
    console.error('redeem error', err)
    return Response.json({ error: '兑换失败' }, { status: 500 })
  }
}
