'use client'

import NavBar from '../components/NavBar'
import CastPanel from '../components/CastPanel'

const today = () => new Date().toISOString().slice(0, 10)

export default function TiebanPage() {
  return (
    <main className="min-h-screen pt-20 pb-16">
      <NavBar />
      <div className="app-container max-w-2xl">
        <CastPanel
          system="tieban"
          title="铁版神数"
          blurb="仅结构排盘演示。本命数/考刻为确定性哈希（非古典推数）；断语条文未授权，禁止编造条文或命运断定。"
          researchOnly
          fields={[
            { key: 'birthDate', label: '出生日期', type: 'date' },
            { key: 'birthHour', label: '时辰标签', type: 'text', placeholder: '午时' },
            { key: 'birthClock', label: '精确钟点', type: 'time' },
            {
              key: 'gender',
              label: '性别',
              type: 'select',
              options: [
                { value: '男', label: '男' },
                { value: '女', label: '女' },
              ],
            },
            { key: 'question', label: '备注', type: 'textarea', full: true },
          ]}
          initial={{
            birthDate: '1990-05-15',
            birthHour: '午时',
            birthClock: '12:00',
            gender: '男',
            calendarType: '公历',
          }}
        />
      </div>
    </main>
  )
}
