/** 时辰选项：含早晚子（对齐 iztro 0–12） */
export const CHINESE_HOURS = [
  { value: '', label: '选择时辰' },
  { value: '早子时 00:00-01:00', label: '早子时 (00:00-01:00)' },
  { value: '丑时 01:00-03:00', label: '丑时 (01:00-03:00)' },
  { value: '寅时 03:00-05:00', label: '寅时 (03:00-05:00)' },
  { value: '卯时 05:00-07:00', label: '卯时 (05:00-07:00)' },
  { value: '辰时 07:00-09:00', label: '辰时 (07:00-09:00)' },
  { value: '巳时 09:00-11:00', label: '巳时 (09:00-11:00)' },
  { value: '午时 11:00-13:00', label: '午时 (11:00-13:00)' },
  { value: '未时 13:00-15:00', label: '未时 (13:00-15:00)' },
  { value: '申时 15:00-17:00', label: '申时 (15:00-17:00)' },
  { value: '酉时 17:00-19:00', label: '酉时 (17:00-19:00)' },
  { value: '戌时 19:00-21:00', label: '戌时 (19:00-21:00)' },
  { value: '亥时 21:00-23:00', label: '亥时 (21:00-23:00)' },
  { value: '晚子时 23:00-00:00', label: '晚子时 (23:00-00:00)' },
]

export const emptyBirthExtras = () => ({
  birthClock: '',
  isLeapMonth: false,
  useTrueSolar: false,
  province: '',
  city: '',
  /** 八字日柱流派：2=23时不跨日（默认），1=23时换日 */
  daySect: 2,
  /** 紫微运限口径：ni=倪师（默认）；feixing=飞星 */
  ziweiSchool: 'ni',
})
