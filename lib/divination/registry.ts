/**
 * 术数系统注册表
 */

import type { DivinationAdapter, DivinationMeta, DivinationSystemId } from './types'
import { baziAdapter } from './adapters/bazi'
import { ziweiAdapter } from './adapters/ziwei'
import { meihuaAdapter } from './adapters/meihua'
import { liuyaoAdapter } from './adapters/liuyao'
import { xiaoliurenAdapter } from './adapters/xiaoliuren'
import { qimenAdapter } from './adapters/qimen'
import { daliurenAdapter } from './adapters/daliuren'
import { jinkouAdapter } from './adapters/jinkou'
import { taiyiAdapter } from './adapters/taiyi'
import { huangjiAdapter } from './adapters/huangji'
import { tiebanAdapter } from './adapters/tieban'

const ADAPTERS: DivinationAdapter[] = [
  baziAdapter,
  ziweiAdapter,
  meihuaAdapter,
  liuyaoAdapter,
  xiaoliurenAdapter,
  qimenAdapter,
  daliurenAdapter,
  jinkouAdapter,
  taiyiAdapter,
  huangjiAdapter,
  tiebanAdapter,
]

const BY_ID = new Map(ADAPTERS.map((a) => [a.meta.id, a]))

export function listSystems(): DivinationMeta[] {
  return ADAPTERS.map((a) => a.meta)
}

export function listSystemsByCategory(category: DivinationMeta['category']): DivinationMeta[] {
  return listSystems().filter((m) => m.category === category)
}

export function getAdapter(id: string): DivinationAdapter | null {
  return BY_ID.get(id as DivinationSystemId) || null
}

export function isValidSystemId(id: string): id is DivinationSystemId {
  return BY_ID.has(id as DivinationSystemId)
}

export const SYSTEM_IDS = ADAPTERS.map((a) => a.meta.id)
