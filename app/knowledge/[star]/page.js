import Link from 'next/link'
import { notFound } from 'next/navigation'
import NavBar from '../../components/NavBar'
import {
  ALL_STARS,
  ALL_TOPICS,
  getKnowledge,
  SLUG_TO_STAR,
  STAR_BRIEF_SEO,
  STAR_TO_SLUG,
} from '@/lib/seo/knowledge'
import { TOPIC_LABEL } from '@/lib/ziwei/db-analysis'

export function generateStaticParams() {
  return ALL_STARS.map((star) => ({ star: STAR_TO_SLUG[star] }))
}

export function generateMetadata({ params }) {
  const star = SLUG_TO_STAR[params.star]
  if (!star) return {}
  return {
    title: `${star}星 · 命理百科 · 灵镜`,
    description: STAR_BRIEF_SEO[star],
  }
}

export default function StarKnowledgePage({ params }) {
  const star = SLUG_TO_STAR[params.star]
  if (!star) notFound()

  return (
    <div className="page-shell">
      <NavBar />
      <main className="app-container relative z-10 pt-28 pb-16 max-w-3xl">
        <Link href="/knowledge" className="btn-ghost !text-xs !px-0">← 百科首页</Link>

        <div className="mt-6 mb-8">
          <p className="text-xs tracking-[0.16em] text-[var(--gold-bright)]">14 MAJOR STARS</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#fff6e2]">{star}星</h1>
          <p className="mt-3 text-sm text-[rgba(245,234,210,0.55)] leading-relaxed">
            {STAR_BRIEF_SEO[star]}
          </p>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--line)] text-xs tracking-[0.16em] text-[var(--gold-bright)]">
            TOPICS
          </div>
          <div className="divide-y divide-[var(--line)]">
            {ALL_TOPICS.map((t) => {
              const k = getKnowledge(star, t)
              if (!k.exists) return null
              return (
                <Link
                  key={t}
                  href={`/knowledge/${params.star}/${t}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[rgba(245,234,210,0.04)] transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#fff6e2]">{TOPIC_LABEL[t]}</p>
                    <p className="mt-1 text-xs text-[rgba(245,234,210,0.4)]">
                      相关宫位：{k.palaceName}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--gold-bright)]">阅读 →</span>
                </Link>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
