import { getAuthUser } from '@/lib/auth'
import { createRedeemCodes, disableRedeemCode, listRedeemCodes } from '@/lib/redeem'

export async function GET() {
  const user = getAuthUser()
  if (!user || user.role !== 'admin') {
    return Response.json({ error: '无权限' }, { status: 403 })
  }
  return Response.json({ codes: listRedeemCodes(80) })
}

export async function POST(request) {
  const user = getAuthUser()
  if (!user || user.role !== 'admin') {
    return Response.json({ error: '无权限' }, { status: 403 })
  }
  try {
    const body = await request.json()
    const created = createRedeemCodes({
      plan: body.plan || 'pro',
      maxUses: body.maxUses,
      count: body.count,
      note: body.note,
      expiresAt: body.expiresAt || null,
      createdBy: user.id,
    })
    return Response.json({ ok: true, created })
  } catch (err) {
    return Response.json({ error: err.message || '生成失败' }, { status: 400 })
  }
}

export async function PATCH(request) {
  const user = getAuthUser()
  if (!user || user.role !== 'admin') {
    return Response.json({ error: '无权限' }, { status: 403 })
  }
  const body = await request.json()
  const id = Number(body.id)
  if (!id) return Response.json({ error: '缺少 id' }, { status: 400 })
  if (body.disabled) {
    disableRedeemCode(id)
    return Response.json({ ok: true })
  }
  return Response.json({ error: '无有效操作' }, { status: 400 })
}
