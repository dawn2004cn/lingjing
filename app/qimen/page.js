'use client'

import NavBar from '../components/NavBar'
import CastPanel from '../components/CastPanel'

const today = () => new Date().toISOString().slice(0, 10)

export default function QimenPage() {
  return (
    <main className="min-h-screen pt-20 pb-16">
      <NavBar />
      <div className="app-container max-w-2xl">
        <CastPanel
          system="qimen"
          title="奇门遁甲"
          blurb="时家拆补法定局，排布地盘、天盘、九星、八门、八神。重大决策请人工复核。"
          fields={[
            { key: 'date', label: '日期', type: 'date' },
            { key: 'clock', label: '钟点', type: 'time' },
            { key: 'question', label: '问事', type: 'textarea', full: true },
          ]}
          initial={{ date: today(), clock: '12:00' }}
        />
      </div>
    </main>
  )
}
