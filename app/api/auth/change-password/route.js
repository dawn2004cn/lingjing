import bcrypt from 'bcryptjs'
import { getAuthUser } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function PUT(request) {
  try {
    const authUser = getAuthUser()
    if (!authUser) {
      return Response.json({ error: '未登录' }, { status: 401 })
    }

    const { oldPassword, newPassword } = await request.json()
    if (!oldPassword || !newPassword) {
      return Response.json({ error: '请填写旧密码和新密码' }, { status: 400 })
    }
    if (newPassword.length < 6) {
      return Response.json({ error: '新密码至少 6 个字符' }, { status: 400 })
    }

    const db = getDb()
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(authUser.id)
    if (!user || !bcrypt.compareSync(oldPassword, user.password)) {
      return Response.json({ error: '旧密码错误' }, { status: 400 })
    }

    const hash = bcrypt.hashSync(newPassword, 10)
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, authUser.id)

    return Response.json({ ok: true })
  } catch (err) {
    console.error('Change password error:', err)
    return Response.json({ error: '修改密码失败' }, { status: 500 })
  }
}