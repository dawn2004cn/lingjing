import { getAuthUser } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { getCitationStats } from '@/lib/astro/accuracy-events'

function pct(part, total) {
  if (!total) return 0
  return Math.round((part / total) * 1000) / 10
}

export async function GET() {
  const user = getAuthUser()
  if (!user || user.role !== 'admin') {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const db = getDb()

  const { count: totalVisits } = db.prepare('SELECT COUNT(*) as count FROM page_visits').get()
  const { count: todayVisits } = db.prepare(
    "SELECT COUNT(*) as count FROM page_visits WHERE date(visitedAt) = date('now')",
  ).get()
  const { count: totalRecords } = db.prepare('SELECT COUNT(*) as count FROM fortune_records').get()
  const { count: todayRecords } = db.prepare(
    "SELECT COUNT(*) as count FROM fortune_records WHERE date(created_at) = date('now')",
  ).get()
  const { count: totalUsers } = db.prepare('SELECT COUNT(*) as count FROM users').get()

  const recentRecords = db.prepare(`
    SELECT f.id, f.name, f.gender, f.calendar_type, f.birth_date, f.birth_hour,
           f.birth_clock, f.system, f.is_leap_month, f.use_true_solar,
           f.province, f.city, f.day_sect, f.boundary_hour, f.boundary_jieqi,
           f.true_solar_shift, f.cross_status, f.created_at, u.username
    FROM fortune_records f
    LEFT JOIN users u ON f.user_id = u.id
    ORDER BY f.created_at DESC
    LIMIT 50
  `).all()

  const row = (sql) => db.prepare(sql).get()
  const withClock = row(`SELECT COUNT(*) as c FROM fortune_records WHERE birth_clock IS NOT NULL AND birth_clock != ''`).c
  const trueSolar = row(`SELECT COUNT(*) as c FROM fortune_records WHERE use_true_solar = 1`).c
  const trueSolarShift = row(`SELECT COUNT(*) as c FROM fortune_records WHERE true_solar_shift = 1`).c
  const leap = row(`SELECT COUNT(*) as c FROM fortune_records WHERE is_leap_month = 1`).c
  const sect1 = row(`SELECT COUNT(*) as c FROM fortune_records WHERE day_sect = 1`).c
  const sect2 = row(`SELECT COUNT(*) as c FROM fortune_records WHERE COALESCE(day_sect, 2) = 2`).c
  const bazi = row(`SELECT COUNT(*) as c FROM fortune_records WHERE system = 'bazi' OR system IS NULL OR system = ''`).c
  const ziwei = row(`SELECT COUNT(*) as c FROM fortune_records WHERE system = 'ziwei'`).c
  const lunarCal = row(`SELECT COUNT(*) as c FROM fortune_records WHERE calendar_type = '农历'`).c
  const boundaryHour = row(`SELECT COUNT(*) as c FROM fortune_records WHERE boundary_hour = 1`).c
  const boundaryJieqi = row(`SELECT COUNT(*) as c FROM fortune_records WHERE boundary_jieqi = 1`).c
  const crossMatch = row(`SELECT COUNT(*) as c FROM fortune_records WHERE cross_status = 'match'`).c
  const crossSect = row(`SELECT COUNT(*) as c FROM fortune_records WHERE cross_status = 'sect_diff'`).c
  const crossMismatch = row(`SELECT COUNT(*) as c FROM fortune_records WHERE cross_status = 'mismatch'`).c
  const crossPartial = row(`SELECT COUNT(*) as c FROM fortune_records WHERE cross_status = 'partial'`).c
  const needsBackfill = row(`SELECT COUNT(*) as c FROM fortune_records WHERE COALESCE(cross_status, 'skipped') = 'skipped'`).c

  const mismatchRecords = db.prepare(`
    SELECT f.id, f.name, f.gender, f.calendar_type, f.birth_date, f.birth_hour,
           f.birth_clock, f.system, f.day_sect, f.cross_status, f.created_at, u.username
    FROM fortune_records f
    LEFT JOIN users u ON f.user_id = u.id
    WHERE f.cross_status = 'mismatch'
    ORDER BY f.created_at DESC
    LIMIT 20
  `).all()

  const accuracy = {
    withClock,
    withClockPct: pct(withClock, totalRecords),
    trueSolar,
    trueSolarPct: pct(trueSolar, totalRecords),
    trueSolarShift,
    trueSolarShiftPct: pct(trueSolarShift, totalRecords),
    leapMonth: leap,
    leapMonthPct: pct(leap, totalRecords),
    daySect1: sect1,
    daySect2: sect2,
    daySect1Pct: pct(sect1, totalRecords),
    daySect2Pct: pct(sect2, totalRecords),
    systemBazi: bazi,
    systemZiwei: ziwei,
    lunarCalendar: lunarCal,
    lunarCalendarPct: pct(lunarCal, totalRecords),
    boundaryHour,
    boundaryHourPct: pct(boundaryHour, totalRecords),
    boundaryJieqi,
    boundaryJieqiPct: pct(boundaryJieqi, totalRecords),
    crossMatch,
    crossMatchPct: pct(crossMatch, totalRecords),
    crossSect,
    crossSectPct: pct(crossSect, totalRecords),
    crossMismatch,
    crossMismatchPct: pct(crossMismatch, totalRecords),
    crossPartial,
    needsBackfill,
    citation: getCitationStats(),
  }

  return Response.json({
    totalVisits,
    todayVisits,
    totalRecords,
    todayRecords,
    totalUsers,
    recentRecords,
    mismatchRecords,
    accuracy,
  })
}
