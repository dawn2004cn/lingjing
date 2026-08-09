import Link from 'next/link'
import { notFound } from 'next/navigation'
import NavBar from '../../../components/NavBar'
import { ALL_BOOKS, getChapter } from '@/lib/classics'

export function generateStaticParams() {
  const params = []
  for (const book of ALL_BOOKS) {
    book.chapters.forEach((_, i) => {
      params.push({ book: book.slug, chapter: String(i) })
    })
  }
  return params
}

export function generateMetadata({ params }) {
  const data = getChapter(params.book, Number(params.chapter))
  if (!data) return {}
  return {
    title: `${data.chapter.title} · 《${data.book.title}》· 灵镜`,
    description: data.chapter.subtitle || data.book.intro,
  }
}

export default function ChapterPage({ params }) {
  const idx = Number(params.chapter)
  const data = getChapter(params.book, idx)
  if (!data) notFound()

  const { book, chapter } = data
  const prev = idx > 0 ? idx - 1 : null
  const next = idx < book.chapters.length - 1 ? idx + 1 : null

  return (
    <div className="page-shell">
      <NavBar />
      <main className="app-container relative z-10 pt-28 pb-16 max-w-3xl">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <Link href="/library" className="btn-ghost !text-xs !px-0">古籍库</Link>
          <span className="text-[rgba(245,234,210,0.25)]">/</span>
          <Link href={`/library/${book.slug}`} className="btn-ghost !text-xs !px-0">
            《{book.title}》
          </Link>
        </div>

        <div className="mt-6 mb-8">
          <p className="text-xs tracking-[0.16em] text-[var(--gold-bright)]">
            第 {idx + 1} 章 / 共 {book.chapters.length} 章
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[#fff6e2]">{chapter.title}</h1>
          {chapter.subtitle && (
            <p className="mt-2 text-sm text-[rgba(245,234,210,0.5)]">{chapter.subtitle}</p>
          )}
        </div>

        <article className="card p-6 md:p-8 space-y-6">
          {chapter.paragraphs.map((p) => (
            <p
              key={p.id}
              id={p.id}
              className="text-[0.98rem] leading-[2] text-[rgba(247,236,215,0.78)]"
            >
              {p.text}
            </p>
          ))}
        </article>

        <div className="mt-8 flex items-center justify-between gap-4">
          {prev !== null ? (
            <Link href={`/library/${book.slug}/${prev}`} className="btn-ghost !text-xs">
              ← {book.chapters[prev].title}
            </Link>
          ) : <span />}
          {next !== null ? (
            <Link href={`/library/${book.slug}/${next}`} className="btn-ghost !text-xs">
              {book.chapters[next].title} →
            </Link>
          ) : <span />}
        </div>
      </main>
    </div>
  )
}
