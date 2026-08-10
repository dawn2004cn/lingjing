import { getAuthUser } from '@/lib/auth'
import { listAllOrders } from '@/lib/checkout'

export async function GET() {
  const user = getAuthUser()
  if (!user || user.role !== 'admin') {
    return Response.json({ error: '无权限' }, { status: 403 })
  }
  return Response.json({ orders: listAllOrders(80) })
}
