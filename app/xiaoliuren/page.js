'use client'

import NavBar from '../components/NavBar'
import CastPanel from '../components/CastPanel'

const today = () => new Date().toISOString().slice(0, 10)

export default function XiaoliurenPage() {
  return (
    <main className="min-h-screen pt-20 pb-16">
      <NavBar />
      <div className="app-container max-w-2xl">
        <CastPanel
          system="xiaoliuren"
          title="小六壬"
          blurb="农历月、日、时三宫顺推，落大安、留连、速喜、赤口、小吉、空亡。"
          fields={[
            { key: 'date', label: '日期', type: 'date' },
            { key: 'clock', label: '钟点', type: 'time' },
            {
              key: 'count',
              label: '报数偏移（可选 0–5）',
              type: 'number',
              placeholder: '0',
            },
            { key: 'matter', label: '事项类型', type: 'text', placeholder: '求财/出行/婚姻…' },
            { key: 'question', label: '问事', type: 'textarea', full: true },
          ]}
          initial={{ date: today(), clock: '12:00', count: 0 }}
        />
      </div>
    </main>
  )
}
