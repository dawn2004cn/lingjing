/**
 * 黄金用例回归：时辰索引 / 真太阳时 / 闰月 / 八字柱位 / 早晚子
 * 运行：npm run test:astro
 */

import { clockToTimeIndex, parseTimeIndexFromHourLabel } from '../lib/astro/time-index'
import { correctTrueSolarTime } from '../lib/astro/true-solar'
import { auditZiweiChartIntegrity } from '../lib/astro/ziwei-integrity'
import { getAdapter, listSystems, isValidSystemId } from '../lib/divination/registry'
import { detectZipingPatterns } from '../lib/bazi/ziping'
import { takeSanChuan } from '../lib/daliuren/engine'
import { listClassicsBySystem } from '../lib/knowledge/divination-classics'
import { listEncyclopedia } from '../lib/knowledge/divination-encyclopedia'
import { countStrokes } from '../lib/meihua/engine'
import { fetchPyEngine } from '../lib/divination/py-engine-client'
import { findCityLongitude } from '../lib/ziwei/cities'
import { buildBaziChart } from '../lib/bazi/engine'
import { buildBaziRuleReading } from '../lib/bazi/rule-reading'
import { buildChartWithPatterns } from '../lib/ziwei'
import { buildOverlay } from '../lib/ziwei/overlay'
import { buildZiweiRuleReading } from '../lib/ziwei/rule-reading'
import { buildHemingMatrix, formatHemingMatrixForPrompt } from '../lib/ziwei/heming-matrix'
import { buildYunshiReport, buildLifeKLine } from '../lib/ziwei/yunshi'
import { probeTimeBoundary } from '../lib/astro/boundary'
import { buildDualBoundary } from '../lib/astro/dual-boundary'
import {
  BAZI_GOLDEN,
  ZIWEI_GOLDEN,
  TRUE_SOLAR_HARD,
  BOUNDARY_DUAL_CASE,
  BOUNDARY_DUAL_CASES,
  JIEQI_GOLDEN,
} from '../lib/astro/golden-cases'
import { TIEBAN_GOLDEN, XIAOLIUREN_GOLDEN, QIMEN_WITNESS_GOLDEN, BAZI_TIAOHOU_GOLDEN, DALIUREN_GOLDEN, JINKOU_GOLDEN, MEIHUA_GOLDEN } from '../lib/astro/divination-golden'
import { parseWitnessJu } from '../lib/qimen/witness'
import { compareDaliurenSidecar, compareJinkouSidecar } from '../lib/divination/py-engine-client'
import {
  crossCheckBaziInput,
  crossCheckLunarToSolar,
  crossCheckZiweiCalendar,
  tymePillarsAt,
  formatCrossCheckForPrompt,
} from '../lib/astro/cross-engine'
import { probeJieQiBoundary, formatJieQiForPrompt } from '../lib/astro/jieqi-boundary'
import { auditMonthJieQiYear } from '../lib/astro/jieqi-year-audit'
import { computePrecisionFlags, birthInputFromRecord } from '../lib/astro/precision-flags'
import { citationRiskScore, extractStarPalaceClaims, buildZiweiCitationFacts, buildBaziCitationFacts, withZiweiPatterns } from '../lib/astro/citation-guard'
import { buildNatalLaiYin, buildNatalFeihuaChain, buildDaXianFeihuaChain, buildLiuNianFeihuaChain } from '../lib/ziwei/overlay'
import { Lunar } from 'lunar-javascript'

let failed = 0

