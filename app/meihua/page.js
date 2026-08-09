'use client'

import NavBar from '../components/NavBar'
import CastPanel from '../components/CastPanel'

const today = () => new Date().toISOString().slice(0, 10)

export default function MeihuaPage() {
  return (
    <main className="min-h-screen pt-20 pb-16">
      <NavBar />
      <div className="app-container max-w-2xl">
        <CastPanel
          system="meihua"
          title="梅花易数"
          blurb="以数起卦：时间或数字得本卦、互卦、变卦，体用五行断事之成败。"
          fields={[
            {
              key: 'method',
              label: '起卦法',
              type: 'select',
              options: [
                { value: 'time', label: '时间起卦' },
                { value: 'number', label: '数字起卦' },
                { value: 'stroke', label: '汉字笔画' },
              ],
            },
            { key: 'date', label: '日期', type: 'date' },
            { key: 'clock', label: '钟点', type: 'time' },
            { key: 'num1', label: '数一', type: 'number', placeholder: '上卦' },
            { key: 'num2', label: '数二', type: 'number', placeholder: '下卦' },
            { key: 'num3', label: '数三', type: 'number', placeholder: '动爻（可空）' },
            { key: 'text', label: '汉字（笔画起卦）', type: 'text', full: true, placeholder: '如：求财' },
            { key: 'question', label: '问事', type: 'textarea', full: true, placeholder: '所问何事' },
          ]}
          initial={{ method: 'time', date: today(), clock: '12:00', num1: 3, num2: 5, num3: 7, text: '求财' }}
        />
      </div>
    </main>
  )
}
