# 术数系统登记册 · 灵镜

准确度管道：确定性排盘 → 规则事实 →（可选）LLM 润色。详见 [ACCURACY.md](./ACCURACY.md)。

| ID | 名称 | 类别 | 引擎 | 默认口径 | 路由 | 黄金用例 |
|----|------|------|------|----------|------|----------|
| bazi | 子平八字 | 命理 | lunar-javascript + tyme4ts + ziping | 日柱流派2 | `/` | 已有 §10 |
| ziwei | 紫微斗数 | 命理 | iztro + integrity | 早子0/晚子12 | `/` | 已有 §10 |
| meihua | 梅花易数 | 占卜 | lingjing-meihua | 时间 / 数字 / 汉字笔画 | `/meihua` | §20–21 |
| liuyao | 易经六爻 | 占卜 | lingjing-liuyao（自研） | 时间/铜钱 | `/liuyao` | §20 |
| xiaoliuren | 小六壬 | 占卜 | lingjing-xiaoliuren | 月日时顺推 | `/xiaoliuren` | §20 |
| qimen | 奇门遁甲 | 占卜 | lingjing-qimen-chaibu + MIT 旁证 | 时家拆补 + 值符值使 | `/qimen` | §20 |
| daliuren | 大六壬 | 占卜 | lingjing-daliuren（可并 kinliuren） | 节气月将；涉害深度；天将全盘 | `/daliuren` | §20–21 |
| jinkou | 金口诀 | 占卜 | lingjing-jinkou；可并 kinjinkou | 四位：人元贵神将神地分 | `/jinkou` | §20 |
| taiyi | 太乙神数 | 研究 | lite JS；API 可并 py-engine | 年计 | `/taiyi` | §20 |
| huangji | 皇极经世 | 研究 | lingjing-huangji；可并 py-engine | 元会运世 | `/huangji` | §20 |
| tieban | 铁版神数 | 研究 | 结构盘（无条文） | 四柱→本命数 | `/tieban` | §20 |

## 适配器

- 契约：`lib/divination/types.ts`
- 注册：`lib/divination/registry.ts`
- API：`POST /api/divination/:system`，`GET` 列出系统

## Python sidecar（太乙/皇极/奇门/大六壬完整法）

见 `services/py-engine/`。设置 `PY_ENGINE_URL` 后，`POST /api/divination/{taiyi|huangji|qimen|daliuren|jinkou}` 会把 sidecar 结果写入 `meta.pyEngine`，并追加到规则文案（保证有输出）。未配置时跳过。

奇门 Node 侧另接 MIT 包 `qimendunjia-standalone` 作旁证（**不**引入 GPL 的 kinqimen 到运行时依赖）。金口诀完整法旁证为 MIT `kinjinkou`。

## 知识库

- 术语百科：`lib/knowledge/divination-encyclopedia.ts` → `/encyclopedia`
- 原典选章：`lib/knowledge/divination-classics.ts`（公版摘录，供 citation / 教育）
- Admin：citation 按 `system` 聚合（`getCitationStats().bySystem`）

## 回归

`npm run test:astro` — §20 占卜冒烟；§21 九宗门简判、笔画起卦、原典覆盖、py 旁路。

## 许可注意

- 六爻不引入 GPL 的 iching-shifa 作为运行时依赖
- 铁板条文库需授权后方可匹配
- 不整库替换现有八字/紫微引擎
