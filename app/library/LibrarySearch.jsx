'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ALL_BOOKS, searchClassics } from '@/lib/classics'

export default function LibrarySearch() {
  const [q, setQ] = useState('')
  const hits = useMemo(() => (q.trim() ? searchClassics(q.trim(), 20) : []), [q])

  return (
    <div className="space-y-4">
      <input
        className="input-base"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`在 ${ALL_BOOKS.length} 部古籍中搜索关键词…`}
      />
      {q.trim() && (
        <div className="space-y-3">
          {hits.length === 0 ? (
            <p className="text-sm text-[rgba(245,234,210,0.45)]">未找到匹配段落</p>
          ) : (
            hits.map((h) => (
              <Link
                key={`${h.bookSlug}-${h.paragraphId}`}
                href={`/library/${h.bookSlug}/${h.chapterIdx}#${h.paragraphId}`}
                className="block card p-4 hover:border-[rgba(242,207,122,0.4)] transition-colors"
              >
                <p className="text-xs text-[var(--gold-bright)]">
                  《{h.bookTitle}》 · {h.chapterTitle}
                </p>
                <p
                  className="mt-2 text-sm text-[rgba(247,236,215,0.75)] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: h.snippet }}
                />
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}
