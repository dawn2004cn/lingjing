import { getAuthUser } from '@/lib/auth'
import {
  createSession,
  listSessionsForUser,
  getSessionByPublicId,
  updateSession,
  appendSessionTurn,
  deleteSession,
} from '@/lib/sessions'

export async function GET(request) {
  const user = getAuthUser()
  if (!user?.id) {
    return Response.json({ error: '请先登录' }, { status: 401 })
  }
  const url = new URL(request.url)
  const publicId = url.searchParams.get('id')
  if (publicId) {
    const session = getSessionByPublicId(user.id, publicId)
    if (!session) return Response.json({ error: '会话不存在' }, { status: 404 })
    return Response.json({ session })
  }
  const limit = Number(url.searchParams.get('limit') || 30)
  return Response.json({ sessions: listSessionsForUser(user.id, limit) })
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
      const result = createSession(user.id, {
        system: body.system,
        birth: body.birth,
        result: body.result,
        thread: body.thread,
        meta: body.meta,
      })
      if (!result.ok) return Response.json({ error: result.error }, { status: 400 })
      return Response.json({ ok: true, session: result.session })
    }

    if (action === 'update') {
      const result = updateSession(user.id, body.id || body.publicId, {
        birth: body.birth,
        system: body.system,
        result: body.result,
        thread: body.thread,
        meta: body.meta,
        title: body.title,
      })
      if (!result.ok) {
        return Response.json({ error: result.error }, { status: result.error === '会话不存在' ? 404 : 400 })
      }
      return Response.json({ ok: true, session: result.session })
    }

    if (action === 'append') {
      const result = appendSessionTurn(user.id, body.id || body.publicId, {
        question: body.question,
        answer: body.answer,
      })
      if (!result.ok) {
        return Response.json({ error: result.error }, { status: result.error === '会话不存在' ? 404 : 400 })
      }
      return Response.json({ ok: true, session: result.session })
    }

    if (action === 'delete') {
      const result = deleteSession(user.id, body.id || body.publicId)
      if (!result.ok) {
        return Response.json({ error: result.error }, { status: result.error === '会话不存在' ? 404 : 400 })
      }
      return Response.json({ ok: true })
    }

    return Response.json({ error: '未知操作' }, { status: 400 })
  } catch (err) {
    console.error('sessions error', err)
    return Response.json({ error: '会话操作失败' }, { status: 500 })
  }
}
