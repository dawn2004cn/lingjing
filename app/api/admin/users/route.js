import { getAuthUser } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { normalizePlanId, PLAN_IDS } from '@/lib/plan'

export async function GET() {
  const user = getAuthUser()
  if (!user || user.role !== 'admin') {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const db = getDb()
  const users = db.prepare(`
    SELECT id, username, role, plan, createdAt,
      (SELECT COUNT(*) FROM fortune_records WHERE user_id = users.id) as recordCount
    FROM users
    ORDER BY createdAt DESC
  `).all()

  return Response.json({ users })
}

export async function PATCH(req) {
  const user = getAuthUser()
  if (!user || user.role !== 'admin') {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const body = await req.json()
  const userId = Number(body.userId)
  const plan = normalizePlanId(body.plan)
  if (!userId || !PLAN_IDS.includes(plan)) {
    return Response.json({ error: '参数无效' }, { status: 400 })
  }

  const db = getDb()
  const target = db.prepare('SELECT id, role FROM users WHERE id = ?').get(userId)
  if (!target) return Response.json({ error: '用户不存在' }, { status: 404 })

  db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(plan, userId)
  return Response.json({ ok: true, userId, plan })
}

export async function DELETE(req) {
  const user = getAuthUser()
  if (!user || user.role !== 'admin') {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const { userId } = await req.json()
  if (!userId) return Response.json({ error: '缺少用户ID' }, { status: 400 })
  if (Number(userId) === Number(user.id)) {
    return Response.json({ error: '不能删除自己' }, { status: 400 })
  }

  const db = getDb()

  const target = db.prepare('SELECT role FROM users WHERE id = ?').get(userId)
  if (!target) return Response.json({ error: '用户不存在' }, { status: 404 })

  if (target.role === 'admin') {
    const adminCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get()
    if (adminCount.c <= 1) {
      return Response.json({ error: '至少保留一名管理员' }, { status: 400 })
    }
  }

  db.prepare('DELETE FROM fortune_records WHERE user_id = ?').run(userId)
  db.prepare('DELETE FROM llm_usage WHERE user_id = ?').run(userId)
  db.prepare('DELETE FROM users WHERE id = ?').run(userId)

  return Response.json({ ok: true })
}
