import bcrypt from 'bcryptjs'
import { getDb } from '@/lib/db'
import { signToken, setTokenCookie } from '@/lib/auth'

export async function POST(request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return Response.json({ error: '请填写用户名和密码' }, { status: 400 })
    }
    if (username.length < 2) {
      return Response.json({ error: '用户名至少 2 个字符' }, { status: 400 })
    }
    if (password.length < 6) {
      return Response.json({ error: '密码至少 6 个字符' }, { status: 400 })
    }

    const db = getDb()
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
    if (existing) {
      return Response.json({ error: '用户名已被注册' }, { status: 409 })
    }

    const hash = bcrypt.hashSync(password, 10)
    const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hash)

    const token = signToken({ id: result.lastInsertRowid, username, role: 'user' })
    const headers = new Headers()
    headers.append('Set-Cookie', setTokenCookie(token))

    return Response.json({ id: result.lastInsertRowid, username, role: 'user' }, { headers })
  } catch (err) {
    console.error('Register error:', err)
    return Response.json({ error: '注册失败，请稍后重试' }, { status: 500 })
  }
}