import { getAuthUser } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET() {
  const user = getAuthUser()
  if (!user || user.role !== 'admin') {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const db = getDb()
  const row = db.prepare('SELECT COUNT(*) as count FROM users').get()
  return Response.json({ count: row.count })
}