function assert(name: string, cond: boolean, detail = '') {
  if (cond) {
    console.log(`  ✓ ${name}`)
  } else {
    failed++
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

console.log('\n=== 1. timeIndex 映射 ===')
assert('00:30 → 早子(0)', clockToTimeIndex(0, 30) === 0)
assert('23:30 → 晚子(12)', clockToTimeIndex(23, 30) === 12)
assert('12:00 → 午(6)', clockToTimeIndex(12, 0) === 6)
assert('标签 早子时', parseTimeIndexFromHourLabel('早子时 00:00-01:00') === 0)
assert('标签 晚子时', parseTimeIndexFromHourLabel('晚子时 23:00-00:00') === 12)
assert('旧子时+lateZi', parseTimeIndexFromHourLabel('子时 23:00-01:00', true) === 12)
assert('旧子时默认早子', parseTimeIndexFromHourLabel('子时 23:00-01:00', false) === 0)

console.log('\n=== 2. 真太阳时跨时辰 ===')
{
  // 乌鲁木齐约 87.6°E，相对 120° 约 -129.6 分钟，足以跨界
  const lon = findCityLongitude('新疆维吾尔自治区', '乌鲁木齐')
    ?? findCityLongitude('新疆', '乌鲁木齐')
  assert('乌鲁木齐经度可解析', lon != null && lon! < 100, `lon=${lon}`)
  if (lon != null) {
    // 民用 11:10 接近午时起点边界；西移后可能掉到巳
    const r = correctTrueSolarTime({
      year: 1990, month: 6, day: 15, hour: 11, minute: 10, longitude: lon,
    })
    assert('校正分钟为负（西经向）', r.totalCorrectionMin < -100, `corr=${r.totalCorrectionMin}`)
    assert('可能跨时辰', typeof r.changedTimeIndex === 'boolean')
  }
}

console.log('\n=== 3. 农历闰月 ===')
{
  // 2020 闰四月：Lunar.fromYmd(2020, -4, 1) 应能转公历
  try {
    const lunar = Lunar.fromYmd(2020, -4, 1)
    const solar = lunar.getSolar()
    assert(
      '2020闰四月初一可转公历',
      solar.getYear() === 2020 && solar.getMonth() >= 5,
      `${solar.toYmd()}`,
    )
    const chart = buildBaziChart({
      gender: '男',
      calendarType: '农历',
      birthDate: '2020-04-01',
      birthHour: '午时 11:00-13:00',
      isLeapMonth: true,
    })
    assert('闰月八字可排', !!chart.pillars.day.ganZhi, chart.pillars.day.ganZhi)
  } catch (e) {
    assert('闰月转换', false, String(e))
  }
}

console.log('\n=== 4. 八字确定性柱位 ===')
{
  const chart = buildBaziChart({
    name: '测',
    gender: '男',
    calendarType: '公历',
    birthDate: '1990-05-15',
    birthHour: '午时 11:00-13:00',
  })
  const snap = [
    chart.pillars.year.ganZhi,
    chart.pillars.month.ganZhi,
    chart.pillars.day.ganZhi,
    chart.pillars.time.ganZhi,
  ].join(' ')
  // 黄金快照：公历 1990-05-15 午时（lunar-javascript）
  assert(
    '1990-05-15 午 四柱稳定',
    snap === '庚午 辛巳 庚辰 壬午',
    `got ${snap}`,
  )
  assert('日主庚', chart.dayMaster === '庚')
}

console.log('\n=== 5. 早晚子紫微不同盘 ===')
{
  const early = buildChartWithPatterns({
    gender: '男',
    calendarType: '公历',
    birthDate: '1990-05-15',
    birthHour: '早子时 00:00-01:00',
  })
  const late = buildChartWithPatterns({
    gender: '男',
    calendarType: '公历',
    birthDate: '1990-05-15',
    birthHour: '晚子时 23:00-00:00',
  })
  assert('早子 timeIndex=0', early.timeIndex === 0)
  assert('晚子 timeIndex=12', late.timeIndex === 12)
  const earlyMajors = early.chart.palaces
    .find((p) => p.isMingGong)?.stars.filter((s) => s.type === 'major').map((s) => s.name).join(',')
  const lateMajors = late.chart.palaces
    .find((p) => p.isMingGong)?.stars.filter((s) => s.type === 'major').map((s) => s.name).join(',')
  assert(
    '早晚子命宫主星不同',
    earlyMajors !== lateMajors,
    `早=${earlyMajors} 晚=${lateMajors}`,
  )
  console.log(`    早子命宫主星: ${earlyMajors || '空'}`)
  console.log(`    晚子命宫主星: ${lateMajors || '空'}`)
}

console.log('\n=== 6. 精确钟点优先 ===')
{
  const chart = buildBaziChart({
    gender: '女',
    calendarType: '公历',
    birthDate: '2000-01-01',
    birthHour: '午时 11:00-13:00',
    birthClock: '23:40',
  })
  assert('birthClock 23:40 → timeIndex 12', chart.timeIndex === 12)
}

console.log('\n=== 7. 八字大运与喜用 ===')
{
  const chart = buildBaziChart({
    gender: '男',
    calendarType: '公历',
    birthDate: '1990-05-15',
    birthHour: '午时 11:00-13:00',
  })
  assert('有喜用简判', !!chart.yongShen?.strength && chart.yongShen.xiYong.length > 0)
  assert('有大运', (chart.daYun || []).filter((d) => d.ganZhi).length >= 5)
  const reading = buildBaziRuleReading(chart)
  assert('八字规则文含四柱', reading.includes('庚午') && reading.includes('日主'))
}

console.log('\n=== 8. 紫微叠宫与规则解读 ===')
{
  const { chart, patterns } = buildChartWithPatterns({
    gender: '男',
    calendarType: '公历',
    birthDate: '1990-05-15',
    birthHour: '午时 11:00-13:00',
  })
  const o = buildOverlay(chart, 2026)
  assert('2026 流年命宫位为午', o.liuNianMingBranch === ((2026 - 4) % 12 + 12) % 12)
  assert('流年四化完整', !!(o.transforms.禄 && o.transforms.忌))
  assert('大限索引有效', o.daXianIndex >= 0)
  const reading = buildZiweiRuleReading(chart, patterns, { year: 2026 })
  assert('紫微规则文含命宫', reading.includes('命宫') && reading.includes('规则事实'))
}

console.log('\n=== 9. 合盘互飞与运势K线 ===')
{
  const a = buildChartWithPatterns({
    gender: '男',
    calendarType: '公历',
    birthDate: '1990-05-15',
    birthHour: '午时 11:00-13:00',
  }).chart
  const b = buildChartWithPatterns({
    gender: '女',
    calendarType: '公历',
    birthDate: '1992-08-20',
    birthHour: '卯时 05:00-07:00',
  }).chart
  const matrix = buildHemingMatrix(a, b)
  assert('互飞甲→乙有4条', matrix.aToB.length === 4)
  assert('关键宫含命宫', matrix.keyPalaces.some((r) => r.name.includes('命')))
  assert('互飞文案可生成', formatHemingMatrixForPrompt(matrix).includes('四化互飞'))

  const report = buildYunshiReport(a, 2026)
  assert('年度报告有12宫', report.palaces.length === 12)
  assert('月度12行', report.months.length === 12)
  assert('规则分在合理区间', report.score >= 8 && report.score <= 96, `score=${report.score}`)
  const kline = buildLifeKLine(a, { fromYear: 1990, toYear: 2000, step: 1 })
  assert('K线点数', kline.length === 11)
}

console.log('\n=== 10. 黄金用例库 ===')
{
  const snap = (c: ReturnType<typeof buildBaziChart>) =>
    [c.pillars.year.ganZhi, c.pillars.month.ganZhi, c.pillars.day.ganZhi, c.pillars.time.ganZhi].join(' ')
  const majors = (pack: ReturnType<typeof buildChartWithPatterns>) =>
    pack.chart.palaces
      .find((p) => p.isMingGong)
      ?.stars.filter((s) => s.type === 'major')
      .map((s) => s.name)
      .join(',') || ''

  for (const g of BAZI_GOLDEN) {
    const chart = buildBaziChart(g.input as Parameters<typeof buildBaziChart>[0])
    assert(`${g.id} 四柱`, snap(chart) === g.expect.pillars, `got ${snap(chart)}`)
    assert(`${g.id} 日主`, chart.dayMaster === g.expect.dayMaster)
    if (g.expect.timeIndex != null) {
      assert(`${g.id} timeIndex`, chart.timeIndex === g.expect.timeIndex)
    }
    if (g.expect.solarYmd) {
      const ymd = `${chart.solar.year}-${chart.solar.month}-${chart.solar.day}`
      assert(`${g.id} 公历`, ymd === g.expect.solarYmd, `got ${ymd}`)
    }
    if (g.expect.crossStatus) {
      const report = crossCheckBaziInput(g.input as Parameters<typeof crossCheckBaziInput>[0])
      assert(`${g.id} 交叉状态`, report.status === g.expect.crossStatus, report.status)
    }
  }

  for (const g of ZIWEI_GOLDEN) {
    const pack = buildChartWithPatterns(g.input as Parameters<typeof buildChartWithPatterns>[0])
    assert(`${g.id} 命宫主星`, majors(pack) === g.expect.mingMajors, `got ${majors(pack)}`)
    if (g.expect.mingGongBranch != null) {
      assert(`${g.id} 命宫地支`, pack.chart.mingGongBranch === g.expect.mingGongBranch)
    }
    if (g.expect.wuxingJuName) {
      assert(`${g.id} 五行局`, pack.chart.wuxingJuName === g.expect.wuxingJuName)
    }
  }
}

console.log('\n=== 11. 真太阳时硬断言 + 边界双盘 ===')
{
  const lon =
    findCityLongitude(TRUE_SOLAR_HARD.province, TRUE_SOLAR_HARD.city)
    ?? findCityLongitude('新疆', TRUE_SOLAR_HARD.city)
  assert('乌鲁木齐经度', lon != null && lon! < 100)
  if (lon != null) {
    const r = correctTrueSolarTime({
      year: TRUE_SOLAR_HARD.year,
      month: TRUE_SOLAR_HARD.month,
      day: TRUE_SOLAR_HARD.day,
      hour: TRUE_SOLAR_HARD.hour,
      minute: TRUE_SOLAR_HARD.minute,
      longitude: lon,
    })
    assert('真太阳必跨时辰', r.changedTimeIndex === TRUE_SOLAR_HARD.expectChanged)
    assert(
      '校正前午时',
      r.originalTimeIndex === TRUE_SOLAR_HARD.expectOriginalIndex,
      `got ${r.originalTimeIndex}`,
    )
    assert(
      '校正后辰时索引',
      r.timeIndex === TRUE_SOLAR_HARD.expectCorrectedIndex,
      `got ${r.timeIndex}`,
    )
  }

  const [hh, mm] = BOUNDARY_DUAL_CASE.birthClock.split(':').map(Number)
  const probe = probeTimeBoundary(hh, mm)
  assert('10:55 近交界', probe.nearBoundary === BOUNDARY_DUAL_CASE.expectNear)
  assert('当前巳', probe.currentIndex === BOUNDARY_DUAL_CASE.expectCurrentIndex)
  assert('邻近午', probe.alternateIndex === BOUNDARY_DUAL_CASE.expectAlternateIndex)

  for (const bc of BOUNDARY_DUAL_CASES) {
    const [h, m] = bc.birthClock.split(':').map(Number)
    const p = probeTimeBoundary(h, m)
    assert(`${bc.id} 近交界`, p.nearBoundary === bc.expectNear)
    assert(`${bc.id} 当前`, p.currentIndex === bc.expectCurrentIndex)
    assert(`${bc.id} 邻近`, p.alternateIndex === bc.expectAlternateIndex)

    const dualZ = buildDualBoundary(
      {
        gender: '男',
        calendarType: '公历',
        birthDate: bc.birthDate,
        birthHour: bc.birthHour,
        birthClock: bc.birthClock,
      },
      'ziwei',
    )
    assert(`${bc.id} 紫微双盘`, !!dualZ?.applicable)
    assert(
      `${bc.id} 紫微主星`,
      dualZ?.ziwei?.diff.mingMajorsA === bc.ziwei.mingMajorsA
        && dualZ?.ziwei?.diff.mingMajorsB === bc.ziwei.mingMajorsB,
      `${dualZ?.ziwei?.diff.mingMajorsA} / ${dualZ?.ziwei?.diff.mingMajorsB}`,
    )
    assert(`${bc.id} 紫微命宫变`, dualZ?.ziwei?.diff.mingGongChanged === bc.ziwei.mingGongChanged)

    const dualB = buildDualBoundary(
      {
        gender: '男',
        calendarType: '公历',
        birthDate: bc.birthDate,
        birthHour: bc.birthHour,
        birthClock: bc.birthClock,
      },
      'bazi',
    )
    assert(`${bc.id} 八字双盘`, !!dualB?.applicable)
    assert(
      `${bc.id} 八字时柱`,
      dualB?.bazi?.snapA === bc.bazi.snapA && dualB?.bazi?.snapB === bc.bazi.snapB,
      `${dualB?.bazi?.snapA} / ${dualB?.bazi?.snapB}`,
    )
  }
}

console.log('\n=== 12. 跨引擎交叉（lunar-javascript ↔ tyme4ts） ===')
{
  for (const g of BAZI_GOLDEN) {
    const report = crossCheckBaziInput(g.input as Parameters<typeof crossCheckBaziInput>[0])
    assert(
      `${g.id} 跨引擎对齐`,
      report.pillars.aligned,
      `${report.status} ${report.pillars.primary} vs ${report.pillars.tymeDefault}`,
    )
    assert(`${g.id} 农历月日`, !!report.lunar?.matchMonthDay)
  }

  const late = crossCheckBaziInput({
    gender: '男',
    calendarType: '公历',
    birthDate: '1990-05-15',
    birthHour: '晚子时 23:00-00:00',
  })
  assert('晚子与 tyme 默认可不同', late.pillars.primary !== late.pillars.tymeDefault)
  assert('晚子与 tyme 流派2 一致', late.pillars.matchSect2)
  assert('晚子状态为流派差', late.status === 'sect_diff')

  const leap = crossCheckLunarToSolar(2020, 4, 1, true)
  assert('闰四月初一公历一致', leap.match, `${leap.primary} / ${leap.tyme}`)

  const noon = buildBaziChart({
    gender: '男',
    calendarType: '公历',
    birthDate: '1990-05-15',
    birthHour: '午时 11:00-13:00',
  })
  const tyme = tymePillarsAt(
    noon.solar.year,
    noon.solar.month,
    noon.solar.day,
    noon.solar.hour,
    noon.solar.minute,
  )
  assert('午时四柱与 tyme 逐字一致', tyme === '庚午 辛巳 庚辰 壬午')

  const lateReport = crossCheckBaziInput({
    gender: '男',
    calendarType: '公历',
    birthDate: '1990-05-15',
    birthHour: '晚子时 23:00-00:00',
  })
  const lateText = formatCrossCheckForPrompt(lateReport)
  assert('交叉文案含状态', lateText.includes('sect_diff') && lateText.includes('流派'))
  assert('交叉文案含四柱', lateText.includes('庚午 辛巳 庚辰 戊子'))
}

console.log('\n=== 13. 立春换柱 + 扩展金标 ===')
{
  const snap = (c: ReturnType<typeof buildBaziChart>) =>
    [c.pillars.year.ganZhi, c.pillars.month.ganZhi, c.pillars.day.ganZhi, c.pillars.time.ganZhi].join(' ')

  const before = buildBaziChart(JIEQI_GOLDEN.before.input as Parameters<typeof buildBaziChart>[0])
  const after = buildBaziChart(JIEQI_GOLDEN.after.input as Parameters<typeof buildBaziChart>[0])
  assert(
    JIEQI_GOLDEN.before.id,
    snap(before) === JIEQI_GOLDEN.before.expect.pillars,
    `got ${snap(before)}`,
  )
  assert(
    JIEQI_GOLDEN.after.id,
    snap(after) === JIEQI_GOLDEN.after.expect.pillars,
    `got ${snap(after)}`,
  )
  assert('立春前后年柱不同', before.pillars.year.ganZhi !== after.pillars.year.ganZhi)
  assert('立春前后月柱不同', before.pillars.month.ganZhi !== after.pillars.month.ganZhi)

  const beforeX = crossCheckBaziInput(JIEQI_GOLDEN.before.input as Parameters<typeof crossCheckBaziInput>[0])
  const afterX = crossCheckBaziInput(JIEQI_GOLDEN.after.input as Parameters<typeof crossCheckBaziInput>[0])
  assert('立春前跨引擎', beforeX.pillars.aligned && beforeX.status === 'match')
  assert('立春后跨引擎', afterX.pillars.aligned && afterX.status === 'match')

  const hl = JIEQI_GOLDEN.hourLevel
  const snapClock = (clock: string) => {
    const c = buildBaziChart({
      gender: '男',
      calendarType: '公历',
      birthDate: hl.birthDate,
      birthHour: '申时 15:00-17:00',
      birthClock: clock,
    })
    return [c.pillars.year.ganZhi, c.pillars.month.ganZhi, c.pillars.day.ganZhi, c.pillars.time.ganZhi].join(' ')
  }
  assert(`${hl.id} 前一刻`, snapClock(hl.beforeClock) === hl.expectBefore, snapClock(hl.beforeClock))
  assert(`${hl.id} 后一刻`, snapClock(hl.afterClock) === hl.expectAfter, snapClock(hl.afterClock))
  assert(`${hl.id} 年柱已换`, snapClock(hl.beforeClock).slice(0, 2) !== snapClock(hl.afterClock).slice(0, 2))

  const probe = probeJieQiBoundary(
    {
      gender: '男',
      calendarType: '公历',
      birthDate: hl.birthDate,
      birthHour: '申时',
      birthClock: '16:20',
    },
    { year: 2024, month: 2, day: 4, hour: 16, minute: 20 },
    90,
  )
  assert('16:20 近立春', probe.nearBoundary === hl.expectNearAt1620)
  assert('节气名为立春', probe.jieQi?.name === '立春')
  assert('立春精确时刻', probe.jieQi?.iso === hl.exactIso)
  assert('双盘推荐', probe.dualRecommended)
  assert('交界前文案', probe.pillarsBefore === hl.expectBefore)
  assert('交界后文案', probe.pillarsAfter === hl.expectAfter)
  const jqText = formatJieQiForPrompt(probe)
  assert('节气文案可写入', jqText.includes('立春') && jqText.includes('交界前一刻'))

  // tyme 同步：16:26 / 16:28
  assert(
    'tyme 立春前',
    tymePillarsAt(2024, 2, 4, 16, 26) === hl.expectBefore,
    tymePillarsAt(2024, 2, 4, 16, 26),
  )
  assert(
    'tyme 立春后',
    tymePillarsAt(2024, 2, 4, 16, 28) === hl.expectAfter,
    tymePillarsAt(2024, 2, 4, 16, 28),
  )
}

console.log('\n=== 14. 十二节换月全覆盖（多年度） ===')
{
  for (const year of [2020, 2021, 2022, 2023, 2024, 2025, 2026]) {
    const rows = auditMonthJieQiYear(year)
    assert(`${year} 十二节齐全`, rows.length === 12, `got ${rows.length}`)
    for (const r of rows) {
      assert(`${year}${r.name} 月柱变化`, r.monthChanged, `${r.before} → ${r.after}`)
      assert(`${year}${r.name} tyme 月柱亦变`, r.tymeMonthChanged, `${r.tymeBefore} → ${r.tymeAfter}`)
      if (r.name === '立春') {
        assert(`${year}立春年柱变化`, r.yearChanged)
      } else {
        assert(`${year}${r.name} 年柱不变`, !r.yearChanged)
      }
      // 与 tyme 默认不一致时，必须能被流派2解释
      if (!r.tymeAlignedBefore || !r.tymeAlignedAfter) {
        assert(
          `${year}${r.name} 日柱差可归流派2`,
          r.sectDiffOnly && r.tymeSect2AlignedBefore && r.tymeSect2AlignedAfter,
          `primary ${r.before}/${r.after} tyme ${r.tymeBefore}/${r.tymeAfter}`,
        )
      }
    }
    const sectOnly = rows.filter((r) => r.sectDiffOnly).map((r) => r.name)
    console.log(`    ${year} 仅日柱流派差的节气：${sectOnly.join('、') || '无'}`)
  }

  // 大雪 2024 深夜：显式 daySect 元数据
  const daxue = buildBaziChart({
    gender: '男',
    calendarType: '公历',
    birthDate: '2024-12-06',
    birthHour: '晚子时',
    birthClock: '23:16',
  })
  assert('大雪前 daySect 存在', !!daxue.daySect)
  assert('大雪前日柱流派2', daxue.daySect?.dayPillarUsed === '甲辰')
  assert('大雪前另一派为乙巳', daxue.daySect?.dayPillarAlt === '乙巳')
  const dx = crossCheckBaziInput({
    gender: '男',
    calendarType: '公历',
    birthDate: '2024-12-06',
    birthHour: '晚子时',
    birthClock: '23:16',
  })
  assert('大雪交叉为流派差', dx.status === 'sect_diff')

  const sect1 = buildBaziChart({
    gender: '男',
    calendarType: '公历',
    birthDate: '2024-12-06',
    birthHour: '晚子时',
    birthClock: '23:16',
    daySect: 1,
  })
  assert('流派1日柱乙巳', sect1.pillars.day.ganZhi === '乙巳')
  assert('流派1 daySect.sect=1', sect1.daySect?.sect === 1)
  const dx1 = crossCheckBaziInput({
    gender: '男',
    calendarType: '公历',
    birthDate: '2024-12-06',
    birthHour: '晚子时',
    birthClock: '23:16',
    daySect: 1,
  })
  assert('流派1对齐 tyme 默认', dx1.pillars.matchDefault)
  assert('流派1交叉为流派差', dx1.status === 'sect_diff')
}

console.log('\n=== 15. 精度标志（入库口径） ===')
{
  const hourCase = BOUNDARY_DUAL_CASES[0]
  const fHour = computePrecisionFlags({
    gender: '男',
    calendarType: '公历',
    birthDate: hourCase.birthDate,
    birthHour: hourCase.birthHour,
    birthClock: hourCase.birthClock,
  })
  assert('10:55 触发时辰交界标志', fHour.boundaryHour === true)
  assert('10:55 交叉状态非 skipped', fHour.crossStatus !== 'skipped')

  const fJie = computePrecisionFlags({
    gender: '男',
    calendarType: '公历',
    birthDate: '2024-02-04',
    birthHour: '申时',
    birthClock: '16:20',
  })
  assert('立春前 16:20 触发节气交界标志', fJie.boundaryJieqi === true)

  const fCalm = computePrecisionFlags({
    gender: '男',
    calendarType: '公历',
    birthDate: '1990-05-15',
    birthHour: '午时 11:00-13:00',
    birthClock: '12:00',
  })
  assert('12:00 非时辰交界', fCalm.boundaryHour === false)
  assert('12:00 非节气交界', fCalm.boundaryJieqi === false)
  assert('12:00 交叉通过', fCalm.crossStatus === 'match')
  assert('12:00 无真太阳跨时辰', fCalm.trueSolarShift === false)

  const fLate = computePrecisionFlags({
    gender: '男',
    calendarType: '公历',
    birthDate: '2024-12-06',
    birthHour: '晚子时',
    birthClock: '23:16',
    daySect: 2,
  })
  assert('晚子流派2 记为 sect_diff', fLate.crossStatus === 'sect_diff')

  const fSolar = computePrecisionFlags({
    gender: '男',
    calendarType: '公历',
    birthDate: '1990-06-15',
    birthHour: '午时',
    birthClock: '11:05',
    useTrueSolar: true,
    province: TRUE_SOLAR_HARD.province,
    city: TRUE_SOLAR_HARD.city,
  })
  assert('乌市真太阳跨时辰入库标志', fSolar.trueSolarShift === true)
}

console.log('\n=== 16. 紫微旁证日柱流派 ===')
{
  const base = {
    gender: '男' as const,
    calendarType: '公历' as const,
    birthDate: '2024-12-06',
    birthHour: '晚子时',
    birthClock: '23:16',
  }
  const zw2 = crossCheckZiweiCalendar({ ...base, daySect: 2 })
  assert('紫微旁证流派2 status=sect_diff', zw2.status === 'sect_diff')
  assert('紫微旁证流派2 daySect=2', zw2.daySect === 2)
  assert('紫微旁证流派2 对齐 tyme 流派2', zw2.pillars.matchSect2 && !zw2.pillars.matchDefault)

  const zw1 = crossCheckZiweiCalendar({ ...base, daySect: 1 })
  assert('紫微旁证流派1 status=sect_diff', zw1.status === 'sect_diff')
  assert('紫微旁证流派1 daySect=1', zw1.daySect === 1)
  assert('紫微旁证流派1 对齐 tyme 默认', zw1.pillars.matchDefault && !zw1.pillars.matchSect2)
  assert('紫微旁证两派日柱不同', zw1.pillars.primary !== zw2.pillars.primary)

  const prompt2 = formatCrossCheckForPrompt(zw2)
  assert('旁证文案含流派2', prompt2.includes('流派2'))
  const prompt1 = formatCrossCheckForPrompt(zw1)
  assert('旁证文案含流派1', prompt1.includes('流派1'))
}

console.log('\n=== 17. 运势旁证日柱流派 ===')
{
  const birth = {
    gender: '男' as const,
    calendarType: '公历' as const,
    birthDate: '2024-12-06',
    birthHour: '晚子时',
    birthClock: '23:16',
    daySect: 2 as const,
  }
  const { chart } = buildChartWithPatterns(birth)
  const report = buildYunshiReport(chart, 2026)
  assert('运势报告可生成', !!report?.score)
  const cx = crossCheckZiweiCalendar(birth)
  assert('运势旁证流派2', cx.daySect === 2 && cx.status === 'sect_diff')
}

console.log('\n=== 18. 回填输入映射 ===')
{
  const mapped = birthInputFromRecord({
    gender: '女',
    calendar_type: '公历',
    birth_date: '1990-05-15',
    birth_hour: '午时',
    birth_clock: '12:00',
    is_leap_month: 0,
    use_true_solar: 0,
    day_sect: 2,
  })
  assert('映射公历类型字段', mapped.calendarType === '公历')
  assert('映射日期', mapped.birthDate === '1990-05-15')
  assert('映射流派2', mapped.daySect === 2)
  const flags = computePrecisionFlags(mapped)
  assert('映射后交叉通过', flags.crossStatus === 'match')
}

console.log('\n=== 19. Meeus 真太阳时 + 紫微完整性 ===')
{
  const lon =
    findCityLongitude(TRUE_SOLAR_HARD.province, TRUE_SOLAR_HARD.city)
    ?? findCityLongitude('新疆', TRUE_SOLAR_HARD.city)
  assert('乌市经度(Meeus)', lon != null && lon! < 100)
  if (lon != null) {
    const meeus = correctTrueSolarTime({
      year: TRUE_SOLAR_HARD.year,
      month: TRUE_SOLAR_HARD.month,
      day: TRUE_SOLAR_HARD.day,
      hour: TRUE_SOLAR_HARD.hour,
      minute: TRUE_SOLAR_HARD.minute,
      longitude: lon,
      eotMethod: 'meeus',
    })
    assert('默认/强制 meeus', meeus.eotMethod === 'meeus')
    assert('Meeus 必跨时辰', meeus.changedTimeIndex === true)
    assert(
      'Meeus 校正后辰时',
      meeus.timeIndex === TRUE_SOLAR_HARD.expectCorrectedIndex,
      `got ${meeus.timeIndex}`,
    )

    const spencer = correctTrueSolarTime({
      year: TRUE_SOLAR_HARD.year,
      month: TRUE_SOLAR_HARD.month,
      day: TRUE_SOLAR_HARD.day,
      hour: TRUE_SOLAR_HARD.hour,
      minute: TRUE_SOLAR_HARD.minute,
      longitude: lon,
      eotMethod: 'spencer',
    })
    assert('强制 spencer', spencer.eotMethod === 'spencer')
    assert('Spencer 亦跨时辰', spencer.changedTimeIndex === true)
    // 两算法校正量级应接近（乌市经度主导）
    assert(
      'Meeus/Spencer 校正差 < 15 分',
      Math.abs(meeus.totalCorrectionMin - spencer.totalCorrectionMin) < 15,
      `Δ=${Math.abs(meeus.totalCorrectionMin - spencer.totalCorrectionMin)}`,
    )
  }

  const { chart } = buildChartWithPatterns({
    gender: '男',
    calendarType: '公历',
    birthDate: '1990-05-15',
    birthHour: '午时',
  })
  const integ = auditZiweiChartIntegrity(chart, {
    expectSolar: chart.birthInfo
      ? { year: chart.birthInfo.year, month: chart.birthInfo.month, day: chart.birthInfo.day }
      : undefined,
  })
  assert('紫微完整性通过', integ.status === 'ok', integ.summary)
  assert('十四主星', integ.majorCount === 14)
  assert('命宫自洽', integ.mingConsistent === true)
  assert('十二宫齐全', integ.palaceCount === 12)
  assert('无第二安星', integ.secondAnXingAvailable === false)
}

console.log('\n=== 20. 占卜集大成适配器冒烟 ===')
{
  const systems = listSystems()
  assert('系统登记 ≥ 11', systems.length >= 11, `got ${systems.length}`)
  assert('bazi 有效', isValidSystemId('bazi'))
  assert('meihua 有效', isValidSystemId('meihua'))
  assert('jinkou 有效', isValidSystemId('jinkou'))
  assert(
    '奇门须人工复核标记',
    systems.find((s) => s.id === 'qimen')?.requiresHumanReview === true,
  )
  assert(
    '大六壬须人工复核标记',
    systems.find((s) => s.id === 'daliuren')?.requiresHumanReview === true,
  )

  const meihua = getAdapter('meihua')!.build({
    method: 'number',
    num1: 3,
    num2: 5,
    num3: 2,
    question: '测试',
  })
  assert('梅花有本卦', !!(meihua.chart as any).ben?.name)
  assert('梅花规则文', meihua.ruleReading.includes('梅花'))
  assert('梅花有应期', !!(meihua.chart as any).yingQi?.text)
  assert('梅花规则含应期', meihua.ruleReading.includes('应期'))
  const m2 = getAdapter('meihua')!.build({ method: 'number', num1: 1, num2: 1, num3: 1 })
  assert('乾卦互卦为乾', (m2.chart as any).hu?.name === '乾为天', (m2.chart as any).hu?.name)
  assert('乾初爻变履', (m2.chart as any).bian?.name === '天泽履', (m2.chart as any).bian?.name)
  const m3 = getAdapter('meihua')!.build({ method: 'number', num1: 1, num2: 1, num3: 3 })
  assert('乾三爻变姤', (m3.chart as any).bian?.name === '天风姤', (m3.chart as any).bian?.name)
  assert('乾错卦为坤', (m2.chart as any).cuo?.name === '坤为地', (m2.chart as any).cuo?.name)

  for (const g of MEIHUA_GOLDEN) {
    const built = getAdapter('meihua')!.build(g.input)
    const ch = built.chart as any
    assert(`${g.id} 本卦`, ch.ben?.name === g.expect.ben, ch.ben?.name)
    assert(`${g.id} 动爻`, ch.dongYao === g.expect.dongYao, String(ch.dongYao))
    assert(`${g.id} 体用`, ch.tiYong?.relation === g.expect.relation, ch.tiYong?.relation)
    assert(`${g.id} 应期速`, ch.yingQi?.pace === g.expect.yingPace, ch.yingQi?.pace)
    assert(`${g.id} 应期数`, ch.yingQi?.count === g.expect.yingCount, String(ch.yingQi?.count))
  }

  for (const id of [
    'bazi',
    'ziwei',
    'meihua',
    'liuyao',
    'xiaoliuren',
    'qimen',
    'daliuren',
    'jinkou',
    'taiyi',
    'huangji',
    'tieban',
  ] as const) {
    const built = getAdapter(id)!.build(
      id === 'ziwei' || id === 'bazi' || id === 'tieban'
        ? {
            gender: '男',
            birthDate: '1990-05-15',
            birthHour: '午时',
            calendarType: '公历',
          }
        : { date: '2024-06-15', clock: '12:00', method: 'time', text: '求财', year: 2024 },
    )
    assert(`${id} 有规则输出`, !!built.ruleReading && built.ruleReading.length > 40)
    assert(`${id} 有 prompt`, !!built.promptText && built.promptText.length > 10)
  }

  const xlr = getAdapter('xiaoliuren')!.build({
    date: '2024-06-15',
    clock: '10:00',
    matter: '求财',
  })
  assert('小六壬有时宫', !!(xlr.chart as any).shiGong?.name)
  assert('小六壬事项归类', (xlr.chart as any).matterKey === '求财')
  assert('小六壬事项专断', !!(xlr.chart as any).matterHint)
  assert('小六壬规则含事项专断', xlr.ruleReading.includes('事项专断') || xlr.ruleReading.includes('求财'))

  const ly = getAdapter('liuyao')!.build({
    method: 'manual',
    yaoValues: [7, 8, 9, 7, 8, 6],
    date: '2024-06-15',
    clock: '12:00',
  })
  assert('六爻有本卦名', !!(ly.chart as any).benName)
  assert('六爻六爻齐全', (ly.chart as any).lines?.length === 6)
  assert('六爻有宫五行', !!(ly.chart as any).palaceWx)
  assert('六爻规则含伏神栏', ly.ruleReading.includes('伏神'))
  assert('六爻有日月建字段', Array.isArray((ly.chart as any).lines?.[0]?.yueRi))
  assert('六爻规则含日月建合冲', ly.ruleReading.includes('日月建') || ly.ruleReading.includes('月柱'))

  const lyTime = getAdapter('liuyao')!.build({
    method: 'time',
    date: '2024-06-15',
    clock: '12:00',
  })
  const lyTime2 = getAdapter('liuyao')!.build({
    method: 'time',
    date: '2024-06-15',
    clock: '12:00',
  })
  assert('六爻时间起卦可复现', (lyTime.chart as any).benName === (lyTime2.chart as any).benName)
  assert('六爻时间起卦标明伪随机', String((lyTime.chart as any).method).includes('伪随机'))
  assert('六爻规则含伪随机边界', lyTime.ruleReading.includes('伪随机'))

  const jk = getAdapter('jinkou')!.build({ date: '2024-06-15', clock: '12:00', difen: '午' })
  assert('金口有人元', !!(jk.chart as any).renYuan?.gan)
  assert('金口有将神', !!(jk.chart as any).jiangShen?.zhi)
  assert('金口规则有四位', jk.ruleReading.includes('将神'))
  assert('金口有细断', !!(jk.chart as any).judgment?.summary)
  assert('金口规则含细断', jk.ruleReading.includes('四位细断'))

  for (const g of JINKOU_GOLDEN) {
    const built = getAdapter('jinkou')!.build(g.input)
    const ch = built.chart as any
    assert(`${g.id} 地分`, ch.difen === g.expect.difen, ch.difen)
    assert(`${g.id} 月将`, ch.yueJiang === g.expect.yueJiang, ch.yueJiang)
    assert(`${g.id} 贵人`, ch.guiRen === g.expect.guiRen, ch.guiRen)
    assert(`${g.id} 人元`, ch.renYuan?.gan === g.expect.renGan, ch.renYuan?.gan)
    assert(`${g.id} 贵神`, ch.guiShen?.name === g.expect.guiName, ch.guiShen?.name)
    assert(`${g.id} 将神`, ch.jiangShen?.zhi === g.expect.jiangZhi, ch.jiangShen?.zhi)
    assert(`${g.id} 旬空`, ch.xunKong === g.expect.xunKong, ch.xunKong)
    assert(
      `${g.id} 细断`,
      String(ch.judgment?.summary || '').includes(g.expect.summaryIncludes),
      ch.judgment?.summary,
    )
  }
  const jkCmp = compareJinkouSidecar(
    { difen: '午', jiangShen: { zhi: '申' }, guiShen: { name: '青龙' }, renYuan: { gan: '壬' } },
    { ok: true, engine: 'kinjinkou', text: '人元壬 贵神青龙 将神申 地分午' },
  )
  assert('金口旁证对照 match', jkCmp.align === 'match', jkCmp.align)

  const qm = getAdapter('qimen')!.build({ date: '2024-06-15', clock: '12:00' })
  assert('奇门九宫', (qm.chart as any).palaces?.length === 9)
  assert('奇门值使宫', typeof (qm.chart as any).zhiShiGong === 'number')
  assert('奇门空亡', !!(qm.chart as any).xunKong)
  assert('奇门驿马', !!(qm.chart as any).yiMa)
  assert('奇门旁证字段', !!(qm.chart as any).witness?.engine)
  assert('奇门规则含值使', qm.ruleReading.includes('值使'))
  assert(
    '奇门完整性非 fail',
    qm.integrity?.status === 'ok' || qm.integrity?.status === 'warn',
    qm.integrity?.status,
  )
  assert('奇门旁证含对齐字段', !!(qm.chart as any).witness?.juAlign || (qm.chart as any).witness?.status === 'skip')

  for (const g of QIMEN_WITNESS_GOLDEN) {
    const built = getAdapter('qimen')!.build(g.input)
    const ch = built.chart as any
    assert(`${g.id} 节气`, ch.jieQi === g.engine.jieQi, ch.jieQi)
    assert(`${g.id} 阴阳遁`, ch.yangDun === g.engine.yangDun)
    assert(`${g.id} 局数`, ch.ju === g.engine.ju, String(ch.ju))
    assert(`${g.id} 值符星`, ch.zhiFuStar === g.engine.zhiFuStar, ch.zhiFuStar)
    assert(`${g.id} 值使门`, ch.zhiShiDoor === g.engine.zhiShiDoor, ch.zhiShiDoor)
    if (ch.witness?.status === 'ok') {
      assert(`${g.id} 旁证局`, String(ch.witness.ju || '').includes(g.witness.juIncludes), ch.witness.ju)
      assert(`${g.id} 旁证符`, String(ch.witness.fu || '').includes(g.witness.fuIncludes), ch.witness.fu)
      assert(`${g.id} 旁证使`, String(ch.witness.shi || '').includes(g.witness.shiIncludes), ch.witness.shi)
      assert(`${g.id} 局对齐`, ch.witness.juAlign === g.witness.juAlign, ch.witness.juAlign)
      const parsed = parseWitnessJu(ch.witness.ju)
      assert(`${g.id} 旁证可解析`, !!parsed, ch.witness.ju)
    }
  }

  for (const g of BAZI_TIAOHOU_GOLDEN) {
    const built = getAdapter('bazi')!.build(g.input)
    const ch = built.chart as any
    assert(`${g.id} 日主`, ch.dayMaster === g.expect.dayMaster, ch.dayMaster)
    assert(`${g.id} 月支`, ch.pillars?.month?.zhi === g.expect.monthZhi, ch.pillars?.month?.zhi)
    assert(`${g.id} 强弱`, ch.yongShen?.strength === g.expect.strength, ch.yongShen?.strength)
    assert(
      `${g.id} 调候季节`,
      ch.yongShen?.tiaoHou?.season === g.expect.tiaoHouSeason,
      ch.yongShen?.tiaoHou?.season,
    )
    assert(
      `${g.id} 调候喜`,
      (ch.yongShen?.tiaoHou?.need || []).includes(g.expect.tiaoHouNeedIncludes),
      JSON.stringify(ch.yongShen?.tiaoHou?.need),
    )
    assert(`${g.id} 规则含调候`, built.ruleReading.includes('调候'))
  }

  const dlr = getAdapter('daliuren')!.build({ date: '2024-06-15', clock: '12:00', dayNight: 'day' })
  assert('大六壬四课', (dlr.chart as any).ke?.length === 4)
  assert('大六壬三传', !!(dlr.chart as any).sanChuan?.chu)
  assert('大六壬天将盘', (dlr.chart as any).tianJiangPan?.length === 12)
  assert('大六壬旬空', !!(dlr.chart as any).xunKong)
  assert('大六壬规则含复核', dlr.ruleReading.includes('人工复核'))
  assert('奇门规则含复核', qm.ruleReading.includes('人工复核'))

  for (const g of DALIUREN_GOLDEN) {
    const built = getAdapter('daliuren')!.build(g.input)
    const ch = built.chart as any
    assert(`${g.id} 节气`, ch.jieQi === g.expect.jieQi, ch.jieQi)
    assert(`${g.id} 月将`, ch.yueJiang === g.expect.yueJiang, ch.yueJiang)
    assert(`${g.id} 贵人`, ch.guiRen === g.expect.guiRen, ch.guiRen)
    assert(`${g.id} 旬空`, ch.xunKong === g.expect.xunKong, ch.xunKong)
    assert(`${g.id} 初传`, ch.sanChuan?.chu === g.expect.chu, ch.sanChuan?.chu)
    assert(`${g.id} 中传`, ch.sanChuan?.zhong === g.expect.zhong, ch.sanChuan?.zhong)
    assert(`${g.id} 末传`, ch.sanChuan?.mo === g.expect.mo, ch.sanChuan?.mo)
    assert(
      `${g.id} 取法`,
      String(ch.sanChuan?.method || '').includes(g.expect.methodIncludes),
      ch.sanChuan?.method,
    )
  }

  const stubCmp = compareDaliurenSidecar(
    { sanChuan: { chu: '子', zhong: '寅', mo: '辰', method: '贼克' }, yueJiang: '申', guiRen: '丑' },
    { ok: false, engine: 'stub' },
  )
  assert('大六壬旁证对照 stub', stubCmp.align === 'stub')
  const matchCmp = compareDaliurenSidecar(
    { sanChuan: { chu: '子', zhong: '寅', mo: '辰' } },
    { ok: true, engine: 'kinliuren', text: '初传子 中传寅 末传辰' },
  )
  assert('大六壬旁证对照 match', matchCmp.align === 'match', matchCmp.align)

  const ty = getAdapter('taiyi')!.build({ date: '2024-06-15', jiStyle: 0 })
  assert('太乙积年', typeof (ty.chart as any).jiNian === 'number')
  assert('太乙规则含双路径', ty.ruleReading.includes('sidecar') || ty.ruleReading.includes('PY_ENGINE'))

  const hj = getAdapter('huangji')!.build({ year: 2024, month: 6, day: 15 })
  assert('皇极有会', (hj.chart as any).hui >= 1)
  assert('皇极规则含双路径', hj.ruleReading.includes('kinwangji') || hj.ruleReading.includes('PY_ENGINE'))

  const tb = getAdapter('tieban')!.build({
    gender: '男',
    birthDate: '1990-05-15',
    birthHour: '午时',
    calendarType: '公历',
  })
  assert('铁板无条文库', (tb.chart as any).versesAvailable === false)
  assert('铁板有本命数', (tb.chart as any).benMingShu > 0)
  assert('铁板演示哈希标记', (tb.chart as any).numbersAreDemoHash === true)
  assert('铁板规则含冻结', tb.ruleReading.includes('冻结') || tb.ruleReading.includes('演示哈希'))
  assert('铁板完整性', tb.integrity?.status === 'ok', tb.integrity?.summary)

  for (const g of XIAOLIUREN_GOLDEN) {
    const built = getAdapter('xiaoliuren')!.build(g.input)
    const ch = built.chart as any
    assert(`${g.id} 月宫`, ch.yueGong?.name === g.expect.yueGong, ch.yueGong?.name)
    assert(`${g.id} 日宫`, ch.riGong?.name === g.expect.riGong, ch.riGong?.name)
    assert(`${g.id} 时宫`, ch.shiGong?.name === g.expect.shiGong, ch.shiGong?.name)
    assert(`${g.id} 事项`, ch.matterKey === g.expect.matterKey, ch.matterKey)
    assert(
      `${g.id} 专断`,
      String(ch.matterHint || '').includes(g.expect.hintIncludes),
      ch.matterHint,
    )
  }

  for (const g of TIEBAN_GOLDEN) {
    const built = getAdapter('tieban')!.build(g.input)
    const ch = built.chart as any
    assert(`${g.id} 先天`, ch.xianTianMingShu === g.expect.xianTianMingShu, String(ch.xianTianMingShu))
    assert(`${g.id} 本命`, ch.benMingShu === g.expect.benMingShu, String(ch.benMingShu))
    assert(`${g.id} 考刻`, ch.kaoKe === g.expect.kaoKe, ch.kaoKe)
    assert(`${g.id} 辟卦`, ch.piGua === g.expect.piGua, ch.piGua)
    assert(`${g.id} 无条文`, ch.versesAvailable === g.expect.versesAvailable)
    assert(`${g.id} 哈希标记`, ch.numbersAreDemoHash === g.expect.numbersAreDemoHash)
  }

  const bazi = getAdapter('bazi')!.build({
    gender: '男',
    birthDate: '1990-05-15',
    birthHour: '午时',
    calendarType: '公历',
  })
  assert('八字子平格局', Array.isArray((bazi.chart as any).zipingPatterns))
  const zp = detectZipingPatterns(bazi.chart as any)
  assert('子平简判非空', zp.length >= 1)

  const zw = getAdapter('ziwei')!.build({
    gender: '男',
    birthDate: '1990-05-15',
    birthHour: '午时',
    calendarType: '公历',
  })
  assert('紫微适配器完整性', zw.integrity?.status === 'ok' || zw.integrity?.status === 'warn')
  assert('紫微默认倪师', zw.ruleReading.includes('倪师') || (zw.meta as any)?.ziweiSchool === 'ni')

  const zwFly = getAdapter('ziwei')!.build({
    gender: '男',
    birthDate: '1990-05-15',
    birthHour: '午时',
    calendarType: '公历',
    ziweiSchool: 'feixing',
  })
  assert('紫微飞星口径', (zwFly.meta as any)?.ziweiSchool === 'feixing')
  assert('紫微飞星含大限四化文案', zwFly.ruleReading.includes('大限四化') || zwFly.ruleReading.includes('飞星'))

  // 主站口径字段：飞星与倪师规则文案必须可区分
  assert('飞星规则含飞星字样', zwFly.ruleReading.includes('飞星'))
  assert('倪师标明不另飞四化', zw.ruleReading.includes('不另飞'))
  assert('倪师无宫干四化行', !zw.ruleReading.includes('大限四化（宫干'))
  assert('飞星规则含来因', zwFly.ruleReading.includes('来因'))
  assert('飞星规则含飞化链', zwFly.ruleReading.includes('飞化链'))
  assert('飞星规则含大限飞化链', zwFly.ruleReading.includes('大限飞化链'))
  assert('飞星规则含流年飞化链', zwFly.ruleReading.includes('流年飞化链'))
  const flyChart = (zwFly.chart as any)?.chart
  if (flyChart) {
    const ly = buildNatalLaiYin(flyChart)
    assert('来因宫条目为4', ly.length === 4, String(ly.length))
    assert('化忌来因有星名', !!ly.find((x) => x.siHua === '忌')?.starName)
    const chain = buildNatalFeihuaChain(flyChart)
    assert('飞化链4环', chain.length === 4, String(chain.length))
    assert('飞化链有落宫或摘要', chain.every((c) => !!c.summary && Array.isArray(c.fall)))
    assert('化忌链存在', !!chain.find((c) => c.siHua === '忌'))
    const dxChain = buildDaXianFeihuaChain(flyChart, 0)
    assert('大限飞化链有环', dxChain.length === 4, String(dxChain.length))
    assert('大限链图层', dxChain[0]?.layer === 'daxian')
    const lnChain = buildLiuNianFeihuaChain(flyChart, new Date().getFullYear())
    assert('流年飞化链有环', lnChain.length === 4, String(lnChain.length))
    assert('流年链图层', lnChain[0]?.layer === 'liunian')
  }

  const okCite = citationRiskScore('命宫紫微在庙，夫妻宫无化忌', new Set(['命宫', '紫微', '夫妻宫']))
  assert('合法引用低分', okCite.score === 0, String(okCite.score))
  const badCite = citationRiskScore('田宅宫有贪狼，另见子丑', new Set(['命宫', '紫微']))
  assert('宫位幻觉加权', badCite.score >= 2, String(badCite.score))
  assert('宫位幻觉列入', (badCite.breakdown?.palaces || []).length >= 1)

  const claims = extractStarPalaceClaims('紫微在命宫，财帛宫有贪狼')
  assert('抽取星宫断言', claims.length >= 2, String(claims.length))
  const factsFake = {
    system: 'ziwei',
    starPalaces: { 紫微: ['命宫', '命'], 贪狼: ['官禄宫', '官禄'] },
  }
  const relBad = citationRiskScore('贪狼在财帛宫', new Set(['贪狼', '财帛宫', '官禄宫']), factsFake)
  assert('语义错位高分', relBad.score >= 3, String(relBad.score))
  assert('语义错位列入', (relBad.breakdown?.relations || []).length >= 1)
  const relOk = citationRiskScore('紫微在命宫', new Set(['紫微', '命宫']), factsFake)
  assert('语义正位低分', relOk.score === 0, String(relOk.score))

  const baziFacts = buildBaziCitationFacts({
    dayMaster: '甲',
    pillars: { year: { ganZhi: '甲子' }, day: { ganZhi: '甲寅' } },
  })
  const baziBad = citationRiskScore('日主乙，日柱甲子', new Set(['甲', '乙', '甲子', '甲寅']), baziFacts)
  assert('八字日主错位', baziBad.score >= 3, String(baziBad.score))

  if (flyChart) {
    const zf = withZiweiPatterns(buildZiweiCitationFacts(flyChart), [{ name: '机月同梁' }])
    assert('事实索引有星', Object.keys(zf.starPalaces || {}).length >= 10)
    assert('事实图有命宫', !!zf.mingGong)
    assert('事实图有四化落', Object.keys(zf.siHuaFall || {}).length >= 1)
    assert('事实图有对宫', Object.keys(zf.palaceOpposite || {}).length >= 1)
    assert('事实图有格局', (zf.patterns || []).includes('机月同梁'))

    const fallJi = (zf.siHuaFall?.忌 || [])[0]
    if (fallJi) {
      const wrongPalace = fallJi.includes('命') ? '财帛宫' : '命宫'
      const badFall = citationRiskScore(
        `化忌入${wrongPalace}`,
        new Set(['化忌', wrongPalace, '命宫', '财帛宫', ...(zf.siHuaFall?.忌 || [])]),
        zf,
      )
      // 若 wrong 恰好也是落宫则跳过
      if (!(zf.siHuaFall?.忌 || []).some((p) => p.includes(wrongPalace.replace('宫', '')) || wrongPalace.includes(p.replace('宫', '')))) {
        assert('化忌落宫错位', badFall.score >= 3, String(badFall.score))
      }
    }
    const badPat = citationRiskScore('成紫府朝垣格', new Set(['紫府朝垣格']), zf)
    assert('假格局错位', badPat.score >= 3, String(badPat.score))
  }
}

console.log('\n=== 21b. 会员档位元数据 ===')
{
  const { resolvePlanId, getPlanMeta, normalizePlanId, todayKey } = require('../lib/plan')
  assert('normalize free', normalizePlanId('x') === 'free')
  assert('normalize pro', normalizePlanId('pro') === 'pro')
  assert('admin 解析为 admin', resolvePlanId({ role: 'admin', plan: 'free' }) === 'admin')
  assert('普通用户 free', resolvePlanId({ role: 'user', plan: 'free' }) === 'free')
  assert('普通用户 pro', resolvePlanId({ role: 'user', plan: 'pro' }) === 'pro')
  assert('free 有日限', typeof getPlanMeta('free').dailyLlm === 'number')
  assert('admin 不限', getPlanMeta('admin').dailyLlm === null)
  assert('todayKey 格式', /^\d{4}-\d{2}-\d{2}$/.test(todayKey()))
}

console.log('\n=== 21c. 兑换码格式 ===')
{
  const { normalizeRedeemCode, formatRedeemCode, mintRedeemCodeValue } = require('../lib/redeem')
  const minted = mintRedeemCodeValue()
  assert('mint 以 LJ 开头', minted.startsWith('LJ') && minted.length === 10, minted)
  assert('normalize 去分隔符', normalizeRedeemCode('lj-ab12-cd34') === 'LJAB12CD34')
  assert('format 展示', formatRedeemCode('LJABCD1234') === 'LJ-ABCD-1234')
}

console.log('\n=== 21d. 订单号与标价 ===')
{
  const { mintOrderNo, formatAmountYuan, getProPriceFen, mockPayAllowed } = require('../lib/checkout')
  const no = mintOrderNo()
  assert('订单号 LJ 前缀', no.startsWith('LJ') && no.length >= 14, no)
  assert('金额格式', formatAmountYuan(9900) === '99.00')
  assert('标价为正', getProPriceFen() > 0)
  assert('mockPay 布尔', typeof mockPayAllowed() === 'boolean')
}

console.log('\n=== 21. 大六壬九宗门简判 + 原典/笔画 ===')
{
  // 贼克：唯一下克上
  const zei = takeSanChuan([
    { label: '1', upper: '午', lower: '子' }, // 水克火？子水克午火 — 下克上
    { label: '2', upper: '丑', lower: '丑' },
    { label: '3', upper: '寅', lower: '寅' },
    { label: '4', upper: '卯', lower: '卯' },
  ])
  assert('贼克取法', zei.method === '贼克', zei.method)

  // 多贼 → 比用
  const bi = takeSanChuan([
    { label: '1', upper: '午', lower: '子' },
    { label: '2', upper: '巳', lower: '亥' },
    { label: '3', upper: '寅', lower: '寅' },
    { label: '4', upper: '卯', lower: '卯' },
  ])
  assert('比用取法', bi.method.includes('比用'), bi.method)

  // 无贼有上克下 → 克贼
  const kezei = takeSanChuan([
    { label: '1', upper: '子', lower: '午' }, // 上水克下火
    { label: '2', upper: '丑', lower: '丑' },
    { label: '3', upper: '寅', lower: '寅' },
    { label: '4', upper: '卯', lower: '卯' },
  ])
  assert('克贼取法', kezei.method === '克贼', kezei.method)

  // 无克无贼且非伏吟 → 昴星（无天盘时兜底）
  const mao = takeSanChuan([
    { label: '1', upper: '子', lower: '寅' },
    { label: '2', upper: '丑', lower: '辰' },
    { label: '3', upper: '寅', lower: '卯' },
    { label: '4', upper: '卯', lower: '巳' },
  ])
  assert('昴星取法', mao.method.includes('昴星'), mao.method)

  // 八专：日干寄宫=日支，无克无贼无遥克
  const bazhuan = takeSanChuan(
    [
      { label: '1', upper: '子', lower: '寅' },
      { label: '2', upper: '亥', lower: '子' },
      { label: '3', upper: '卯', lower: '卯' },
      { label: '4', upper: '辰', lower: '辰' },
    ],
    undefined,
    '甲',
    '寅',
  )
  assert('八专取法', bazhuan.method === '八专', bazhuan.method)
  assert('八专顺数三', bazhuan.chu === '寅', bazhuan.chu)

  // 别责：课不全（一二课同上神）+ 有天盘
  const tianPan = '子丑寅卯辰巳午未申酉戌亥'.split('')
  const bieze = takeSanChuan(
    [
      { label: '1', upper: '子', lower: '寅' },
      { label: '2', upper: '子', lower: '子' },
      { label: '3', upper: '亥', lower: '亥' },
      { label: '4', upper: '酉', lower: '酉' },
    ],
    tianPan,
    '甲',
    '子',
  )
  assert('别责取法', bieze.method === '别责', bieze.method)

  const stroke = countStrokes('求财')
  assert('笔画可复现', stroke.total === countStrokes('求财').total && stroke.total > 0)

  const meihuaStroke = getAdapter('meihua')!.build({ method: 'stroke', text: '求财' })
  assert('汉字起卦有本卦', !!(meihuaStroke.chart as any).ben?.name)

  for (const sys of [
    'bazi',
    'ziwei',
    'meihua',
    'liuyao',
    'xiaoliuren',
    'qimen',
    'daliuren',
    'jinkou',
    'taiyi',
    'huangji',
    'tieban',
  ]) {
    const classics = listClassicsBySystem(sys)
    assert(`${sys} 有原典选章`, classics.length >= 1)
  }
  assert('紫微百科条目', listEncyclopedia('ziwei').length >= 1)
  assert('金口百科条目', listEncyclopedia('jinkou').length >= 1)
}

void (async () => {
  const py = await fetchPyEngine('/health')
  assert('py-engine 旁路不抛错', py == null || typeof py === 'object')
  console.log(`\n${failed === 0 ? '全部通过' : `${failed} 项失败`}\n`)
  process.exit(failed === 0 ? 0 : 1)
})()
