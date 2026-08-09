declare module 'lunar-javascript' {
  export class DaYun {
    getStartYear(): number
    getStartAge(): number
    getEndYear(): number
    getEndAge(): number
    getGanZhi(): string
    getIndex(): number
  }

  export class Yun {
    getStartYear(): number
    getStartMonth(): number
    getStartDay(): number
    getStartHour(): number
    getDaYun(): DaYun[]
  }

  export class EightChar {
    getYear(): string
    getMonth(): string
    getDay(): string
    getTime(): string
    getYearHideGan(): string[]
    getMonthHideGan(): string[]
    getDayHideGan(): string[]
    getTimeHideGan(): string[]
    getYearNaYin(): string
    getMonthNaYin(): string
    getDayNaYin(): string
    getTimeNaYin(): string
    getYearShiShenGan(): string
    getMonthShiShenGan(): string
    getDayShiShenGan(): string
    getTimeShiShenGan(): string
    getYearDiShi(): string
    getMonthDiShi(): string
    getDayDiShi(): string
    getTimeDiShi(): string
    /** 1=23时换日柱；2=23时不换日柱（默认） */
    setSect(sect: 1 | 2): void
    getSect(): number
    /** gender: 1 男, 0 女 */
    getYun(gender: number, sect?: number): Yun
    toString(): string
  }

  export class Lunar {
    static fromYmd(year: number, month: number, day: number): Lunar
    static fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number,
    ): Lunar
    getYear(): number
    getMonth(): number // negative = leap month
    getDay(): number
    getYearGan(): string
    getYearZhi(): string
    getMonthGan(): string
    getMonthZhi(): string
    getDayGan(): string
    getDayZhi(): string
    getSolar(): Solar
    getEightChar(): EightChar
    getJieQi(): string
    getJieQiTable(): Record<string, Solar>
    getPrevJieQi(wholeDay?: boolean): JieQi | null
    getNextJieQi(wholeDay?: boolean): JieQi | null
    toString(): string
  }

  export class JieQi {
    getName(): string
    getSolar(): Solar
  }

  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar
    static fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number,
    ): Solar
    getYear(): number
    getMonth(): number
    getDay(): number
    getHour(): number
    getMinute(): number
    getSecond(): number
    getLunar(): Lunar
    toYmd(): string
    toYmdHms(): string
  }
}
