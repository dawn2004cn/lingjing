'use client'

import NavBar from '../components/NavBar'
import CastPanel from '../components/CastPanel'

const today = () => new Date().toISOString().slice(0, 10)
const ZHI = '子丑寅卯辰巳午未申酉戌亥'.split('')

export default function JinkouPage() {
  return (
    <main className="min-h-screen pt-20 pb-16">
      <NavBar />
      <div className="app-container max-w-2xl">
        <CastPanel
          system="jinkou"
          title="金口诀"
          blurb="大六壬简式：月将加时定将神，地分取贵神与人元，输出四位生克。"
          fields={[
            { key: 'date', label: '日期', type: 'date' },
            { key: 'clock', label: '钟点', type: 'time' },
            {
              key: 'difen',
              label: '地分',
              type: 'select',
              options: [
                { value: '', label: '默认=时支' },
                ...ZHI.map((z) => ({ value: z, label: z })),
              ],
            },
            {
              key: 'dayNight',
              label: '贵人',
              type: 'select',
              options: [
                { value: 'auto', label: '按时辰自动' },
                { value: 'day', label: '昼贵' },
                { value: 'night', label: '夜贵' },
              ],
            },
            { key: 'question', label: '问事', type: 'textarea', full: true },
          ]}
          initial={{ date: today(), clock: '12:00', dayNight: 'auto', difen: '' }}
        />
      </div>
    </main>
  )
}
