'use client'

import NavBar from '../components/NavBar'
import CastPanel from '../components/CastPanel'

const today = () => new Date().toISOString().slice(0, 10)

export default function LiuyaoPage() {
  return (
    <main className="min-h-screen pt-20 pb-16">
      <NavBar />
      <div className="app-container max-w-2xl">
        <CastPanel
          system="liuyao"
          title="易经六爻"
          blurb="纳甲装卦：六亲、六兽、世应、动爻。自研实现，不引入 GPL 依赖。"
          fields={[
            {
              key: 'method',
              label: '起卦法',
              type: 'select',
              options: [
                { value: 'time', label: '时间起卦' },
                { value: 'coin', label: '铜钱模拟' },
                { value: 'manual', label: '手动六爻（下方填值）' },
              ],
            },
            { key: 'date', label: '日期', type: 'date' },
            { key: 'clock', label: '钟点', type: 'time' },
            {
              key: 'yaoText',
              label: '手动爻值（自下而上，空格分隔，6/7/8/9）',
              type: 'text',
              full: true,
              placeholder: '如：7 8 9 6 7 8',
            },
            { key: 'question', label: '问事', type: 'textarea', full: true },
          ]}
          initial={{ method: 'time', date: today(), clock: '12:00' }}
        />
      </div>
    </main>
  )
}
