'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from './AuthContext'

const NAV_LINKS = [
  { href: '/', label: '排盘' },
  { href: '/heming', label: '合盘' },
  { href: '/yunshi', label: '运势' },
  { href: '/history', label: '历史' },
  { href: '/accuracy', label: '准确度' },
  { href: '/library', label: '古籍' },
  { href: '/knowledge', label: '百科' },
]

export default function NavBar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  return (
    <nav className="glass-nav fixed top-0 left-0 right-0 z-50">
      <div className="app-container h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/" className="flex items-center gap-3 text-sm font-semibold text-[#fff6e2] tracking-wide shrink-0">
            <span className="brand-mark">灵</span>
            <span className="hidden sm:inline">灵镜</span>
          </Link>
          <div className="flex items-center gap-0.5 overflow-x-auto">
            {NAV_LINKS.map((l) => {
              const active = l.href === '/'
                ? pathname === '/'
                : pathname === l.href || pathname.startsWith(`${l.href}/`)
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`btn-ghost !text-xs whitespace-nowrap ${active ? '!text-[var(--gold-bright)]' : ''}`}
                >
                  {l.label}
                </Link>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {user ? (
            <>
              <span className="hidden md:inline text-xs text-[rgba(245,234,210,0.55)] mr-1.5">{user.username}</span>
              <Link href="/profile" className="btn-ghost !text-xs">密码</Link>
              {user.role === 'admin' && <Link href="/admin" className="btn-ghost !text-xs">管理</Link>}
              <button onClick={logout} className="btn-ghost !text-xs">退出</button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost !text-xs">登录</Link>
              <Link href="/register" className="btn-ghost !text-xs">注册</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
