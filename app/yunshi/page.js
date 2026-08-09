import { Suspense } from 'react'
import YunshiClient from './YunshiClient'

export default function YunshiPage() {
  return (
    <Suspense fallback={<div className="page-shell min-h-screen" />}>
      <YunshiClient />
    </Suspense>
  )
}
