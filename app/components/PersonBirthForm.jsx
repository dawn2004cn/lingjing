'use client'

import LunarCalendar from './LunarCalendar'
import BirthExtrasFields from './BirthExtrasFields'
import PrecisionHints from './PrecisionHints'
import { CHINESE_HOURS, emptyBirthExtras } from './birthOptions'

export const emptyPerson = () => ({
  name: '',
  gender: '男',
  calendarType: '公历',
  birthDate: '',
  birthHour: '',
  ...emptyBirthExtras(),
})

export default function PersonBirthForm({ label, formData, onChange }) {
  const update = (key, val) => onChange({ ...formData, [key]: val })

  return (
    <div className="space-y-4">
      <p className="text-xs tracking-[0.16em] text-[var(--gold-bright)]">{label}</p>

      <div className="input-field">
        <label className="input-label">姓名</label>
        <input
          type="text"
          className="input-base"
          value={formData.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="可选"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="input-field">
          <label className="input-label">性别</label>
          <div className="pill-toggle">
            {['男', '女'].map((g) => (
              <label key={g} className="pill-option" data-active={formData.gender === g}>
                <input
                  type="radio"
                  name={`${label}-gender`}
                  value={g}
                  checked={formData.gender === g}
                  onChange={(e) => update('gender', e.target.value)}
                />
                {g}
              </label>
            ))}
          </div>
        </div>
        <div className="input-field">
          <label className="input-label">类型</label>
          <div className="pill-toggle">
            {['公历', '农历'].map((t) => (
              <label key={t} className="pill-option" data-active={formData.calendarType === t}>
                <input
                  type="radio"
                  name={`${label}-cal`}
                  value={t}
                  checked={formData.calendarType === t}
                  onChange={(e) => onChange({
                    ...formData,
                    calendarType: e.target.value,
                    isLeapMonth: e.target.value === '农历' ? formData.isLeapMonth : false,
                  })}
                />
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
        <select
          className="input-base"
          value={formData.birthHour}
          onChange={(e) => update('birthHour', e.target.value)}
        >
          {CHINESE_HOURS.map((h) => (
            <option key={h.value} value={h.value} disabled={!h.value}>{h.label}</option>
          ))}
        </select>
      </div>

      <BirthExtrasFields formData={formData} onChange={onChange} idPrefix={label} />
      <PrecisionHints formData={formData} />
    </div>
  )
}
