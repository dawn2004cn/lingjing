'use client'

import { useEffect, useRef } from 'react'
import { AuthProvider } from './components/AuthContext'

export default function ClientLayout({ children }) {
  const tracked = useRef(false)

  useEffect(() => {
    // Track visit once per session
    if (!tracked.current) {
      tracked.current = true
      const sent = sessionStorage.getItem('visit_tracked')
      if (!sent) {
        fetch('/api/visits', { method: 'POST' }).catch(() => {})
        try { sessionStorage.setItem('visit_tracked', '1') } catch {}
      }
    }
  }, [])

  return <AuthProvider>{children}</AuthProvider>
}