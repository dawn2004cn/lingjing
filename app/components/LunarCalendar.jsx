'use client'
import { useState, useRef, useEffect, useMemo, useCallback, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

/* =========================================================
 *  LUNAR DATA  (1900-2100)
 *  Each entry encodes month lengths (29/30) in bits 0-11,
 *  leap month index in bits 16-19, and leap month big/small
 *  in bit 20.
 * ========================================================= */
const LUNAR_INFO = [
0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,
0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a4d0,0x0d150,0x0f252,
0x0d520,
]

const HEAVENLY_STEMS = '甲乙丙丁戊己庚辛壬癸'
const EARTHLY_BRANCHES = '子丑寅卯辰巳午未申酉戌亥'
const LUNAR_MONTHS = ['正','二','三','四','五','六','七','八','九','十','冬','腊']
const LUNAR_DAYS_NAME = [
  '初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
  '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
  '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十',
]

const ANIMALS = '鼠牛虎兔龙蛇马羊猴鸡狗猪'

function lYearDays(y) {
  let sum = 348
  for (let i = 0x8000; i > 0x8; i >>= 1) sum += (LUNAR_INFO[y - 1900] & i) ? 1 : 0
  return sum + leapDays(y)
}

function leapMonth(y) {
  return LUNAR_INFO[y - 1900] & 0xf
}

function leapDays(y) {
  if (leapMonth(y)) return (LUNAR_INFO[y - 1900] & 0x10000) ? 30 : 29
  return 0
}

function monthDays(y, m) {
  return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29
}

/**
 * Solar -> Lunar conversion
 * Returns { year, month, day, isLeap, monthStr, dayStr, ganZhiYear, animal }
 */
export function solarToLunar(sy, sm, sd) {
  if (sy < 1900 || sy > 2100) return null
  let offset = Math.floor((Date.UTC(sy, sm - 1, sd) - Date.UTC(1900, 0, 31)) / 86400000)
  if (offset < 0) return null

  let ly = 1900
  for (; ly < 2101 && offset > 0; ly++) {
    const daysInYear = lYearDays(ly)
    if (offset < daysInYear) break
    offset -= daysInYear
  }

  let lm = 1, isLeap = false
  const leapM = leapMonth(ly)
  for (; lm < 13 && offset > 0; lm++) {
    let days
    if (leapM > 0 && lm === leapM + 1 && !isLeap) {
      --lm; isLeap = true; days = leapDays(ly)
    } else {
      days = monthDays(ly, lm)
    }
    if (isLeap && lm === leapM + 1) isLeap = false
    if (offset < days) break
    offset -= days
  }

  const ld = offset + 1
  const stemIdx = (ly - 4) % 10
  const branchIdx = (ly - 4) % 12

  return {
    year: ly,
    month: lm,
    day: ld,
    isLeap,
    monthStr: (isLeap ? '闰' : '') + LUNAR_MONTHS[lm - 1] + '月',
    dayStr: LUNAR_DAYS_NAME[ld - 1],
    ganZhiYear: HEAVENLY_STEMS[stemIdx] + EARTHLY_BRANCHES[branchIdx],
    animal: ANIMALS[branchIdx],
  }
}

/**
 * Lunar -> Solar conversion
 */
export function lunarToSolar(ly, lm, ld, isLeap = false) {
  if (ly < 1900 || ly > 2100) return null
  let offset = 0
  for (let y = 1900; y < ly; y++) offset += lYearDays(y)
  const leapM = leapMonth(ly)
  let leap = false
  for (let m = 1; m < lm; m++) {
    if (!leap && leapM > 0 && m === leapM) {
      offset += leapDays(ly)
      leap = true
    }
    offset += monthDays(ly, m)
  }
  if (isLeap && lm === leapM) offset += monthDays(ly, lm)
  offset += ld - 1 + 30  // 30 = Jan31 - Jan1 in 1900 base
  const d = new Date(Date.UTC(1900, 0, 31))
  d.setUTCDate(d.getUTCDate() + offset)
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

/* ========= CALENDAR HELPERS ========= */
function getDaysInMonth(y, m) {
  return new Date(y, m, 0).getDate()
}

function getFirstDayOfWeek(y, m) {
  return new Date(y, m - 1, 1).getDay()
}

const WEEKDAYS = ['日','一','二','三','四','五','六']

/* =========================================================
 *  LunarCalendar Component
 * ========================================================= */
export default function LunarCalendar({ value, onChange, calendarType = '公历' }) {
  const today = new Date()
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(value ? parseInt(value.split('-')[0]) : today.getFullYear())
  const [viewMonth, setViewMonth] = useState(value ? parseInt(value.split('-')[1]) : today.getMonth() + 1)
  const [showYearPicker, setShowYearPicker] = useState(false)
  const [coords, setCoords] = useState(null)
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => { setMounted(true) }, [])

  const updatePosition = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const width = Math.max(rect.width, 320)
    const gap = 8
    const preferredTop = rect.bottom + gap
    const dropdownH = dropdownRef.current?.offsetHeight || 360
    const spaceBelow = window.innerHeight - preferredTop
    const spaceAbove = rect.top - gap
    const openUp = spaceBelow < dropdownH && spaceAbove > spaceBelow
    let top = openUp ? rect.top - gap - dropdownH : preferredTop
    let left = rect.left

    // Keep within viewport horizontally
    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - width - 12)
    }
    if (left < 12) left = 12

    // Keep within viewport vertically
    if (top < 12) top = 12
    if (top + dropdownH > window.innerHeight - 12) {
      top = Math.max(12, window.innerHeight - dropdownH - 12)
    }

    setCoords({ top, left, width, openUp })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    const onScroll = () => updatePosition()
    const onResize = () => updatePosition()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, showYearPicker, viewYear, viewMonth, updatePosition])

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      const t = e.target
      if (triggerRef.current?.contains(t)) return
      if (dropdownRef.current?.contains(t)) return
      setOpen(false)
      setShowYearPicker(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setShowYearPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Build calendar grid
  const calendarGrid = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth)
    const startDay = getFirstDayOfWeek(viewYear, viewMonth)
    const prevMonthDays = getDaysInMonth(viewYear, viewMonth === 1 ? 12 : viewMonth - 1)
    const cells = []

    // Previous month trailing days
    for (let i = startDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i
      const pm = viewMonth === 1 ? 12 : viewMonth - 1
      const py = viewMonth === 1 ? viewYear - 1 : viewYear
      const lunar = solarToLunar(py, pm, day)
      cells.push({ day, month: pm, year: py, current: false, lunar })
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const lunar = solarToLunar(viewYear, viewMonth, d)
      cells.push({ day: d, month: viewMonth, year: viewYear, current: true, lunar })
    }

    // Next month leading days
    const remaining = 42 - cells.length
    for (let d = 1; d <= remaining; d++) {
      const nm = viewMonth === 12 ? 1 : viewMonth + 1
      const ny = viewMonth === 12 ? viewYear + 1 : viewYear
      const lunar = solarToLunar(ny, nm, d)
      cells.push({ day: d, month: nm, year: ny, current: false, lunar })
    }

    return cells
  }, [viewYear, viewMonth])

  const prevMonth = useCallback(() => {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) }
    else setViewMonth(m => m - 1)
  }, [viewMonth])

  const nextMonth = useCallback(() => {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) }
    else setViewMonth(m => m + 1)
  }, [viewMonth])

  const selectDate = useCallback((cell) => {
    const dateStr = `${cell.year}-${String(cell.month).padStart(2,'0')}-${String(cell.day).padStart(2,'0')}`
    onChange(dateStr)
    setOpen(false)
    setShowYearPicker(false)
    if (!cell.current) {
      setViewYear(cell.year)
      setViewMonth(cell.month)
    }
  }, [onChange])

  // Parse selected
  const selectedParts = value ? value.split('-').map(Number) : null

  const isSelected = (cell) =>
    selectedParts && cell.year === selectedParts[0] && cell.month === selectedParts[1] && cell.day === selectedParts[2]

  const isToday = (cell) =>
    cell.year === today.getFullYear() && cell.month === today.getMonth() + 1 && cell.day === today.getDate()

  // Display value
  const displayText = useMemo(() => {
    if (!value) return ''
    const [y, m, d] = value.split('-').map(Number)
    const lunar = solarToLunar(y, m, d)
    if (!lunar) return value
    if (calendarType === '农历') {
      return `${lunar.ganZhiYear}年 ${lunar.monthStr}${lunar.dayStr}`
    }
    return `${y}年${m}月${d}日 (${lunar.monthStr}${lunar.dayStr})`
  }, [value, calendarType])

  // Year picker range
  const yearStart = Math.floor(viewYear / 12) * 12
  const yearRange = Array.from({ length: 12 }, (_, i) => yearStart + i).filter(y => y >= 1900 && y <= 2100)

  const dropdown = open && mounted && coords && createPortal(
    <div
      ref={dropdownRef}
      className="lunar-calendar-dropdown animate-slide-up"
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        width: coords.width,
        zIndex: 9999,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--line)]">
        <button type="button" onClick={prevMonth} className="cal-nav-btn">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button type="button" onClick={() => setShowYearPicker(s => !s)} className="text-sm font-semibold text-[#fff6e2] hover:text-[var(--gold-bright)] transition-colors">
          {viewYear}年 {viewMonth}月
        </button>
        <button type="button" onClick={nextMonth} className="cal-nav-btn">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {showYearPicker ? (
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => setViewYear(y => Math.max(1900, yearStart - 12))} className="cal-nav-btn">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-xs text-[rgba(245,234,210,0.6)]">{yearRange[0]} - {yearRange[yearRange.length-1]}</span>
            <button type="button" onClick={() => setViewYear(y => Math.min(2100, yearStart + 12))} className="cal-nav-btn">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5 mb-4">
            {yearRange.map(y => (
              <button key={y} type="button" onClick={() => setViewYear(y)}
                className={`py-1.5 rounded text-xs font-medium transition-colors ${y === viewYear ? 'bg-[var(--gold)] text-[#140d05]' : 'text-[rgba(245,234,210,0.65)] hover:text-[#fff6e2] hover:bg-[rgba(245,234,210,0.06)]'}`}>
                {y}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({length:12},(_,i)=>i+1).map(m => (
              <button key={m} type="button" onClick={() => { setViewMonth(m); setShowYearPicker(false) }}
                className={`py-1.5 rounded text-xs font-medium transition-colors ${m === viewMonth ? 'bg-[var(--gold)] text-[#140d05]' : 'text-[rgba(245,234,210,0.65)] hover:text-[#fff6e2] hover:bg-[rgba(245,234,210,0.06)]'}`}>
                {m}月
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-2">
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(w => (
              <div key={w} className="text-center text-[0.65rem] text-[rgba(245,234,210,0.45)] py-1 font-medium">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarGrid.map((cell, idx) => {
              const sel = isSelected(cell)
              const tod = isToday(cell)
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectDate(cell)}
                  className={`
                    cal-day-cell group
                    ${!cell.current ? 'opacity-30' : ''}
                    ${sel ? 'cal-day-selected' : ''}
                    ${tod && !sel ? 'cal-day-today' : ''}
                  `}
                >
                  <span className="text-[0.82rem] leading-none">{cell.day}</span>
                  {cell.lunar && (
                    <span className={`text-[0.58rem] leading-none mt-0.5 ${sel ? 'text-[#140d05]/70' : 'text-[rgba(245,234,210,0.38)]'}`}>
                      {cell.lunar.day === 1 ? cell.lunar.monthStr : cell.lunar.dayStr}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="px-3 py-2 border-t border-[var(--line)] flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            const y = today.getFullYear()
            const m = today.getMonth() + 1
            const d = today.getDate()
            setViewYear(y)
            setViewMonth(m)
            onChange(`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`)
            setOpen(false)
            setShowYearPicker(false)
          }}
          className="text-[0.7rem] text-[var(--gold-bright)] hover:text-[#fff6e2] transition-colors font-medium"
        >
          今天
        </button>
        {value && (
          <span className="text-[0.65rem] text-[rgba(245,234,210,0.45)]">
            {(() => { const [y,m,d] = value.split('-').map(Number); const l = solarToLunar(y,m,d); return l ? `${l.ganZhiYear} ${l.animal}年` : '' })()}
          </span>
        )}
      </div>
    </div>,
    document.body,
  )

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen((o) => {
            const next = !o
            if (next) {
              // position will be set in layout effect; seed coords immediately
              const rect = triggerRef.current?.getBoundingClientRect()
              if (rect) {
                setCoords({
                  top: rect.bottom + 8,
                  left: rect.left,
                  width: Math.max(rect.width, 320),
                  openUp: false,
                })
              }
            }
            return next
          })
          setShowYearPicker(false)
        }}
        className="input-base text-left flex items-center justify-between gap-2 cursor-pointer"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className={value ? 'text-[#fff6e2]' : 'text-[rgba(185,169,133,0.45)]'}>
          {displayText || '选择出生日期'}
        </span>
        <svg className="w-4 h-4 flex-shrink-0 text-[var(--gold)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      </button>
      {dropdown}
    </div>
  )
}