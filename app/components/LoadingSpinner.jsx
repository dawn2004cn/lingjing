'use client'

export default function LoadingSpinner({ message = '推演中...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--line)] text-[var(--gold-bright)]">
        推
      </div>
      <div className="flex gap-2 mb-5">
        {[0, 1, 2].map(i => (
          <div key={i} className="loading-dot"
            style={{ animation: `pulseDot 1.4s ease-in-out ${i * 0.16}s infinite` }} />
        ))}
      </div>
      <p className="text-xs text-[rgba(245,234,210,0.55)] font-light tracking-[0.18em]">{message}</p>
    </div>
  )
}
