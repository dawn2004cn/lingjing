import { Suspense } from 'react'
import HomeClient from './HomeClient'

export default function HomePage() {
  return (
    <Suspense fallback={<div className="page-shell min-h-screen" />}>
      <HomeClient />
    </Suspense>
  )
}
