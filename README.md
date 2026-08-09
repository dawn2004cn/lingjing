# 灵镜 · AI 命理（八字 / 紫微）

确定性排盘优先的 AI 命理 Web 应用：支持 **八字** 与 **紫微斗数**，走 **排盘 → 规则事实 →（可选）LLM 润色**，不以模型编造星盘为准。

仓库：[dawn2004cn/lingjing](https://github.com/dawn2004cn/lingjing)

---

## 功能概览

| 功能 | 说明 |
|------|------|
| 八字排盘 | 四柱、喜用、大运、**子平格局简判**；日柱流派可切换；跨引擎旁证 |
| 紫微排盘 | 十二宫命盘、格局、叠宫；主星完整性校验 |
| 占卜集大成 | `/divination`：梅花（含笔画起卦）、六爻、小六壬、奇门、大六壬 |
| 研究级 | 太乙、皇极、铁板（结构演示）；`PY_ENGINE_URL` 时 API 并入 sidecar 旁证 |
| 合盘 | `/heming` 互飞矩阵 + 双盘旁证 |
| 运势 | `/yunshi` 年度报告与人生 K 线 |
| 历史 | `/history` 再读（带回日柱流派等精度选项） |
| 准确度 | `/accuracy` 口径与已接入术数；`/admin` citation 按系统聚合 |
| 知识库 | `/library` 古籍、`/knowledge` 紫微百科、`/encyclopedia` 术语+原典选章 |

---

## 技术栈

| 层面 | 技术 |
|------|------|
| 框架 | Next.js 14 (App Router) |
| 语言 | JavaScript + TypeScript（排盘 / 紫微引擎） |
| 样式 | Tailwind CSS 3 + 新中式金色主题 |
| 数据库 | SQLite (`better-sqlite3`) |
| 认证 | JWT (HttpOnly Cookie) + bcryptjs |
| 八字 | `lunar-javascript` + `tyme4ts` 旁证 |
| 紫微 | [iztro](https://github.com/SylarLong/iztro) + 格局/互飞自研封装 |
| 真太阳时 | [true-solar-time](https://www.npmjs.com/package/true-solar-time)（Jean Meeus） |
| LLM | OpenAI / DeepSeek 兼容 API |

---

## 快速开始

### 环境要求

- Node.js 18+
- npm

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```bash
LLM_API_KEY=sk-your-api-key-here
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
JWT_SECRET=your-secret-key-change-in-production
```

> 未配置有效 `LLM_API_KEY` 时，解读回退为规则事实文案（排盘不依赖 Key）。

### 3. 启动

```bash
npm run dev
```

访问 http://localhost:3000

数据库首次启动自动初始化：`data/app.db`，默认管理员 **admin / admin123**（生产请立即改密）。

---

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建（已提高 Node 堆上限，减轻 Windows SSG OOM） |
| `npm start` | 生产启动（需先 build） |
| `npm run test:astro` | 排盘 / 真太阳 / 节气 / 跨引擎 / 完整性回归 |

---

## 准确度口径（排盘优先）

详细约定见 [docs/ACCURACY.md](docs/ACCURACY.md)，产品页见 `/accuracy`。

| 能力 | 口径 |
|------|------|
| 八字主引擎 | `lunar-javascript`，日柱默认 **流派2**（23:00–23:59 不换日） |
| 跨引擎对照 | `tyme4ts`；仅流派差标 `sect_diff`（非硬失败） |
| 日柱流派 | 表单可选流派1/2；八字主盘与紫微历法旁证共用 |
| 紫微主盘 | `iztro`；十四主星完整性 + 历法交叉；合盘/运势同口径 |
| 真太阳时 | 东经 120°；默认 **Meeus** 均时差，失败回退 Spencer；须钟点 + 省市；跨时辰才改盘 |
| 时辰交界 | ≤20 分钟自动双盘 |
| 节气交界 | 十二节精确换月；立春换年；近 90 分钟提示 |
| LLM | 只润色/追问；citation 过高回退规则事实，事件可在 `/admin` 观测 |

回归：`npm run test:astro`（黄金用例、立春时辰级、2020–2026 十二节、Meeus 真太阳、紫微完整性等）。

---

## 默认账号

| 角色 | 用户名 | 密码 | 说明 |
|------|--------|------|------|
| 管理员 | `admin` | `admin123` | `/admin` 精度统计、复算、导出 |
| 普通用户 | 注册获取 | 自行设置 | `/profile` 改密 |

---

## 项目结构

```
lingjing/
├── .env.example
├── package.json
├── docs/
│   ├── ACCURACY.md            # 准确度工程约定
│   └── SYSTEMS.md             # 术数系统登记册
├── services/py-engine/        # 太乙/皇极可选 Python sidecar
├── scripts/
│   └── astro-regression.ts    # 黄金用例回归
├── lib/
│   ├── db.js / auth.js
│   ├── divination/            # 统一适配器 registry
│   ├── astro/                 # 真太阳、节气、交界、跨引擎、精度、citation
│   ├── bazi/                  # 八字 + 子平简判
│   ├── ziwei/                 # 紫微
│   ├── meihua/ liuyao/ xiaoliuren/ qimen/ daliuren/
│   ├── taiyi/ huangji/ tieban/
│   └── knowledge/             # 百科
└── app/
    ├── page.js / HomeClient.js
    ├── accuracy / heming / yunshi / history / admin / ...
    ├── components/
    └── api/
        ├── analyze / heming / astro/hints
        ├── ziwei/chart / ziwei/yunshi
        ├── records / visits / auth/...
        └── admin/dashboard / recheck / mismatch-export
```

---

## API 接口

| 路由 | 方法 | 认证 | 说明 |
|------|------|------|------|
| `/api/divination/:system` | GET/POST | 否 | 列出系统 / 统一排盘（可选 polish） |
| `/api/analyze` | POST | 否* | 八字/紫微规则解读 + 可选润色；支持追问 `question` |
| `/api/ziwei/chart` | POST | 否 | 紫微排盘；含交叉旁证与完整性 |
| `/api/ziwei/yunshi` | POST | 否 | 年度运势报告 |
| `/api/heming` | POST | 否* | 合盘互飞解读 |
| `/api/astro/hints` | POST | 否 | 表单即时精度提示 |
| `/api/auth/*` | — | — | 注册/登录/登出/我/改密 |
| `/api/records` | POST | 是 | 测算记录（含精度字段） |
| `/api/visits` | POST | 否 | 访问统计 |
| `/api/admin/dashboard` | GET | 管理员 | 看板 + 精度 + citation |
| `/api/admin/recheck` | POST | 管理员 | 复算 / 回填 |
| `/api/admin/mismatch-export` | GET | 管理员 | 交叉复核导出 |
| `/api/admin/users` | GET | 管理员 | 用户列表 |
| `/api/admin/users/count` | GET | 管理员 | 用户数 |

\* 未登录也可排盘解读；历史落库需登录。

### `/api/analyze` 请求体示例

```json
{
  "name": "张三",
  "gender": "男",
  "calendarType": "公历",
  "birthDate": "1990-05-15",
  "birthHour": "午时",
  "birthClock": "12:05",
  "system": "ziwei",
  "daySect": 2,
  "useTrueSolar": false
}
```

---

## 生产部署

### VPS / 云服务器（推荐，SQLite 需持久盘）

```bash
npm install
cp .env.example .env.local   # 填入密钥
npm run build
npm i -g pm2
pm2 start npm --name "lingjing" -- start
pm2 save && pm2 startup
```

### Vercel

无服务器环境对本地 SQLite 写入支持有限；生产建议 Turso/Neon 等外部库，或改用有持久卷的主机。

Windows 构建若 OOM，项目已在 `build` 脚本中设置 `--max-old-space-size=8192`，`next.config.js` 限制 `cpus`。

---

## LLM 配置参考

| 平台 | Base URL | 推荐模型 |
|------|----------|----------|
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| 本地 Ollama | `http://localhost:11434/v1` | `qwen2.5:7b` |

---

## 开源致谢

紫微格局知识与合盘方法论参考：

> [Renhuai123/ziwei-doushu](https://github.com/Renhuai123/ziwei-doushu)（MIT）

排盘底层：[iztro](https://github.com/SylarLong/iztro) · 历法旁证：[tyme4ts](https://github.com/6tail/tyme4ts) · 真太阳时：[true-solar-time](https://www.npmjs.com/package/true-solar-time)

---

## License

[MIT](LICENSE) © 2026 灵镜
