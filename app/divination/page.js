import Link from 'next/link'
import NavBar from '../components/NavBar'
import { listSystems } from '@/lib/divination/registry'

export const metadata = {
  title: '占卜集大成 · 灵镜',
  description: '梅花、六爻、小六壬、奇门、大六壬、太乙、皇极、铁板等统一准确度管道',
}

const CAT = {
  mingli: '命理',
  zhanbu: '占卜',
  research: '研究级',
}

export default function DivinationHubPage() {
  const systems = listSystems()
  const groups = ['mingli', 'zhanbu', 'research'].map((c) => ({
    key: c,
    label: CAT[c],
    items: systems.filter((s) => s.category === c),
  }))

  return (
    <main className="min-h-screen pt-20 pb-16">
      <NavBar />
      <div className="app-container max-w-3xl">
        <h1 className="text-2xl font-semibold text-[var(--gold-bright)]">占卜 · 集大成</h1>
        <p className="mt-2 text-sm text-[rgba(245,234,210,0.55)] leading-relaxed">
          统一管道：确定性排盘 → 规则事实 →（可选）LLM 润色。命理看终身气运，占卜看一事一时，研究级模块明确边界。
        </p>
        {groups.map((g) => (
          <section key={g.key} className="mt-8">
            <h2 className="text-xs tracking-[0.2em] text-[rgba(245,234,210,0.4)] mb-3">{g.label}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {g.items.map((s) => (
                <Link
                  key={s.id}
                  href={s.href}
                  className="card p-4 hover:border-[var(--gold)]/40 transition-colors"
                >
                  <div className="text-sm text-[var(--gold-bright)]">{s.name}</div>
                  <div className="mt-1 text-xs text-[rgba(245,234,210,0.5)] leading-relaxed">{s.blurb}</div>
                  <div className="mt-2 text-[10px] text-[rgba(245,234,210,0.35)]">{s.engine}</div>
                  {s.researchOnly && (
                    <div className="mt-2 text-[10px] text-[rgba(215,168,74,0.75)]">研究级</div>
                  )}
                  {s.requiresHumanReview && (
                    <div className="mt-2 text-[10px] text-[rgba(196,92,74,0.9)]">须人工复核</div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        ))}
        <p className="mt-8 text-xs text-[rgba(245,234,210,0.4)]">
          口径说明见 <Link href="/accuracy" className="text-[var(--gold-bright)]">/accuracy</Link>
          ，系统登记见仓库 docs/SYSTEMS.md。
        </p>
      </div>
    </main>
  )
}
