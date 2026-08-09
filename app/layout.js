import ClientLayout from './client-layout'
import './globals.css'

export const metadata = {
  title: '灵镜 · 八字命理',
  description: '输入生辰，AI 命理大师为您深解八字格局、五行运势。中国传统易经智慧与现代 AI 的融合。',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: { url: '/favicon.png', sizes: '32x32' },
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}