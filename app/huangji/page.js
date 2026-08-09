'use client'

import NavBar from '../components/NavBar'
import CastPanel from '../components/CastPanel'

export default function HuangjiPage() {
  return (
    <main className="min-h-screen pt-20 pb-16">
      <NavBar />
      <div className="app-container max-w-2xl">
        <CastPanel
          system="huangji"
          title="皇极经世"
          blurb="元会运世长时段定位。偏历史年表与宏观研究，非一事一占主路径。"
          researchOnly
          fields={[
            { key: 'year', label: '公元年', type: 'number' },
            { key: 'month', label: '月', type: 'number' },
            { key: 'day', label: '日', type: 'number' },
            { key: 'question', label: '备注', type: 'textarea', full: true },
          ]}
          initial={{ year: new Date().getFullYear(), month: 1, day: 1 }}
        />
      </div>
    </main>
  )
}
