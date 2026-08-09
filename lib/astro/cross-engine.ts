/**
 * 跨引擎交叉校验：主引擎 lunar-javascript / iztro
 * 对照引擎 tyme4ts（同作者升级库，可切换晚子流派）
 */

import {
  SolarTime,
  SolarDay,
  LunarDay,
  LunarHour,
  LunarSect2EightCharProvider,
  DefaultEightCharProvider,
} from 'tyme4ts'
import type { SixtyCycle } from 'tyme4ts'
import { Lunar } from 'lunar-javascript'
import { buildBaziChart, type BaziChart, type BaziFormInput } from '@/lib/bazi/engine'
import type { FormBirthInput } from '@/lib/ziwei'

export type CrossStatus = 'match' | 'sect_diff' | 'mismatch' | 'partial' | 'skipped'

export interface PillarCross {
  primary: string
  tymeDefault: string
  tymeSect2: string
  matchDefault: boolean
  matchSect2: boolean
  /** 与任一 tyme 流派一致 */
  aligned: boolean
}

export interface LunarCross {
  primaryLabel: string
  tymeLabel: string
  /** 比较月日数字（忽略年干支表述差异） */
  matchMonthDay: boolean
  primaryMonth: number
  primaryDay: number
  tymeMonth: number
  tymeDay: number
  leapMatch: boolean | null
}

export interface CrossEngineReport {
  status: CrossStatus
  engines: { primary: string; secondary: string }
  solar: { year: number; month: number; day: number; hour: number; minute: number }
  pillars: PillarCross
  lunar: LunarCross | null
  /** 主引擎日柱流派（1=换日，2=不跨日） */
  daySect: 1 | 2 | null
  notes: string[]
  summary: string
}

function sixtyName(sc: SixtyCycle): string {
  return sc.getName()
}

function eightCharSnap(ec: {
  getYear: () => SixtyCycle
  getMonth: () => SixtyCycle
  getDay: () => SixtyCycle
  getHour: () => SixtyCycle
}): string {
  return [
    sixtyName(ec.getYear()),
    sixtyName(ec.getMonth()),
    sixtyName(ec.getDay()),
    sixtyName(ec.getHour()),
  ].join(' ')
}

function withTymeProvider<T>(provider: 'default' | 'sect2', fn: () => T): T {
  const prev = LunarHour.provider
  LunarHour.provider =
    provider === 'sect2' ? new LunarSect2EightCharProvider() : new DefaultEightCharProvider()
  try {
    return fn()
  } finally {
    LunarHour.provider = prev
  }
}

export function tymePillarsAt(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  sect: 'default' | 'sect2' = 'default',
): string {
  return withTymeProvider(sect, () => {
    const ec = SolarTime.fromYmdHms(year, month, day, hour, minute, 0)
      .getLunarHour()
      .getEightChar()
    return eightCharSnap(ec)
  })
}

function primaryPillarSnap(chart: BaziChart): string {
  const p = chart.pillars
  return [p.year.ganZhi, p.month.ganZhi, p.day.ganZhi, p.time.ganZhi].join(' ')
}

/** 从 lunar-javascript 农历文案提取月日数字，如「一九九〇年四月廿一」「一九九九年冬月廿五」 */
export function parseLunarMonthDayFromLj(label: string): {
  month: number
  day: number
  leap: boolean
} | null {
  const leap = label.includes('闰')
  const md = label.match(
    /闰?(十[一二]|冬|腊|[正一二三四五六七八九十]+)月(初[一二三四五六七八九十]|十[一二三四五六七八九]|二十|卅|[廿三][一二三四五六七八九]?|三十)/,
  )
  if (!md) return null
  const monthMap: Record<string, number> = {
    正: 1, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6,
    七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 十二: 12,
    冬: 11, 腊: 12,
  }
  const month = monthMap[md[1]]
  if (month == null) return null
  const day = chineseDayToNumber(md[2])
  if (day == null) return null
  return { month, day, leap }
}

function chineseDayToNumber(s: string): number | null {
  const map: Record<string, number> = {
    初一: 1, 初二: 2, 初三: 3, 初四: 4, 初五: 5, 初六: 6, 初七: 7, 初八: 8, 初九: 9, 初十: 10,
    十一: 11, 十二: 12, 十三: 13, 十四: 14, 十五: 15, 十六: 16, 十七: 17, 十八: 18, 十九: 19, 二十: 20,
    廿一: 21, 廿二: 22, 廿三: 23, 廿四: 24, 廿五: 25, 廿六: 26, 廿七: 27, 廿八: 28, 廿九: 29, 三十: 30,
    卅: 30,
  }
  if (map[s] != null) return map[s]
  // 廿一 等已覆盖；兜底「二十」「卅」
  return null
}

