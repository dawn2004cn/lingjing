/**
 * 会员档位与 LLM 日额度（支付网关未接；专业档由管理员开通）
 */

import { getDb } from './db'

export const PLAN_IDS = ['free', 'pro']

function envInt(name, fallback) {
  const n = Number(process.env[name])
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback
}

/** 上海日历日 YYYY-MM-DD */
export function todayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function normalizePlanId(plan) {
  return plan === 'pro' ? 'pro' : 'free'
}

/**
 * @param {{ role?: string, plan?: string } | null} userRow
 */
export function resolvePlanId(userRow) {
  if (!userRow) return 'free'
  if (userRow.role === 'admin') return 'admin'
  return normalizePlanId(userRow.plan)
}

export function getPlanMeta(planId) {
  if (planId === 'admin') {
    return { id: 'admin', label: '管理', dailyLlm: null }
  }
  if (planId === 'pro') {
    return { id: 'pro', label: '专业', dailyLlm: envInt('PLAN_PRO_DAILY_LLM', 50) }
  }
  return { id: 'free', label: '免费', dailyLlm: envInt('PLAN_FREE_DAILY_LLM', 5) }
}

export function getUserPlanRow(userId) {
  const db = getDb()
  return db.prepare('SELECT id, username, role, plan FROM users WHERE id = ?').get(userId) || null
}

export function countLlmUsage(userId, day = todayKey()) {
  const db = getDb()
  const row = db.prepare(
    'SELECT COUNT(*) AS c FROM llm_usage WHERE user_id = ? AND day = ?',
  ).get(userId, day)
  return Number(row?.c) || 0
}

/**
 * @returns {{ planId: string, label: string, dailyLimit: number|null, used: number, remaining: number|null, day: string }}
 */
export function getQuotaStatus(userId) {
  const row = getUserPlanRow(userId)
  const planId = resolvePlanId(row)
  const meta = getPlanMeta(planId)
  const day = todayKey()
  const used = countLlmUsage(userId, day)
  const dailyLimit = meta.dailyLlm
  const remaining =
    dailyLimit == null ? null : Math.max(0, dailyLimit - used)
  return {
    planId,
    label: meta.label,
    dailyLimit,
    used,
    remaining,
    day,
  }
}

/**
 * 是否允许发起一次 LLM 调用（不计费；成功后再 consume）
 */
export function canUseLlm(authUser) {
  if (!authUser?.id) {
    return {
      ok: false,
      status: 401,
      error: 'AI 润色/追问需登录；排盘与规则事实仍可免费使用',
    }
  }
  const quota = getQuotaStatus(authUser.id)
  if (quota.remaining === 0) {
    return {
      ok: false,
      status: 429,
      error: `今日 ${quota.label}档 LLM 额度已用尽（${quota.used}/${quota.dailyLimit}）。规则事实仍可用；可明日再试或联系开通专业档。`,
      quota,
    }
  }
  return { ok: true, quota }
}

export function consumeLlmQuota(userId, kind = 'polish', system = '') {
  const db = getDb()
  db.prepare(
    'INSERT INTO llm_usage (user_id, day, kind, system) VALUES (?, ?, ?, ?)',
  ).run(userId, todayKey(), kind.slice(0, 32), String(system || '').slice(0, 32))
  return getQuotaStatus(userId)
}
