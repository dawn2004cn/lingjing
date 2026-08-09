import { getAuthUser } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { computePrecisionFlags } from '@/lib/astro/precision-flags'

const CROSS_STATUSES = new Set(['match', 'sect_diff', 'partial', 'mismatch', 'skipped'])

export async function GET() {
  const user = getAuthUser()
  if (!user?.id) {
    return Response.json({ error: '请先登录' }, { status: 401 })
  }

  const db = getDb()
  const records = db
    .prepare(
      `SELECT id, name, gender, calendar_type, birth_date, birth_hour, birth_clock,
              is_leap_month, use_true_solar, province, city, day_sect,
              boundary_hour, boundary_jieqi, true_solar_shift, cross_status, system, created_at
       FROM fortune_records
       WHERE user_id = ?
       ORDER BY datetime(created_at) DESC
       LIMIT 80`,
    )
    .all(user.id)

  return Response.json({ records })
}

export async function POST(req) {
  const user = getAuthUser()
  if (!user?.id) {
    return Response.json({ error: '请先登录' }, { status: 401 })
  }

  const body = await req.json()
  const {
    name,
    gender,
    calendarType,
    birthDate,
    birthHour,
    birthClock,
    isLeapMonth,
    useTrueSolar,
    province,
    city,
    daySect,
    system: systemType = 'bazi',
  } = body

  const hour = birthHour || birthClock
  if (!name || !birthDate || !hour) {
    return Response.json({ error: '参数不完整' }, { status: 400 })
  }

  const system = systemType === 'ziwei' ? 'ziwei' : 'bazi'
  const sect = Number(daySect) === 1 ? 1 : 2
  const flags = computePrecisionFlags({
    gender,
    calendarType,
    birthDate,
    birthHour,
    birthClock,
    isLeapMonth,
    useTrueSolar,
    province,
    city,
    daySect: sect,
  })
  const crossStatus = CROSS_STATUSES.has(flags.crossStatus) ? flags.crossStatus : 'skipped'

  const db = getDb()
  db.prepare(`
    INSERT INTO fortune_records (
      user_id, name, gender, calendar_type, birth_date, birth_hour, system,
      birth_clock, is_leap_month, use_true_solar, province, city, day_sect,
      boundary_hour, boundary_jieqi, true_solar_shift, cross_status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    user.id,
    name,
    gender,
    calendarType || '公历',
    birthDate,
    hour,
    system,
    birthClock || null,
    isLeapMonth ? 1 : 0,
    useTrueSolar ? 1 : 0,
    province || null,
    city || null,
    sect,
    flags.boundaryHour ? 1 : 0,
    flags.boundaryJieqi ? 1 : 0,
    flags.trueSolarShift ? 1 : 0,
    crossStatus,
  )

  return Response.json({
    ok: true,
    precision: {
      boundaryHour: flags.boundaryHour,
      boundaryJieqi: flags.boundaryJieqi,
      trueSolarShift: flags.trueSolarShift,
      crossStatus,
    },
  })
}
