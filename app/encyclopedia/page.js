import Link from 'next/link'
import NavBar from '../components/NavBar'
import { DIVINATION_ENCYCLOPEDIA } from '@/lib/knowledge/divination-encyclopedia'
import { DIVINATION_CLASSICS } from '@/lib/knowledge/divination-classics'

export const metadata = {
  title: '术数百科 · 灵镜',
  description: '梅花、六爻、奇门、大六壬、太乙、皇极、铁板等术语百科与原典选章',
}

export default function EncyclopediaPage() {
  const bySystem = DIVINATION_ENCYCLOPEDIA.reduce((acc, e) => {
    ;(acc[e.system] ||= []).push(e)
    return acc
  }, /** @type {Record<string, typeof DIVINATION_ENCYCLOPEDIA>} */ ({}))

  return (
    <main className="min-h-screen pt-20 pb-16">
      <NavBar />
      <div className="app-container max-w-3xl">
        <h1 className="text-2xl font-semibold text-[var(--gold-bright)]">术数百科</h1>
        <p className="mt-2 text-sm text-[rgba(245,234,210,0.55)]">
          与排盘引擎术语表绑定，供 citation 白名单与用户教育。紫微 14 主星见{' '}
          <Link href="/knowledge" className="text-[var(--gold-bright)]">
            /knowledge
          </Link>
          。
        </p>
        {Object.entries(bySystem).map(([sys, entries]) => (
          <section key={sys} className="mt-8">
            <h2 className="text-xs tracking-[0.2em] text-[rgba(245,234,210,0.4)] mb-3">{sys}</h2>
            <div className="space-y-3">
              {entries.map((e) => (
                <article key={e.slug} className="card p-4">
                  <h3 className="text-sm text-[var(--gold-bright)]">{e.title}</h3>
                  <p className="mt-1 text-xs text-[rgba(245,234,210,0.55)]">{e.summary}</p>
                  <p className="mt-2 text-sm text-[rgba(245,234,210,0.7)] leading-relaxed">{e.body}</p>
                  <p className="mt-2 text-[10px] text-[rgba(245,234,210,0.35)]">
                    术语：{e.terms.join('、')}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ))}

        <section className="mt-12">
          <h2 className="text-xs tracking-[0.2em] text-[rgba(245,234,210,0.4)] mb-3">原典选章</h2>
          <div className="space-y-3">
            {DIVINATION_CLASSICS.map((c) => (
              <article key={c.slug} className="card p-4">
                <h3 className="text-sm text-[var(--gold-bright)]">{c.title}</h3>
                <p className="mt-1 text-[10px] text-[rgba(245,234,210,0.4)]">
                  {c.source} · {c.dynasty} · {c.system}
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-[rgba(245,234,210,0.7)] leading-relaxed">
                  {c.paragraphs.map((p, i) => (
                    <li key={`${c.slug}-${i}`}>· {p}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
