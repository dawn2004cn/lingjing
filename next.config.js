/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['openai', 'iztro', 'lunar-javascript', 'tyme4ts', 'true-solar-time', 'better-sqlite3'],
    // 百科/古籍静态页较多，限制并行以免 Windows 下 SSG worker OOM
    cpus: 2,
  },
}

module.exports = nextConfig
