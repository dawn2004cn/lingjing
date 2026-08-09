/**
 * 小六壬 / 铁板结构锁定用例（阶段 C）
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
