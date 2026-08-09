import Link from 'next/link'
import { notFound } from 'next/navigation'
import NavBar from '../../components/NavBar'
import { ALL_BOOKS, getBookBySlug } from '@/lib/classics'

export function generateStaticParams() {
  return ALL_BOOKS.map((b) => ({ book: b.slug }))
}

export function generateMetadata({ params }) {
  const book = getBookBySlug(params.book)
  if (!book) return {}
  return {
    title: `《${book.title}》· 古籍原典 · 灵镜`,
    description: book.intro,
  }
}

export default function BookPage({ params }) {
  const book = getBookBySlug(params.book)
  if (!book) notFound()

  return (
    <div className="page-shell">
      <NavBar />
      <main className="app-container relative z-10 pt-28 pb-16 max-w-3xl">
        <Link href="/library" className="btn-ghost !text-xs !px-0">← 古籍库</Link>

        <div className="mt-6 mb-8">
          <p className="text-xs text-[rgba(245,234,210,0.45)]">
            {book.dynasty} · {book.author}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[#fff6e2]">《{book.title}》</h1>
          <p className="mt-3 text-sm text-[rgba(245,234,210,0.55)] leading-relaxed">{book.intro}</p>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--line)] text-xs tracking-[0.16em] text-[var(--gold-bright)]">
            CHAPTERS
          </div>
          <div className="divide-y divide-[var(--line)]">
            {book.chapters.map((chapter, i) => (
              <Link
                key={chapter.title}
                href={`/library/${book.slug}/${i}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-[rgba(245,234,210,0.04)] transition-colors"
              >
                <span className="text-xs text-[rgba(245,234,210,0.35)] tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#fff6e2]">{chapter.title}</p>
                  {chapter.subtitle && (
                    <p className="mt-1 text-xs text-[rgba(245,234,210,0.45)]">{chapter.subtitle}</p>
                  )}
                </div>
                <span className="text-xs text-[rgba(245,234,210,0.4)]">
                  {chapter.paragraphs.length} 段 →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
