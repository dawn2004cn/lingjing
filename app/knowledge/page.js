import Link from 'next/link'
import NavBar from '../components/NavBar'
import {
  ALL_STARS,
  ALL_TOPICS,
  getKnowledge,
  STAR_BRIEF_SEO,
  STAR_TO_SLUG,
} from '@/lib/seo/knowledge'
import { TOPIC_LABEL } from '@/lib/ziwei/db-analysis'

export const metadata = {
  title: '命理百科 · 14 主星知识库 · 灵镜',
  description: '紫微斗数 14 主星 × 多宫位专题解读，含命格、性格、感情、事业等维度。',
}

export default function KnowledgeHomePage() {
  return (
    <div className="page-shell">
      <NavBar />
      <main className="app-container relative z-10 pt-28 pb-16">
        <div className="mb-8">
          <p className="text-xs tracking-[0.18em] text-[var(--gold-bright)]">KNOWLEDGE</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#fff6e2]">命理百科</h1>
          <p className="mt-2 text-sm text-[rgba(245,234,210,0.55)]">
            14 主星 × {ALL_TOPICS.length} 专题 · 基于倪海夏体系与开源古籍整理
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <Link href="/library" className="btn-ghost !text-xs">古籍原典</Link>
            <Link href="/encyclopedia" className="btn-ghost !text-xs">术数百科</Link>
            <Link href="/divination" className="btn-ghost !text-xs">占卜集大成</Link>
            <Link href="/heming" className="btn-ghost !text-xs">合盘分析</Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-10">
          {ALL_STARS.map((star) => (
            <Link
              key={star}
              href={`/knowledge/${STAR_TO_SLUG[star]}`}
              className="px-3 py-1.5 text-sm rounded-full border border-[var(--line)] text-[#fff6e2] hover:border-[var(--gold)] transition-colors"
            >
              {star}
            </Link>
          ))}
        </div>

        <div className="space-y-5">
          {ALL_STARS.map((star) => (
            <div key={star} className="card p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-[#fff6e2]">{star}星</h2>
                  <p className="mt-2 text-sm text-[rgba(245,234,210,0.55)] max-w-2xl leading-relaxed">
                    {STAR_BRIEF_SEO[star]}
                  </p>
                </div>
                <Link
                  href={`/knowledge/${STAR_TO_SLUG[star]}`}
                  className="text-xs text-[var(--gold-bright)]"
                >
                  查看全部 →
                </Link>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {ALL_TOPICS.map((t) => {
                  const k = getKnowledge(star, t)
                  if (!k.exists) return null
                  return (
                    <Link
                      key={t}
                      href={`/knowledge/${STAR_TO_SLUG[star]}/${t}`}
                      className="text-[11px] px-2.5 py-1 rounded-full border border-[var(--line)] text-[rgba(245,234,210,0.6)] hover:text-[#fff6e2] hover:border-[var(--gold)] transition-colors"
                    >
                      {TOPIC_LABEL[t]}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