function crossLunar(
  year: number,
  month: number,
  day: number,
  primaryLunarLabel: string,
): LunarCross | null {
  try {
    const tyme = SolarDay.fromYmd(year, month, day).getLunarDay()
    const tymeMonth = tyme.getMonth()
    const tymeDay = tyme.getDay()
    const tymeLeap = tymeMonth < 0
    const tymeMonthAbs = Math.abs(tymeMonth)
    const parsed = parseLunarMonthDayFromLj(primaryLunarLabel)
    if (!parsed) {
      return {
        primaryLabel: primaryLunarLabel,
        tymeLabel: tyme.toString(),
        matchMonthDay: false,
        primaryMonth: 0,
        primaryDay: 0,
        tymeMonth: tymeMonthAbs,
        tymeDay,
        leapMatch: null,
      }
    }
    return {
      primaryLabel: primaryLunarLabel,
      tymeLabel: tyme.toString(),
      matchMonthDay: parsed.month === tymeMonthAbs && parsed.day === tymeDay,
      primaryMonth: parsed.month,
      primaryDay: parsed.day,
      tymeMonth: tymeMonthAbs,
      tymeDay,
      leapMatch: parsed.leap === tymeLeap,
    }
  } catch {
    return null
  }
}

function buildReport(
  chart: BaziChart,
  notesExtra: string[] = [],
): CrossEngineReport {
  const { year, month, day, hour, minute } = chart.solar
  const primary = primaryPillarSnap(chart)
  const tymeDefault = tymePillarsAt(year, month, day, hour, minute, 'default')
  const tymeSect2 = tymePillarsAt(year, month, day, hour, minute, 'sect2')
  const matchDefault = primary === tymeDefault
  const matchSect2 = primary === tymeSect2
  const aligned = matchDefault || matchSect2

  const lunar = crossLunar(year, month, day, chart.lunar)
  const notes: string[] = [...notesExtra]

  if (matchDefault && matchSect2) {
    notes.push('四柱与 tyme4ts 默认/流派2 均一致')
  } else if (matchSect2 && !matchDefault) {
    notes.push('四柱与 tyme4ts 流派2（23:00后日柱不跨日）一致；与默认流派（23:00后换日柱）不同 — 属已知流派差')
  } else if (matchDefault && !matchSect2) {
    notes.push('四柱与 tyme4ts 默认流派（23:00后换日柱）一致；与流派2不同 — 属已知流派差')
  } else {
    notes.push(`四柱不一致：主引擎=${primary}；tyme默认=${tymeDefault}；tyme流派2=${tymeSect2}`)
  }

  if (lunar) {
    if (lunar.matchMonthDay) notes.push('农历月日与 tyme4ts 一致')
    else notes.push(`农历月日差异：主=${lunar.primaryLabel}；tyme=${lunar.tymeLabel}`)
  }

  let status: CrossStatus
  if (aligned && (!lunar || lunar.matchMonthDay)) status = 'match'
  else if (aligned && lunar && !lunar.matchMonthDay) status = 'partial'
  else status = 'mismatch'

  // 仅对齐其中一个 tyme 流派 → 标记为流派差（非硬失败）
  if ((matchSect2 && !matchDefault) || (matchDefault && !matchSect2)) {
    status = lunar && !lunar.matchMonthDay ? 'partial' : 'sect_diff'
  }

  const summary =
    status === 'match'
      ? '跨引擎校验通过（lunar-javascript ↔ tyme4ts）'
      : status === 'sect_diff'
        ? matchSect2 && !matchDefault
          ? '跨引擎：23:00后日柱属流派差，已与 tyme 流派2（不跨日）对齐'
          : matchDefault && !matchSect2
            ? '跨引擎：23:00后日柱属流派差，已与 tyme 默认流派（换日）对齐'
            : '跨引擎：日柱属流派差'
        : status === 'partial'
          ? '跨引擎部分一致，请核对照注'
          : status === 'mismatch'
            ? '跨引擎校验未通过，请人工复核'
            : '未执行跨引擎校验'

  const daySect: 1 | 2 | null = chart.daySect?.sect === 1 ? 1 : chart.daySect?.sect === 2 ? 2 : null
  if (daySect === 1) notes.push('本盘日柱口径：流派1（23:00后换日）')
  else if (daySect === 2) notes.push('本盘日柱口径：流派2（23:00后不跨日）')

  return {
    status,
    engines: { primary: 'lunar-javascript', secondary: 'tyme4ts' },
    solar: { year, month, day, hour, minute },
    pillars: {
      primary,
      tymeDefault,
      tymeSect2,
      matchDefault,
      matchSect2,
      aligned,
    },
    lunar,
    daySect,
    notes,
    summary,
  }
}

