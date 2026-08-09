/**
 * 黄金用例库：固定生辰 → 期望四柱 / 紫微关键字段
 * 供 scripts/astro-regression.ts 断言（与 lunar-javascript / iztro / tyme4ts 实测锁定）
 */

export const BAZI_GOLDEN = [
  {
    id: 'bazi-1990-0515-wu',
    input: {
      gender: '男',
      calendarType: '公历',
      birthDate: '1990-05-15',
      birthHour: '午时 11:00-13:00',
    },
    expect: {
      pillars: '庚午 辛巳 庚辰 壬午',
      dayMaster: '庚',
    },
  },
  {
    id: 'bazi-2000-0101-zi-early',
    input: {
      gender: '女',
      calendarType: '公历',
      birthDate: '2000-01-01',
      birthHour: '早子时 00:00-01:00',
    },
    expect: {
      pillars: '己卯 丙子 戊午 壬子',
      dayMaster: '戊',
      timeIndex: 0,
    },
  },
  {
    id: 'bazi-1988-0220-xu',
    input: {
      gender: '男',
      calendarType: '公历',
      birthDate: '1988-02-20',
      birthHour: '戌时 19:00-21:00',
    },
    expect: {
      pillars: '戊辰 甲寅 乙巳 丙戌',
      dayMaster: '乙',
    },
  },
  {
    id: 'bazi-1990-0515-late-zi',
    input: {
      gender: '男',
      calendarType: '公历',
      birthDate: '1990-05-15',
      birthHour: '晚子时 23:00-00:00',
    },
    expect: {
      pillars: '庚午 辛巳 庚辰 戊子',
      dayMaster: '庚',
      timeIndex: 12,
      crossStatus: 'sect_diff' as const,
    },
  },
  {
    id: 'bazi-leap-2020-04-01',
    input: {
      gender: '女',
      calendarType: '农历',
      birthDate: '2020-04-01',
      birthHour: '午时 11:00-13:00',
      isLeapMonth: true,
    },
    expect: {
      pillars: '庚子 辛巳 丙寅 甲午',
      dayMaster: '丙',
      solarYmd: '2020-5-23',
    },
  },
]

/** 立春换年/月柱：午时取样，跨立春前后日 */
export const JIEQI_GOLDEN = {
  before: {
    id: 'jieqi-2024-0203-before-lichun',
    input: {
      gender: '男',
      calendarType: '公历',
      birthDate: '2024-02-03',
      birthHour: '午时 11:00-13:00',
    },
    expect: { pillars: '癸卯 乙丑 丁酉 丙午' },
  },
  after: {
    id: 'jieqi-2024-0205-after-lichun',
    input: {
      gender: '男',
      calendarType: '公历',
      birthDate: '2024-02-05',
      birthHour: '午时 11:00-13:00',
    },
    expect: { pillars: '甲辰 丙寅 己亥 庚午' },
  },
  /** 2024 立春精确 16:27:07 — 分钟精度下 16:26 / 16:28 换柱 */
  hourLevel: {
    id: 'jieqi-2024-0204-lichun-hour',
    birthDate: '2024-02-04',
    exactIso: '2024-02-04 16:27:07',
    beforeClock: '16:26',
    afterClock: '16:28',
    expectBefore: '癸卯 乙丑 戊戌 庚申',
    expectAfter: '甲辰 丙寅 戊戌 庚申',
    expectNearAt1620: true,
  },
}

export const ZIWEI_GOLDEN = [
  {
    id: 'zw-1990-0515-wu',
    input: {
      gender: '男',
      calendarType: '公历',
      birthDate: '1990-05-15',
      birthHour: '午时 11:00-13:00',
    },
    expect: {
      mingGongBranch: 11,
      wuxingJuName: '土五局',
      mingMajors: '天梁',
    },
  },
  {
    id: 'zw-1990-0515-early-zi',
    input: {
      gender: '男',
      calendarType: '公历',
      birthDate: '1990-05-15',
      birthHour: '早子时 00:00-01:00',
    },
    expect: {
      mingMajors: '天梁',
    },
  },
  {
    id: 'zw-1990-0515-late-zi',
    input: {
      gender: '男',
      calendarType: '公历',
      birthDate: '1990-05-15',
      birthHour: '晚子时 23:00-00:00',
    },
    expect: {
      mingMajors: '武曲,破军',
    },
  },
  {
    id: 'zw-leap-2020-04-01',
    input: {
      gender: '女',
      calendarType: '农历',
      birthDate: '2020-04-01',
      birthHour: '午时 11:00-13:00',
      isLeapMonth: true,
    },
    expect: {
      mingGongBranch: 11,
      wuxingJuName: '土五局',
      mingMajors: '太阴',
    },
  },
]

/** 真太阳时：乌鲁木齐经度应足以改变接近交界的钟点 */
export const TRUE_SOLAR_HARD = {
  province: '新疆维吾尔自治区',
  city: '乌鲁木齐',
  year: 1990,
  month: 6,
  day: 15,
  hour: 11,
  minute: 5,
  expectChanged: true,
  expectOriginalIndex: 6,
  expectCorrectedIndex: 4,
}

/** 边界双盘用例 */
export const BOUNDARY_DUAL_CASES = [
  {
    id: 'boundary-1055-si-wu',
    birthDate: '1990-05-15',
    birthClock: '10:55',
    birthHour: '巳时 09:00-11:00',
    expectNear: true,
    expectCurrentIndex: 5,
    expectAlternateIndex: 6,
    ziwei: {
      mingMajorsA: '破军',
      mingMajorsB: '天梁',
      mingGongChanged: true,
    },
    bazi: {
      snapA: '庚午 辛巳 庚辰 辛巳',
      snapB: '庚午 辛巳 庚辰 壬午',
      pillarsChanged: true,
    },
  },
  {
    id: 'boundary-2250-hai-latezi',
    birthDate: '1990-05-15',
    birthClock: '22:50',
    birthHour: '亥时 21:00-23:00',
    expectNear: true,
    expectCurrentIndex: 11,
    expectAlternateIndex: 12,
    ziwei: {
      mingMajorsA: '破军',
      mingMajorsB: '武曲、破军',
      mingGongChanged: true,
    },
    bazi: {
      snapA: '庚午 辛巳 庚辰 丁亥',
      snapB: '庚午 辛巳 庚辰 戊子',
      pillarsChanged: true,
    },
  },
]

/** @deprecated 兼容旧单例引用 */
export const BOUNDARY_DUAL_CASE = BOUNDARY_DUAL_CASES[0]
