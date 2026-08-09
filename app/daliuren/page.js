'use client'

import NavBar from '../components/NavBar'
import CastPanel from '../components/CastPanel'

const today = () => new Date().toISOString().slice(0, 10)

export default function DaliurenPage() {
  return (
    <main className="min-h-screen pt-20 pb-16">
      <NavBar />
      <div className="app-container max-w-2xl">
        <CastPanel
          system="daliuren"
          title="大六壬"
          blurb="月将加时，起四课三传、十二天将；九宗门含别责、八专、昴星等分门取法。"
          requiresHumanReview
          fields={[
            { key: 'date', label: '日期', type: 'date' },
            { key: 'clock', label: '钟点', type: 'time' },
            {
              key: 'dayNight',
              label: '贵人',
              type: 'select',
              options: [
                { value: 'auto', label: '自动（卯酉近似）' },
                { value: 'day', label: '昼贵' },
                { value: 'night', label: '夜贵' },
              ],
            },
            { key: 'question', label: '问事', type: 'textarea', full: true },
          ]}
          initial={{ date: today(), clock: '12:00', dayNight: 'auto' }}
        />
      </div>
    </main>
  )
}
