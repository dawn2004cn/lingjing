/**
 * py-engine 健康检查（可选）
 * 未配置 PY_ENGINE_URL 时跳过并 exit 0；配置后探测 /health 并打印各包可用性。
 *
 * 运行：npm run test:py-engine
 */

import { fetchPyEngine } from '../lib/divination/py-engine-client'

async function main() {
  const base = process.env.PY_ENGINE_URL
  if (!base) {
    console.log('skip: PY_ENGINE_URL 未配置（Node JS 引擎仍可独立运行）')
    process.exit(0)
  }

  const health = await fetchPyEngine('/health')
  if (!health || typeof health !== 'object') {
    console.error(`fail: 无法连接 ${base}/health`)
    process.exit(1)
  }

  const h = health as Record<string, unknown>
  console.log('py-engine health ok=', h.ok)
  for (const key of ['kintaiyi', 'kinwangji', 'kinqimen', 'kinliuren', 'kinjinkou']) {
    console.log(`  ${key}: ${h[key] ? 'installed' : 'missing (stub)'}`)
  }
  if (h.ok !== true) {
    process.exit(1)
  }
  process.exit(0)
}

void main()
