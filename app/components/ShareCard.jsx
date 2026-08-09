'use client'

import { useRef, useState } from 'react'

/**
 * 命格分享卡：Canvas 绘制，避免引入 html2canvas
 */
export default function ShareCard({
  title = '灵镜',
  subtitle = '',
  lines = [],
  system = 'ziwei',
  badges = [],
}) {
  const canvasRef = useRef(null)
  const [url, setUrl] = useState('')
  const [open, setOpen] = useState(false)

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const w = 720
    const h = 960
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')

    // background
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, '#1a120a')
    g.addColorStop(0.5, '#24180f')
    g.addColorStop(1, '#120c08')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    // frame
    ctx.strokeStyle = 'rgba(215,168,74,0.45)'
    ctx.lineWidth = 2
    ctx.strokeRect(36, 36, w - 72, h - 72)

    ctx.fillStyle = 'rgba(215,168,74,0.9)'
    ctx.font = '500 22px "Songti SC", "SimSun", serif'
    ctx.fillText(title, 72, 110)

    ctx.fillStyle = 'rgba(245,234,210,0.95)'
    ctx.font = '600 42px "Songti SC", "SimSun", serif'
    ctx.fillText(system === 'ziwei' ? '紫微命盘' : '八字命盘', 72, 170)

    if (subtitle) {
      ctx.fillStyle = 'rgba(245,234,210,0.55)'
      ctx.font = '20px sans-serif'
      ctx.fillText(subtitle, 72, 210)
    }

    // accuracy badges
    let badgeY = 248
    const badgeList = (badges || []).filter(Boolean).slice(0, 4)
    if (badgeList.length) {
      ctx.font = '16px sans-serif'
      let bx = 72
      for (const b of badgeList) {
        const text = String(b)
        const tw = ctx.measureText(text).width + 20
        ctx.strokeStyle = 'rgba(215,168,74,0.4)'
        ctx.strokeRect(bx, badgeY - 16, tw, 28)
        ctx.fillStyle = 'rgba(215,168,74,0.75)'
        ctx.fillText(text, bx + 10, badgeY + 4)
        bx += tw + 10
        if (bx > w - 120) break
      }
      badgeY += 36
    }

    ctx.fillStyle = 'rgba(245,234,210,0.78)'
    ctx.font = '22px "Songti SC", "SimSun", serif'
    let y = badgeList.length ? badgeY + 12 : 280
    for (const line of lines.slice(0, 12)) {
      const text = String(line)
      const max = 26
      for (let i = 0; i < text.length; i += max) {
        ctx.fillText(text.slice(i, i + max), 72, y)
        y += 36
      }
      y += 8
    }

    ctx.fillStyle = 'rgba(215,168,74,0.5)'
    ctx.font = '16px sans-serif'
    ctx.fillText('灵镜 · 知命不执 · 跨引擎校验', 72, h - 72)

    setUrl(canvas.toDataURL('image/png'))
    setOpen(true)
  }

  return (
    <div>
      <button type="button" className="btn-ghost !text-xs border border-[var(--line)]" onClick={draw}>
        生成分享卡
      </button>
      <canvas ref={canvasRef} className="hidden" />
      {open && url && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div className="max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <img src={url} alt="分享卡" className="w-full rounded-lg border border-[var(--line)]" />
            <div className="mt-3 flex gap-2">
              <a href={url} download="lingjing-share.png" className="btn-primary !w-auto px-4 text-xs">
                下载 PNG
              </a>
              <button type="button" className="btn-ghost !text-xs" onClick={() => setOpen(false)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
