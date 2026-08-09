# 准确度口径 · 灵镜

产品页同步维护：[`/accuracy`](../app/accuracy/page.js)。本文档面向开发者，说明「确定性排盘 → 规则事实 →（可选）LLM 润色」的工程约定。

## 原则

1. **排盘可复现**：同一生辰输入，八字四柱 / 紫微星盘由算法确定性产出。
2. **规则先于文案**：大运、喜用、格局、叠宫、互飞、旁证均先写入规则事实，再交给 LLM。
3. **幻觉可回退**：citation 风险过高则回退规则解读，并写入 `accuracy_events` 供 `/admin` 观测。

## 引擎与旁证

| 能力 | 主引擎 | 旁证 / 护栏 |
|------|--------|-------------|
| 八字四柱 | `lunar-javascript` | `tyme4ts` 跨引擎；`sect_diff` 非硬失败 |
| 紫微星盘 | `iztro` | 历法交叉 + 十四主星完整性（`ziwei-integrity`） |
| 真太阳时 | Meeus（`true-solar-time`） | 失败回退 Spencer；标准经线东经 120° |
| 节气换柱 | 十二节精确时刻 | 2020–2026 抽检；立春换年 |
| 时辰交界 | ≤20 分钟双盘 | 入库 `boundary_hour` |
| 日柱流派 | 默认流派2（23:00 不跨日） | 表单可切流派1；八字与紫微旁证共用 |

## 入库精度字段

`fortune_records`（及复算/回填）：

- `day_sect` — 日柱流派
- `boundary_hour` — 时辰交界双盘
- `boundary_jieqi` — 节气交界
- `true_solar_shift` — 真太阳跨时辰/跨日
- `cross_status` — `match` / `sect_diff` / `partial` / `mismatch` / `skipped`

管理员：`/admin` 统计、单条/批量复算、skipped 回填、mismatch 导出 CSV/MD。

## citation 可观测

表 `accuracy_events`（`kind=citation`）：

- analyze / heming 在判定后打点
- `/admin` 展示采样数、回退率、均分、最近回退明细

## 回归

```bash
npm run test:astro
```

覆盖：时辰索引、真太阳（含 Meeus 硬断言）、闰月、八字/紫微黄金用例、跨引擎、立春与十二节、精度标志、紫微完整性等。

## 多术数扩展

统一适配器见 `lib/divination/`，系统登记见 [SYSTEMS.md](./SYSTEMS.md)。

每个新系统上线门槛：可复现排盘、规则事实、citation 词表、黄金用例、`/accuracy` 口径说明。

研究级（太乙 / 皇极 / 铁板）须标注边界；铁板无未授权条文匹配。

## 已知边界（相对「市面最强」）

- 紫微尚无第二安星引擎交叉（以结构完整性 + 历法旁证替代）
- 奇门/大六壬为自研简化实现，重大事项须人工复核
- 飞星派开关、完整多轮会话、付费档未做
- citation 为启发式词表，非语义级事实校验
