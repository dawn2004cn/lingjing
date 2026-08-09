'use client'

import NavBar from '../components/NavBar'
import CastPanel from '../components/CastPanel'

const today = () => new Date().toISOString().slice(0, 10)

export default function TaiyiPage() {
  return (
    <main className="min-h-screen pt-20 pb-16">
      <NavBar />
      <div className="app-container max-w-2xl">
        <CastPanel
          system="taiyi"
          title="太乙神数"
          blurb="积年起局与十六神将简盘。侧重国运/天时/大势；完整古法见 Python sidecar。"
          researchOnly
          fields={[
            { key: 'date', label: '日期', type: 'date' },
            { key: 'clock', label: '钟点', type: 'time' },
            {
              key: 'jiStyle',
              label: '计法',
              type: 'select',
              options: [
                { value: '0', label: '年计' },
                { value: '1', label: '月计' },
                { value: '2', label: '日计' },
                { value: '3', label: '時計' },
              ],
            },
            { key: 'matter', label: '事项', type: 'text', placeholder: '国运/天灾/经济…' },
            { key: 'question', label: '问事', type: 'textarea', full: true },
          ]}
          initial={{ date: today(), clock: '12:00', jiStyle: '0' }}
        />
      </div>
    </main>
  )
}