/** 写入规则解读 / LLM prompt，使交叉结果成为可引用事实 */
export function formatCrossCheckForPrompt(report: CrossEngineReport): string {
  const lines = [
    '## 跨引擎交叉校验（算法事实）',
    `- 状态：${report.status}`,
    `- ${report.summary}`,
    `- 引擎：${report.engines.primary} ↔ ${report.engines.secondary}`,
    `- 主引擎四柱：${report.pillars.primary}`,
  ]
  if (report.daySect === 1) {
    lines.push('- 日柱流派：流派1（23:00后换日）')
  } else if (report.daySect === 2) {
    lines.push('- 日柱流派：流派2（23:00后不跨日）')
  }
  if (!report.pillars.matchDefault) {
    lines.push(`- tyme4ts 默认：${report.pillars.tymeDefault}`)
  }
  if (report.status === 'sect_diff') {
    if (report.pillars.matchSect2 && !report.pillars.matchDefault) {
      lines.push(`- tyme4ts 流派2：${report.pillars.tymeSect2}`)
      lines.push('- 说明：本盘采用「不跨日」口径（流派2）。润色时须提示用户，勿武断改日柱。')
    } else if (report.pillars.matchDefault && !report.pillars.matchSect2) {
      lines.push(`- tyme4ts 默认：${report.pillars.tymeDefault}`)
      lines.push('- 说明：本盘采用「23:00后换日」口径（流派1）。润色时须提示用户，勿武断改日柱。')
    }
  }
  if (report.lunar) {
    lines.push(
      `- 农历对照：${report.lunar.matchMonthDay ? '月日一致' : '月日存疑'}（主 ${report.lunar.primaryLabel} / tyme ${report.lunar.tymeLabel}）`,
    )
  }
  for (const n of report.notes.slice(0, 4)) {
    lines.push(`- ${n}`)
  }
  if (report.status === 'mismatch') {
    lines.push('- 警告：两引擎四柱未对齐，解读须标注「待人工复核」，不得假装确定。')
  }
  return lines.join('\n')
}

/** 八字：用已排好的主盘与 tyme 对照 */
export function crossCheckBaziChart(chart: BaziChart): CrossEngineReport {
  return buildReport(chart)
}

/** 八字：从表单重排再对照 */
export function crossCheckBaziInput(input: BaziFormInput): CrossEngineReport {
  return buildReport(buildBaziChart(input))
}

/**
 * 紫微：用同一公历时刻的八字旁证 + 农历对照
 * （紫微盘本身仍以 iztro 为准；此处校验历法底座）
 */
export function crossCheckZiweiCalendar(
  input: FormBirthInput,
  opts?: { solarHint?: { year: number; month: number; day: number; hour: number; minute: number } },
): CrossEngineReport {
  const chart = buildBaziChart({
    ...(input as BaziFormInput),
    daySect: input.daySect === 1 ? 1 : 2,
  })
  const notes = [
    '紫微主盘引擎：iztro；历法/四柱旁证：lunar-javascript ↔ tyme4ts',
    `紫微旁证日柱流派与表单一致：流派${input.daySect === 1 ? '1（换日）' : '2（不跨日）'}`,
  ]
  if (opts?.solarHint) {
    const a = opts.solarHint
    const b = chart.solar
    if (a.year !== b.year || a.month !== b.month || a.day !== b.day) {
      notes.push(
        `紫微解析日与八字旁证日不一致：ziwei=${a.year}-${a.month}-${a.day} bazi=${b.year}-${b.month}-${b.day}`,
      )
    }
  }
  return buildReport(chart, notes)
}

/** 农历→公历：两引擎是否同日 */
export function crossCheckLunarToSolar(
  lunarYear: number,
  lunarMonth: number,
  lunarDay: number,
  isLeap: boolean,
): { match: boolean; primary: string; tyme: string } {
  const lm = isLeap ? -Math.abs(lunarMonth) : lunarMonth
  const solar = Lunar.fromYmd(lunarYear, lm, lunarDay).getSolar()
  const primary = `${solar.getYear()}-${solar.getMonth()}-${solar.getDay()}`
  const ty = LunarDay.fromYmd(lunarYear, lm, lunarDay).getSolarDay()
  const tyme = `${ty.getYear()}-${ty.getMonth()}-${ty.getDay()}`
  return { match: primary === tyme, primary, tyme }
}
