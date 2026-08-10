import { getAuthUser } from '@/lib/auth'
import { getQuotaStatus } from '@/lib/plan'

export async function GET() {
  const user = getAuthUser()
  if (!user) {
    return Response.json({ error: '未登录' }, { status: 401 })
  }
  const quota = getQuotaStatus(user.id)
  return Response.json({
    id: user.id,
    username: user.username,
    role: user.role,
    plan: quota.planId === 'admin' ? 'admin' : quota.planId,
    planLabel: quota.label,
    quota,
  })
}
