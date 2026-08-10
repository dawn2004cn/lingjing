'use client'

import LunarCalendar from './LunarCalendar'
import BirthExtrasFields from './BirthExtrasFields'
import PrecisionHints from './PrecisionHints'
import { CHINESE_HOURS } from './birthOptions'

const SYSTEMS = [
  { value: 'bazi', label: '八字' },
  { value: 'ziwei', label: '紫微斗数' },
]

export default function FortuneForm({ formData, onChange, onSubmit, loading }) {
  const update = (key, val) => onChange({ ...formData, [key]: val })
  const handleSubmit = (e) => {
    e.preventDefault()
    const hasTime = !!(formData.birthHour || formData.birthClock)
    if (!formData.name.trim() || !formData.birthDate || !hasTime) return
    if (formData.useTrueSolar && (!formData.province || !formData.city || !formData.birthClock)) return
    onSubmit()
  }

  const system = formData.system || 'bazi'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="input-field">
        <label className="input-label">命理体系</label>
        <div className="pill-toggle" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          {SYSTEMS.map((s) => (
            <label key={s.value} className="pill-option" data-active={system === s.value}>
              <input
                type="radio"
                name="system"
                value={s.value}
                checked={system === s.value}
                onChange={(e) => update('system', e.target.value)}
              />
              {s.label}
            </label>
          ))}
        </div>
      </div>

      <div className="input-field">
        <label className="input-label">姓名</label>
        <input type="text" className="input-base" value={formData.name}
          onChange={e => update('name', e.target.value)} placeholder="请输入姓名" required />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="input-field">
          <label className="input-label">性别</label>
          <div className="pill-toggle">
            {['男', '女'].map(g => (
              <label key={g} className="pill-option" data-active={formData.gender === g}>
                <input type="radio" name="gender" value={g}
                  checked={formData.gender === g}
                  onChange={e => update('gender', e.target.value)} />
                {g}
              </label>
            ))}
          </div>
        </div>
        <div className="input-field">
          <label className="input-label">类型</label>
          <div className="pill-toggle">
            {['公历', '农历'].map(t => (
              <label key={t} className="pill-option" data-active={formData.calendarType === t}>
                <input type="radio" name="calendar" value={t}
                  checked={formData.calendarType === t}
                  onChange={e => onChange({
                    ...formData,
                    calendarType: e.target.value,
                    isLeapMonth: e.target.value === '农历' ? formData.isLeapMonth : false,
                  })} />
                {t}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="input-field">
        <label className="input-label">出生日期</label>
        <LunarCalendar
          value={formData.birthDate}
          onChange={(val) => update('birthDate', val)}
          calendarType={formData.calendarType}
        />
      </div>

      <div className="input-field">
        <label className="input-label">出生时辰</label>
        <select className="input-base" value={formData.birthHour}
          onChange={e => update('birthHour', e.target.value)}
          required={!formData.birthClock}>
          {CHINESE_HOURS.map(h => (
            <option key={h.value} value={h.value} disabled={!h.value}>{h.label}</option>
          ))}
        </select>
      </div>

      <BirthExtrasFields formData={formData} onChange={onChange} idPrefix="fortune" />
      <PrecisionHints formData={formData} />

      {system === 'ziwei' && (
        <div className="input-field">
          <label className="input-label">紫微口径</label>
          <div className="pill-toggle" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            {[
              { value: 'ni', label: '倪师（默认）' },
              { value: 'feixing', label: '飞星' },
            ].map((opt) => (
              <label
                key={opt.value}
                className="pill-option"
                data-active={(formData.ziweiSchool || 'ni') === opt.value}
              >
                <input
                  type="radio"
                  name="ziweiSchool"
                  value={opt.value}
                  checked={(formData.ziweiSchool || 'ni') === opt.value}
                  onChange={(e) => update('ziweiSchool', e.target.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-[rgba(245,234,210,0.45)]">
            飞星会输出大限宫干四化与自化宫位数；来因宫细断仍建议人工复核。
          </p>
        </div>
      )}

      <div className="pt-2">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading
            ? (system === 'ziwei' ? '排盘推演中...' : '推演中...')
            : (system === 'ziwei' ? '紫微排盘' : '开始测算')}
        </button>
      </div>
    </form>
  )
}
