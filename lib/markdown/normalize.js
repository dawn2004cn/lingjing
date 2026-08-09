/**
 * 规范化模型/规则输出的 Markdown，避免整段落入代码块或标题粘连
 */

export function normalizeMarkdown(raw) {
  if (!raw || typeof raw !== 'string') return ''

  let text = raw.replace(/^\uFEFF/, '').trim()

  // 去掉外层 ```markdown ... ``` / ```md ... ```
  const fenced = text.match(/^```(?:markdown|md|gfm)?\s*\r?\n([\s\S]*?)\r?\n```$/i)
  if (fenced) {
    text = fenced[1].trim()
  } else {
    // 开头有围栏、结尾可能残缺
    text = text.replace(/^```(?:markdown|md|gfm)?\s*\r?\n/i, '')
    text = text.replace(/\r?\n```\s*$/i, '')
  }

  // 统一换行
  text = text.replace(/\r\n/g, '\n')

  // 标题前补空行（避免 ## 紧贴上一段）
  text = text.replace(/([^\n])\n(#{1,6}\s)/g, '$1\n\n$2')

  // 表格前补空行
  text = text.replace(/([^\n])\n(\|[^\n]+\|)/g, '$1\n\n$2')

  // 多余空行压缩为最多两个
  text = text.replace(/\n{3,}/g, '\n\n')

  return text.trim()
}
