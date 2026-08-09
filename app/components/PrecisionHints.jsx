'use client'

import { useEffect, useState } from 'react'

/**
 * 填写生辰时的即时精度提示（时辰交界 / 节气交界）
 */
export default function PrecisionHints({ formData }) {
  const [tips, setTips] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!formData?.birthDate) {
      setTips([])
      return
    }
    if (!(formData.birthHour || formData.birthClock)) {
      setTips([])
      return
    }

    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/astro/hints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            birthDate: formData.birthDate,
            birthHour: formData.birthHour,
            birthClock: formData.birthClock,
            calendarType: formData.calendarType,
            isLeapMonth: formData.isLeapMonth,
            gender: formData.gender,
            useTrueSolar: formData.useTrueSolar,
            province: formData.province,
            city: formData.city,
            lateZi: formData.lateZi,
            daySect: formData.daySect,
          }),
          signal: ctrl.signal,
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '提示失败')
        setTips(data.tips || [])
      } catch (e) {
        if (e.name !== 'AbortError') setTips([])
      } finally {
        setLoading(false)
      }
    }, 420)

    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [
    formData?.birthDate,
    formData?.birthHour,
    formData?.birthClock,
    formData?.calendarType,
    formData?.isLeapMonth,
    formData?.gender,
    formData?.useTrueSolar,
    formData?.province,
    formData?.city,
    formData?.lateZi,
    formData?.daySect,
  ])

  if (!tips.length && !loading) return null

  const alert = tips.some((t) => t.includes('交界'))

  return (
    <div
      className={`rounded-md border px-3 py-2 text-[11px] leading-relaxed ${
        alert
          ? 'border-[var(--gold)]/40 bg-[rgba(215,168,74,0.07)] text-[rgba(245,234,210,0.7)]'
          : 'border-[var(--line)] text-[rgba(245,234,210,0.5)]'
      }`}
    >
      <div className="tracking-[0.12em] text-[var(--gold-bright)] mb-1">
        {loading ? '精度提示…' : '精度提示'}
      </div>
      <ul className="space-y-1 list-disc pl-4">
        {tips.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  )
}
