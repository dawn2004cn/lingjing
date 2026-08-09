'use client'

export default function Error({ error, reset }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0C0E14]">
      <div className="auth-card rounded-xl p-8 w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-full border border-gold-500/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-gold-500/60 text-2xl font-serif">!</span>
        </div>
        <h2 className="text-ivory-300 text-lg font-serif mb-2">页面出现异常</h2>
        <p className="text-ivory-500 text-xs font-light mb-6">{error.message || '未知错误'}</p>
        <button
          onClick={reset}
          className="btn-gold !inline-flex !w-auto px-8"
        >
          <span>重新加载</span>
        </button>
      </div>
    </div>
  )
}