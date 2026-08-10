import { listSystems } from '@/lib/divination/registry'
import Link from 'next/link'
import NavBar from '../components/NavBar'
import AccuracyCopyButton from '../components/AccuracyCopyButton'

const PIPELINE = [
  { step: '01', title: '确定性排盘', body: '八字用 lunar-javascript，紫微用 iztro。先定柱位 / 星曜，再谈解读。' },
  { step: '02', title: '规则事实', body: '大运、喜用、格局、叠宫、互飞均由算法生成，作为 LLM 不可改动的事实底稿。' },
  { step: '03', title: '跨引擎对照', body: 'tyme4ts 对照四柱与农历；八字、紫微、合盘、运势旁证共用日柱流派；仅 sect_diff 非硬失败。' },
  { step: '04', title: '润色护栏', body: 'LLM 只润色与追问；citation 风险过高则回退规则事实，不上屏幻觉星名。' },
]

const RULES = [
  {
    title: '日柱流派',
    items: [
      '默认流派2：23:00–23:59 日柱不跨日（对齐 tyme 流派2）',
      '可选流派1：23:00 后换日柱',
      '八字主盘与紫微历法旁证共用同一流派开关',
      '历史再读会带回当时选择的流派',
    ],
  },
  {
    title: '时间精度',
    items: [
      '精确钟点优先于时辰档；真太阳时必须钟点 + 省市',
      '真太阳时相对东经 120°，默认 Jean Meeus 均时差（失败回退 Spencer）',
      '跨时辰才改盘；跨时辰会入库标记',
      '距时辰交界 ≤20 分钟自动双盘对照',
    ],
  },
  {
    title: '紫微完整性',
    items: [
      '十四主星齐全且不重复、命宫标记自洽',
      '公历↔农历往返旁证；写入规则事实供 LLM 遵守',
      '尚无第二安星引擎时，以结构可证伪校验替代交叉安星',
    ],
  },
  {
    title: '节气换柱',
    items: [
      '十二节精确时刻前后换月柱；立春同时换年柱',
      '「立春日」整日标签 ≠ 整日已换年柱，以精确时刻为准',
      '距换月/换年节气约 90 分钟内表单即时提示',
    ],
  },
  {
    title: '多术数集大成',
    items: [
      '统一 DivinationAdapter：排盘 → 规则事实 → 可选润色',
      '占卜频道：梅花 / 六爻 / 小六壬 / 奇门 / 大六壬 / 金口诀',
      '研究级：太乙 / 皇极 / 铁板（结构演示；铁板条文冻结，哈希非古典推数）',
      '奇门/大六壬标 requiresHumanReview；CastPanel 展示 integrity/witness/pyEngine',
      '子平格局简判写入八字规则事实；登记见 docs/SYSTEMS.md',
    ],
  },
  {
    title: '生产联调提示',
    items: [
      '配置商户密钥与平台证书后设 PLAN_PAY_DRY_RUN=0；可关 PLAN_PAY_ALLOW_SECRET_NOTIFY=0 仅接受渠道验签',
    ],
  },
  {
    title: '回归保障',
    items: [
      '黄金用例锁定四柱 / 命宫 / 早晚子',
      '跨引擎：tyme4ts；八字与紫微旁证共用日柱流派',
      '2020–2026 十二节自动抽检',
      '占卜 §20 冒烟 + 小六壬/铁板锁定用例',
      'npm run test:astro；可选 npm run test:py-engine（需 PY_ENGINE_URL）',
    ],
  },
]

export const metadata = {
  title: '准确度口径 · 灵镜',
  description: '灵镜排盘与解读的准确度口径：确定性排盘、跨引擎对照、日柱流派、节气与真太阳时。',
}

export default function AccuracyPage() {
  const systems = listSystems()

  return (
    <div className="page-shell">
      <NavBar />
      <main className="app-container relative z-10 pt-28 pb-20">
        <header className="max-w-3xl">
          <p className="text-xs tracking-[0.18em] text-[var(--gold-bright)]">ACCURACY</p>
          <h1 className="mt-3 text-4xl md:text-5xl font-semibold text-[#fff6e2] tracking-wide">
            灵镜
          </h1>
          <p className="mt-4 text-base md:text-lg text-[rgba(245,234,210,0.62)] leading-relaxed">
            以排盘准确度为先：算法定盘，规则护栏，模型只润色。
            不做「市面最强」口号，只把可验证的口径写清楚。
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs">
            <Link href="/" className="btn-primary !w-auto px-4 !text-xs">去排盘</Link>
            <Link href="/divination" className="btn-ghost !text-xs border border-[var(--line)]">占卜集大成</Link>
            <Link href="/history" className="btn-ghost !text-xs border border-[var(--line)]">历史再读</Link>
            <AccuracyCopyButton />
          </div>
        </header>

        <section className="mt-14 max-w-3xl">
          <p className="text-xs tracking-[0.16em] text-[var(--gold-bright)]">PIPELINE</p>
          <h2 className="mt-2 text-2xl text-[#fff6e2]">解读流水线</h2>
          <ol className="mt-6 space-y-5">
            {PIPELINE.map((p) => (
              <li key={p.step} className="grid grid-cols-[3rem_1fr] gap-4">
                <span className="text-sm text-[var(--gold-bright)] pt-0.5">{p.step}</span>
                <div>
                  <h3 className="text-[#fff6e2] font-medium">{p.title}</h3>
                  <p className="mt-1 text-sm text-[rgba(245,234,210,0.55)] leading-relaxed">{p.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16 max-w-3xl">
          <p className="text-xs tracking-[0.16em] text-[var(--gold-bright)]">SYSTEMS</p>
          <h2 className="mt-2 text-2xl text-[#fff6e2]">已接入术数</h2>
          <div className="mt-6 space-y-3">
            {systems.map((s) => (
              <div key={s.id} className="border border-[var(--line)] rounded-md px-3 py-2.5">
                <div className="flex flex-wrap items-baseline gap-2">
                  <Link href={s.href} className="text-sm text-[var(--gold-bright)]">
                    {s.name}
                  </Link>
                  <span className="text-[10px] text-[rgba(245,234,210,0.35)]">{s.category}</span>
                  {s.researchOnly && (
                    <span className="text-[10px] text-[rgba(215,168,74,0.75)]">研究级</span>
                  )}
                  {s.requiresHumanReview && (
                    <span className="text-[10px] text-[rgba(196,92,74,0.9)]">须人工复核</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-[rgba(245,234,210,0.5)]">{s.engine}</p>
                <p className="mt-0.5 text-[10px] text-[rgba(245,234,210,0.35)]">默认：{s.defaultMethod}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 max-w-3xl">
          <p className="text-xs tracking-[0.16em] text-[var(--gold-bright)]">CONVENTIONS</p>
          <h2 className="mt-2 text-2xl text-[#fff6e2]">关键口径</h2>
          <div className="mt-6 space-y-8">
            {RULES.map((block) => (
              <div key={block.title}>
                <h3 className="text-sm tracking-wide text-[rgba(245,234,210,0.85)]">{block.title}</h3>
                <ul className="mt-3 space-y-2 text-sm text-[rgba(245,234,210,0.55)] list-disc pl-5 leading-relaxed">
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 max-w-3xl border-t border-[var(--line)] pt-8">
          <p className="text-sm text-[rgba(245,234,210,0.45)] leading-relaxed">
            引擎：lunar-javascript · tyme4ts · iztro · 自研占卜适配器。
            详细开发说明见 README 与 docs/SYSTEMS.md。
          </p>
        </section>
      </main>
    </div>
  )
}
