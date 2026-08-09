/**
 * 各术数公版原典选章（结构化，供百科/citation）
 * 仅收录公有领域通行文本摘录，不作商业断语库。
 */

export type ClassicExcerpt = {
  system: string
  slug: string
  title: string
  source: string
  dynasty: string
  paragraphs: string[]
  terms: string[]
}

export const DIVINATION_CLASSICS: ClassicExcerpt[] = [
  {
    system: 'bazi',
    slug: 'yuanhai-ziping-excerpt',
    title: '渊海子平 · 论日主（选）',
    source: '《渊海子平》',
    dynasty: '宋',
    paragraphs: [
      '日主者，日干也，以日干为主，看其生旺死绝，以定其身之强弱。',
      '月令者，提纲也。用神喜忌，先观月令，次及透干与地支生克。',
    ],
    terms: ['日主', '月令', '用神', '提纲'],
  },
  {
    system: 'meihua',
    slug: 'meihua-yishu-excerpt',
    title: '梅花易数 · 起卦总义（选）',
    source: '《梅花易数》（传邵雍）',
    dynasty: '宋',
    paragraphs: [
      '万物皆数，数中有理。以数起卦，以卦观象，以象玩辞。',
      '体用者，体为自己，用为所问之事。体克用吉，用克体凶；用生体吉，体生用泄。',
    ],
    terms: ['体用', '本卦', '互卦', '变卦'],
  },
  {
    system: 'liuyao',
    slug: 'zhouyi-qian-excerpt',
    title: '周易 · 乾卦（选）',
    source: '《周易》',
    dynasty: '周',
    paragraphs: [
      '乾：元亨利贞。',
      '初九：潜龙勿用。九二：见龙在田，利见大人。九三：君子终日乾乾，夕惕若，厉无咎。',
      '九四：或跃在渊，无咎。九五：飞龙在天，利见大人。上九：亢龙有悔。',
    ],
    terms: ['乾', '元亨利贞', '爻'],
  },
  {
    system: 'xiaoliuren',
    slug: 'xiaoliuren-gesong',
    title: '小六壬 · 六神歌（通行）',
    source: '民间通行歌诀',
    dynasty: '不详',
    paragraphs: [
      '大安事事昌，求谋在远方；失物去不远，宅舍保安康。',
      '留连事难成，求谋日未明；官事只宜缓，去者未回程。',
      '速喜喜来临，求财向至诚；失物申未午，逢人路上寻。',
    ],
    terms: ['大安', '留连', '速喜', '赤口', '小吉', '空亡'],
  },
  {
    system: 'qimen',
    slug: 'qimen-bamen-excerpt',
    title: '奇门 · 八门大义（选）',
    source: '《奇门遁甲》通行本',
    dynasty: '不详',
    paragraphs: [
      '休门主休息安宁，生门主生意田产，伤门主搏击争斗，杜门主闭塞隐遁。',
      '景门主文书光明，死门主衰败丧吊，惊门主惊恐官非，开门主开通顺遂。',
    ],
    terms: ['休门', '生门', '伤门', '杜门', '景门', '死门', '惊门', '开门'],
  },
  {
    system: 'daliuren',
    slug: 'liuren-sike-excerpt',
    title: '大六壬 · 四课三传总义（选）',
    source: '《大六壬大全》选义',
    dynasty: '明',
    paragraphs: [
      '月将加正时，视干支之阴阳，而得四课。',
      '三传者，初传发用，中传导气，末传归宿。贼克比用涉害遥克昴星别责，各有其门。',
    ],
    terms: ['四课', '三传', '月将', '贼克', '涉害'],
  },
  {
    system: 'taiyi',
    slug: 'taiyi-jinjing-excerpt',
    title: '太乙 · 积年总义（选）',
    source: '《太乙金镜式经》选义',
    dynasty: '唐',
    paragraphs: [
      '太乙者，天帝之神，主十六神将运行于十六宫，以占天时国运。',
      '积年之法，自上元甲子累计，分年计、月计、日计、時計，各有阴阳遁局。',
    ],
    terms: ['太乙', '积年', '十六神将', '年计'],
  },
  {
    system: 'huangji',
    slug: 'huangji-yuanhui-excerpt',
    title: '皇极经世 · 元会运世（选）',
    source: '《皇极经世》',
    dynasty: '宋',
    paragraphs: [
      '一元统十二会，一会统三十运，一运统十二世，一世统三十年。',
      '以元会运世配易卦，观天地消长、人事盛衰之大势，非琐屑占验之术。',
    ],
    terms: ['元', '会', '运', '世'],
  },
  {
    system: 'tieban',
    slug: 'tieban-disclaimer',
    title: '铁板神数 · 结构说明（无条文）',
    source: '灵镜产品说明',
    dynasty: '现代',
    paragraphs: [
      '铁板神数由四柱推考刻、本命数，再匹配断语条文。条文多涉近现代著作权。',
      '灵镜仅提供结构排盘演示；未获授权不得上线商业断语库，模型不得编造条文编号与诗句。',
    ],
    terms: ['本命数', '考刻', '十二辟卦'],
  },
]

export function listClassicsBySystem(system?: string) {
  if (!system) return DIVINATION_CLASSICS
  return DIVINATION_CLASSICS.filter((c) => c.system === system)
}
