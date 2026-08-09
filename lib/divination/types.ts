/**
 * 统一术数适配器契约
 * 所有命理/占卜系统均实现此接口，走「排盘 → 规则事实 → 可选润色」管道。
 */

export type DivinationCategory = 'mingli' | 'zhanbu' | 'research'

export type DivinationSystemId =
  | 'bazi'
  | 'ziwei'
  | 'meihua'
  | 'liuyao'
  | 'xiaoliuren'
  | 'qimen'
  | 'daliuren'
  | 'jinkou'
  | 'taiyi'
  | 'huangji'
  | 'tieban'

export interface DivinationMeta {
  id: DivinationSystemId
  name: string
  category: DivinationCategory
  /** 产品短说明 */
  blurb: string
  /** 引擎说明（展示在 /accuracy） */
  engine: string
  /** 默认流派/口径 */
  defaultMethod: string
  /** 页面路由 */
  href: string
  /** 是否已接入可排盘 */
  available: boolean
  /** research 级：宏观/免责 */
  researchOnly?: boolean
}

export interface DivinationBuildInput {
  /** 系统相关任意字段 */
  [key: string]: unknown
}

export interface DivinationBuildResult {
  system: DivinationSystemId
  /** 结构化盘面 */
  chart: unknown
  /** Markdown 规则事实 */
  ruleReading: string
  /** 写入 prompt 的盘面摘要 */
  promptText: string
  /** citation 白名单 */
  allowedTerms: string[]
  /** 旁证/完整性 */
  integrity?: {
    status: string
    summary: string
  } | null
  meta?: Record<string, unknown>
}

export interface DivinationAdapter {
  meta: DivinationMeta
  build(input: DivinationBuildInput): DivinationBuildResult
}
