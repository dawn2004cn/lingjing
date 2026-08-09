import Link from 'next/link'
import NavBar from '../components/NavBar'
import { ALL_BOOKS, TOTAL_PARAGRAPHS } from '@/lib/classics'
import LibrarySearch from './LibrarySearch'

export const metadata = {
  title: '古籍原典库 · 灵镜',
  description: '紫微斗数权威古籍全文检索：《骨髓赋》《紫微斗数全集》《紫微斗数全书》',
}

export default function LibraryHomePage() {
  return (
    <div className="page-shell">
      <NavBar />
      <main className="app-container relative z-10 pt-28 pb-16">
        <div className="mb-8">
          <p className="text-xs tracking-[0.18em] text-[var(--gold-bright)]">CLASSICS</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#fff6e2]">古籍原典库</h1>
          <p className="mt-2 text-sm text-[rgba(245,234,210,0.55)]">
            收录 {ALL_BOOKS.length} 部古籍 · 共 {TOTAL_PARAGRAPHS} 段精华 · 公版可自由查阅
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <Link href="/knowledge" className="btn-ghost !text-xs">命理百科</Link>
            <Link href="/heming" className="btn-ghost !text-xs">合盘分析</Link>
          </div>
        </div>

        <div className="card p-5 md:p-6 mb-8">
          <LibrarySearch />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {ALL_BOOKS.map((book) => (
            <Link
              key={book.slug}
              href={`/library/${book.slug}`}
              className="card p-5 block hover:border-[rgba(242,207,122,0.42)] transition-colors"
            >
              <p className="text-xs text-[rgba(245,234,210,0.45)]">
                {book.dynasty} · {book.author.split(' ')[0]}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[#fff6e2]">《{book.title}》</h2>
              <p className="mt-3 text-sm text-[rgba(245,234,210,0.55)] leading-relaxed line-clamp-4">
                {book.intro}
              </p>
              <p className="mt-4 text-xs text-[var(--gold-bright)]">
                {book.chapters.length} 章 ·{' '}
                {book.chapters.reduce((s, c) => s + c.paragraphs.length, 0)} 段 →
              </p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
