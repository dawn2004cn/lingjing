/**
 * 小六壬 / 铁板 / 奇门旁证 / 八字调候锁定用例
 */

export const XIAOLIUREN_GOLDEN = [
  {
    id: 'xlr-20240615-求财',
    input: { date: '2024-06-15', clock: '10:00', matter: '求财' },
    expect: {
      yueGong: '小吉',
      riGong: '留连',
      shiGong: '大安',
      matterKey: '求财',
      hintIncludes: '财路稳',
    },
  },
  {
    id: 'xlr-20240101-出行',
    input: { date: '2024-01-01', clock: '00:30', matter: '出行' },
    expect: {
      yueGong: '小吉',
      riGong: '空亡',
      shiGong: '空亡',
      matterKey: '出行',
      hintIncludes: '不宜远行',
    },
  },
  {
    id: 'xlr-20230909-婚姻',
    input: { date: '2023-09-09', clock: '15:00', matter: '婚姻' },
    expect: {
      yueGong: '大安',
      riGong: '大安',
      shiGong: '速喜',
      matterKey: '婚姻',
      hintIncludes: '喜讯',
    },
  },
] as const

/** 铁板结构哈希锁定（演示数，非古典） */
export const TIEBAN_GOLDEN = [
  {
    id: 'tieban-19900515-午-男',
    input: {
      gender: '男' as const,
      birthDate: '1990-05-15',
      birthHour: '午时',
      calendarType: '公历' as const,
    },
    expect: {
      xianTianMingShu: 6,
      benMingShu: 9342,
      kaoKe: '二刻',
      piGua: '乾',
      versesAvailable: false,
      numbersAreDemoHash: true,
    },
  },
] as const

/**
 * 奇门：主引擎锁定 + MIT 旁证快照（旁证与主盘局数可不一致）
 * juAlign 期望在旁证包可用时成立。
 */
export const QIMEN_WITNESS_GOLDEN = [
  {
    id: 'qm-20240615-1200',
    input: { date: '2024-06-15', clock: '12:00' },
    engine: {
      jieQi: '芒种',
      yangDun: true,
      ju: 8,
      zhiFuStar: '天蓬',
      zhiShiDoor: '休',
    },
    witness: {
      juIncludes: '阳遁六局',
      fuIncludes: '天柱',
      shiIncludes: '惊门',
      juAlign: 'diff' as const,
    },
  },
  {
    id: 'qm-20240105-1000',
    input: { date: '2024-01-05', clock: '10:00' },
    engine: {
      jieQi: '冬至',
      yangDun: true,
      ju: 1,
      zhiFuStar: '天蓬',
      zhiShiDoor: '休',
    },
    witness: {
      juIncludes: '阳遁一局',
      fuIncludes: '天心',
      shiIncludes: '开门',
      juAlign: 'match' as const,
    },
  },
] as const

/** 八字调候锁定 */
export const BAZI_TIAOHOU_GOLDEN = [
  {
    id: 'bazi-19900515-调候',
    input: {
      gender: '男' as const,
      birthDate: '1990-05-15',
      birthHour: '午时',
      calendarType: '公历' as const,
    },
    expect: {
      dayMaster: '庚',
      monthZhi: '巳',
      tiaoHouSeason: '孟夏',
      tiaoHouNeedIncludes: '水',
      strength: '偏强',
    },
  },
] as const

/** 大六壬课式锁定 */
export const DALIUREN_GOLDEN = [
  {
    id: 'dlr-20240615-day',
    input: { date: '2024-06-15', clock: '12:00', dayNight: 'day' as const },
    expect: {
      jieQi: '芒种',
      yueJiang: '申',
      guiRen: '丑',
      xunKong: '寅卯',
      chu: '子',
      zhong: '寅',
      mo: '辰',
      methodIncludes: '比用',
    },
  },
  {
    id: 'dlr-20240105-day',
    input: { date: '2024-01-05', clock: '10:00', dayNight: 'day' as const },
    expect: {
      jieQi: '冬至',
      yueJiang: '丑',
      guiRen: '丑',
      xunKong: '戌亥',
      chu: '子',
      zhong: '申',
      mo: '辰',
      methodIncludes: '贼克',
    },
  },
  {
    id: 'dlr-20231222-night-bazhuan',
    input: { date: '2023-12-22', clock: '08:00', dayNight: 'night' as const },
    expect: {
      jieQi: '冬至',
      yueJiang: '丑',
      guiRen: '未',
      xunKong: '子丑',
      chu: '丑',
      zhong: '戌',
      mo: '未',
      methodIncludes: '八专',
    },
  },
] as const

/** 金口诀四位锁定 */
export const JINKOU_GOLDEN = [
  {
    id: 'jk-20240615-午',
    input: { date: '2024-06-15', clock: '12:00', difen: '午', dayNight: 'day' as const },
    expect: {
      difen: '午',
      yueJiang: '申',
      guiRen: '丑',
      renGan: '壬',
      guiName: '青龙',
      jiangZhi: '申',
      xunKong: '寅卯',
      summaryIncludes: '用被体克',
    },
  },
  {
    id: 'jk-20240105-子',
    input: { date: '2024-01-05', clock: '10:00', difen: '子', dayNight: 'day' as const },
    expect: {
      difen: '子',
      yueJiang: '丑',
      guiRen: '丑',
      renGan: '壬',
      guiName: '天后',
      jiangZhi: '申',
      xunKong: '戌亥',
      summaryIncludes: '用生体',
    },
  },
] as const

/** 梅花应期/体用锁定 */
export const MEIHUA_GOLDEN = [
  {
    id: 'mh-num-1-1-1',
    input: { method: 'number' as const, num1: 1, num2: 1, num3: 1 },
    expect: {
      ben: '乾为天',
      dongYao: 1,
      relation: '比和',
      yingPace: '中',
      yingCount: 1,
    },
  },
  {
    id: 'mh-num-3-5-2',
    input: { method: 'number' as const, num1: 3, num2: 5, num3: 2 },
    expect: {
      ben: '火风鼎',
      dongYao: 2,
      relation: '用生体',
      yingPace: '近',
      yingCount: 2,
    },
  },
  {
    id: 'mh-time-20240615',
    input: { method: 'time' as const, date: '2024-06-15', clock: '12:00' },
    expect: {
      ben: '雷火丰',
      dongYao: 3,
      relation: '体生用',
      yingPace: '远',
      yingCount: 3,
    },
  },
] as const
