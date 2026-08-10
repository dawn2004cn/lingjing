import bcrypt from 'bcryptjs'
import { getDb } from '@/lib/db'
import { signToken, setTokenCookie } from '@/lib/auth'

export async function POST(request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return Response.json({ error: '请填写用户名和密码' }, { status: 400 })
    }

    const db = getDb()
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return Response.json({ error: '用户名或密码错误' }, { status: 401 })
    }

    const token = signToken({ id: user.id, username: user.username, role: user.role })
    const headers = new Headers()
    headers.append('Set-Cookie', setTokenCookie(token))

    const { getQuotaStatus } = require('@/lib/plan')
    const quota = getQuotaStatus(user.id)

    return Response.json(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        plan: quota.planId === 'admin' ? 'admin' : quota.planId,
        planLabel: quota.label,
        quota,
      },
      { headers },
    )
  } catch (err) {
    console.error('Login error:', err)
    return Response.json({ error: '登录失败，请稍后重试' }, { status: 500 })
  }
}