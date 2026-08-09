import { clearTokenCookie } from '@/lib/auth'

export async function POST() {
  const headers = new Headers()
  headers.append('Set-Cookie', clearTokenCookie())
  return Response.json({ ok: true }, { headers })
}