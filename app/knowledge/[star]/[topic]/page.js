import Link from 'next/link'
import { notFound } from 'next/navigation'
import NavBar from '../../../components/NavBar'
import {
  ALL_STARS,
  ALL_TOPICS,
  getAllKnowledgeRoutes,
  getKnowledge,
  SLUG_TO_STAR,
  STAR_TO_SLUG,
} from '@/lib/seo/knowledge'
import { TOPIC_LABEL } from '@/lib/ziwei/db-analysis'

export function generateStaticParams() {
  return getAllKnowledgeRoutes().map((r) => ({
    star: r.slug,
    topic: r.topic,
  }))
}

export function generateMetadata({ params }) {
  const star = SLUG_TO_STAR[params.star]
  if (!star || !ALL_TOPICS.includes(params.topic)) return {}
  const data = getKnowledge(star, params.topic)
  return {
    title: `${star} · ${TOPIC_LABEL[params.topic]} · 灵镜百科`,
    description: data.parsed.dingdiao || data.parsed.lundian || `${star}星专题`,
  }
}

function Block({ title, body }) {
  if (!body) return null
  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold tracking-[0.12em] text-[var(--gold-bright)] mb-3">
        {title}
      </h2>
      <div className="text-[0.95rem] leading-[1.9] text-[rgba(247,236,215,0.78)] whitespace-pre-wrap">
        {body}
      </div>
    </section>
  )
}

export default function TopicPage({ params }) {
  const star = SLUG_TO_STAR[params.star]
  const topic = params.topic
  if (!star || !ALL_TOPICS.includes(topic)) notFound()

  const data = getKnowledge(star, topic)
  if (!data.exists) notFound()

  const starIdx = ALL_STARS.indexOf(star)
  const topicIdx = ALL_TOPICS.indexOf(topic)

  return (
    <div className="page-shell">
      <NavBar />
      <main className="app-container relative z-10 pt-28 pb-16 max-w-3xl">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <Link href="/knowledge" className="btn-ghost !text-xs !px-0">百科</Link>
          <span className="text-[rgba(245,234,210,0.25)]">/</span>
          <Link href={`/knowledge/${params.star}`} className="btn-ghost !text-xs !px-0">
            {star}星
          </Link>
        </div>

        <div className="mt-6 mb-8">
          <p className="text-xs tracking-[0.16em] text-[var(--gold-bright)]">
            {data.palaceName} · {TOPIC_LABEL[topic]}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[#fff6e2]">
            {star} · {TOPIC_LABEL[topic]}
          </h1>
        </div>

        <article className="card p-6 md:p-8">
          {data.parsed.hasMarkers ? (
            <>
              <Block title="一句话定调" body={data.parsed.dingdiao} />
              <Block title="核心论断" body={data.parsed.lundian} />
              <Block title="命盘依据" body={data.parsed.yiju} />
              <Block title="经典出处" body={data.parsed.chuchu} />
            </>
          ) : (
            <Block title="论断" body={data.parsed.lundian || data.parsed.raw} />
          )}
        </article>

        <div className="mt-8 flex flex-wrap gap-2">
          {ALL_TOPICS.map((t) => {
            const k = getKnowledge(star, t)
            if (!k.exists) return null
            return (
              <Link
                key={t}
                href={`/knowledge/${params.star}/${t}`}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  t === topic
                    ? 'border-[var(--gold)] text-[var(--gold-bright)]'
                    : 'border-[var(--line)] text-[rgba(245,234,210,0.55)] hover:border-[var(--gold)]'
                }`}
              >
                {TOPIC_LABEL[t]}
              </Link>
            )
          })}
        </div>

        <div className="mt-8 flex justify-between text-xs">
          {starIdx > 0 ? (
            <Link
              href={`/knowledge/${STAR_TO_SLUG[ALL_STARS[starIdx - 1]]}/${topic}`}
              className="btn-ghost !text-xs"
            >
              ← {ALL_STARS[starIdx - 1]}
            </Link>
          ) : <span />}
          {starIdx < ALL_STARS.length - 1 ? (
            <Link
              href={`/knowledge/${STAR_TO_SLUG[ALL_STARS[starIdx + 1]]}/${topic}`}
              className="btn-ghost !text-xs"
            >
              {ALL_STARS[starIdx + 1]} →
            </Link>
          ) : <span />}
        </div>
        {topicIdx >= 0 && null}
      </main>
    </div>
  )
}
