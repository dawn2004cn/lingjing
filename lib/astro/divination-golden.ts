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
