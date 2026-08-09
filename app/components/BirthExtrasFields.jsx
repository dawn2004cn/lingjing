'use client'

import { useMemo } from 'react'
import { listProvinceNames, listCitiesByProvince } from '@/lib/ziwei/cities'

export default function BirthExtrasFields({ formData, onChange, idPrefix = 'birth' }) {
  const update = (key, val) => onChange({ ...formData, [key]: val })
  const provinces = useMemo(() => listProvinceNames(), [])
  const cities = useMemo(
    () => (formData.province ? listCitiesByProvince(formData.province) : []),
    [formData.province],
  )

  const needClock = !!formData.useTrueSolar

  return (
    <div className="space-y-4">
      <div className="input-field">
        <label className="input-label">
          精确钟点{needClock ? '（真太阳时必填）' : '（可选）'}
        </label>
        <input
          type="time"
          className="input-base"
          value={formData.birthClock || ''}
          onChange={(e) => update('birthClock', e.target.value)}
          required={needClock}
        />
        <p className="mt-1 text-[11px] text-[rgba(245,234,210,0.45)]">
          填写后优先于时辰档；距交界 ≤20 分钟将自动双盘；近节气会即时提示
        </p>
      </div>

      {formData.calendarType === '农历' && (
        <label className="flex items-center gap-2 text-sm text-[rgba(245,234,210,0.78)] cursor-pointer">
          <input
            type="checkbox"
            checked={!!formData.isLeapMonth}
            onChange={(e) => update('isLeapMonth', e.target.checked)}
          />
          闰月
        </label>
      )}

      <div className="input-field">
        <label className="input-label flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!formData.useTrueSolar}
            onChange={(e) => update('useTrueSolar', e.target.checked)}
          />
          真太阳时校正
        </label>
        {formData.useTrueSolar && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              className="input-base"
              value={formData.province || ''}
              onChange={(e) => onChange({ ...formData, province: e.target.value, city: '' })}
            >
              <option value="">选择省份</option>
              {provinces.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select
              className="input-base"
              value={formData.city || ''}
              onChange={(e) => update('city', e.target.value)}
              disabled={!formData.province}
            >
              <option value="">选择城市</option>
              {cities.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        {formData.useTrueSolar && (
          <p className="mt-1 text-[11px] text-[rgba(245,234,210,0.45)]">
            须填精确钟点与省市；相对东经 120° 校正，跨时辰才改盘
          </p>
        )}
        {formData.useTrueSolar && !formData.birthClock && (
          <p className="mt-1 text-[11px] text-[var(--cinnabar)]">
            未填钟点时无法启用真太阳时（避免时辰中点近似误差）
          </p>
        )}
      </div>

      <div className="input-field">
        <label className="input-label">日柱流派（23:00 后）</label>
        <div className="pill-toggle" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <label className="pill-option" data-active={Number(formData.daySect || 2) === 2}>
            <input
              type="radio"
              name={`${idPrefix}-daySect`}
              checked={Number(formData.daySect || 2) === 2}
              onChange={() => update('daySect', 2)}
            />
            流派2 · 不跨日
          </label>
          <label className="pill-option" data-active={Number(formData.daySect) === 1}>
            <input
              type="radio"
              name={`${idPrefix}-daySect`}
              checked={Number(formData.daySect) === 1}
              onChange={() => update('daySect', 1)}
            />
            流派1 · 换日
          </label>
        </div>
        <p className="mt-1 text-[11px] text-[rgba(245,234,210,0.45)]">
          八字日柱与紫微历法旁证共用；默认流派2，与 tyme 流派2 对齐
        </p>
      </div>
    </div>
  )
}
