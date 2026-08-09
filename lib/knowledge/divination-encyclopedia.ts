/**
 * 跨术数百科术语（扩展 knowledge）
 */

export type EncyclopediaEntry = {
  system: string
  slug: string
  title: string
  summary: string
  body: string
  terms: string[]
}

export const DIVINATION_ENCYCLOPEDIA: EncyclopediaEntry[] = [
  {
    system: 'meihua',
    slug: 'ti-yong',
    title: '梅花 · 体用',
    summary: '体为自己，用为所问之事；以五行生克断吉凶。',
    body: '动爻所在之卦为用，另一卦为体。体克用可进取，用克体宜缓；用生体得助，体生用耗泄。',
    terms: ['体卦', '用卦', '体用', '本卦', '互卦', '变卦'],
  },
  {
    system: 'liuyao',
    slug: 'shi-ying',
    title: '六爻 · 世应',
    summary: '世爻为我，应爻为对方或所问之对象。',
    body: '装卦后定世应：世为我方立场，应看对方、环境或事体。动爻为变化关键，之卦看结果。',
    terms: ['世', '应', '六亲', '六兽', '纳甲', '动爻'],
  },
  {
    system: 'xiaoliuren',
    slug: 'liu-shen',
    title: '小六壬 · 六神',
    summary: '大安、留连、速喜、赤口、小吉、空亡。',
    body: '由农历月起大安顺数至月、日、时得三宫，以时宫为主断。',
    terms: ['大安', '留连', '速喜', '赤口', '小吉', '空亡'],
  },
  {
    system: 'qimen',
    slug: 'ba-men',
    title: '奇门 · 八门',
    summary: '休生伤杜景死惊开，人事吉凶之门。',
    body: '时家奇门以拆补或置闰定局，值符值使巡宫。求财重生门，求官重开门，逃亡重杜门。',
    terms: ['八门', '九星', '八神', '值符', '阳遁', '阴遁', '拆补'],
  },
  {
    system: 'daliuren',
    slug: 'si-ke-san-chuan',
    title: '大六壬 · 四课三传',
    summary: '月将加时，天地盘起四课，九宗门取三传。',
    body: '一课干阳、二课干阴、三课支阳、四课支阴。贼克、比用、涉害、遥克、昴星等取初传，再推中末。',
    terms: ['四课', '三传', '月将', '贵人', '贼克', '涉害'],
  },
  {
    system: 'taiyi',
    slug: 'ji-nian',
    title: '太乙 · 积年',
    summary: '自上元甲子累计年数以起局。',
    body: '太乙与奇门、六壬合称三式，多用于国运、天时、兵事等宏观推演，不宜当作日常流年琐事主法。',
    terms: ['积年', '太乙', '文昌', '主算', '客算', '年计'],
  },
  {
    system: 'huangji',
    slug: 'yuan-hui-yun-shi',
    title: '皇极 · 元会运世',
    summary: '一元十二会，会三十运，运十二世，世三十年。',
    body: '邵雍《皇极经世》以易理分配历史时间尺度，用于长时段气运对照，非一事一占。',
    terms: ['元', '会', '运', '世', '皇极经世'],
  },
  {
    system: 'tieban',
    slug: 'ben-ming-shu',
    title: '铁板 · 本命数与考刻',
    summary: '由四柱推本命数、考刻，再匹配断语条文。',
    body: '条文库常涉著作权。灵镜仅提供结构排盘演示；未授权不得上线商业断语匹配，模型不得编造条文。',
    terms: ['本命数', '考刻', '先天命数', '十二辟卦'],
  },
  {
    system: 'bazi',
    slug: 'ziping-geju',
    title: '子平 · 格局',
    summary: '以月令用神为核心的正格与特殊格局。',
    body: '正格依月令透干与日主强弱定喜忌；从格、化气等为特殊格局，须严条件，简判不作定论。',
    terms: ['月令', '用神', '正格', '从格', '合化', '十神'],
  },
]

export function listEncyclopedia(system?: string) {
  if (!system) return DIVINATION_ENCYCLOPEDIA
  return DIVINATION_ENCYCLOPEDIA.filter((e) => e.system === system)
}

export function getEncyclopedia(system: string, slug: string) {
  return DIVINATION_ENCYCLOPEDIA.find((e) => e.system === system && e.slug === slug) || null
}
