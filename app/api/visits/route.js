import { getDb } from '@/lib/db'

export async function POST() {
  const db = getDb()
  db.prepare('INSERT INTO page_visits DEFAULT VALUES').run()
  return Response.json({ ok: true })
}