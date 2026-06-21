# Project Guidelines — kun-domain-monitor

监控已注册域名的 RDAP/EPP 生命周期，在域名掉落、可重新注册时提醒用户抢注。Nuxt 4 全栈 · Prisma 7 + Postgres · `@kungal/ui-nuxt` · OAuth（仅 `ren` 角色）。

## 铁律 (Iron Rules — 不可违反，覆盖本文件其他所有条目)

1. **任何 UI 永不使用渐变背景。** 禁止 `bg-gradient-*`、`from-*/via-*/to-*`、`linear-gradient()`、`radial-gradient()`、`conic-gradient()` 等；只用调色板里的纯色。
2. **commit 信息与代码注释一律用英文。**
3. **本仓库允许 push。** 其他 KUN 仓库的「只 commit 不 push」铁律**不适用**——本项目开源、没有要保护的 GitHub Actions 配额，需要时（或用户要求时）可以 push。仍遵循「outward-facing 操作按需确认」的常规判断。

## 核心工程原则（KUN 通用基线）

1. 单文件尽量 < ~500 行；超过 ~300 行就考虑拆分（指导，非硬性）。
2. 前端函数一律写成箭头函数，不用 `function` 关键字；类名用 `cn` 合并。
3. 在优雅模块化与必要重复之间逐案权衡，不要一味偏向某一边。
4. **前后端数据约定必须一致**：字段形状、响应格式两边要对得上（本项目通过 `shared/types/domain.ts` 的 DTO + `server/utils/domain/dto.ts` 的映射保证）。
5. 每次改动后留意别处的连带影响。
6. 始终选最现代、最契合项目当前状态的优雅方案；需要时查最新官方文档。
7. 不要为了优雅/模块化把代码弄复杂、难懂，也别写过度防御的代码。

## 前端约定（`app/`）

- **UI 组件用 `@kungal/ui-nuxt`** 自动导入的 `Kun*` 组件（`KunButton` / `KunCard` / `KunInput` / `KunChip` / `KunSwitch` …），**不要自己造同类基础组件**。反馈用 `useKunMessage('文案', 'success' | 'error' | 'warn' | 'info')`，图标用 `<Icon name="lucide:..." />`。
- **页面只做路由壳**：`pages/*.vue` 只放 `definePageMeta` / `useHead` + 引用**一个**业务容器组件；业务逻辑放进 `app/components/<feature>/` 下的组件。
  - `pages/index.vue` → `<DomainList />`（`components/domain/List.vue`）
  - `pages/login.vue` → `<AuthLogin />`（`components/auth/Login.vue`）
  - 文件名**不要重复目录前缀**：`components/domain/List.vue` 自动导入为 `DomainList`，不要写成 `DomainList.vue`。
- **颜色系统**：只用 KunUI 语义色，**不要用 Tailwind 自带色**（gray/blue/green/red…）。语义色自动适配明暗模式，**无需 `dark:` 前缀**。
  - 文字：`text-foreground`（主）、`text-default-500`（次）、`text-default-400`（辅）、`text-default-300`（弱化）
  - 边框：`border-default-200`
  - 语义色：`primary` / `success` / `danger` / `warning` / `default` / `secondary` / `info`，各有 50–950 阶（如 `bg-primary-100`、`text-danger-600`）
- 状态用 Pinia（`app/stores/`，持久化）；客户端的 `isRen` 仅控制 UI 显隐，**不是权限**。

## 后端 / 服务端约定（`server/`）

- 路由用 `defineKunApi` 包装：返回值即响应，返回 `string` 视为业务错误（走 `kunError`，code 233）；无需在 handler 里写 try/catch。
- **每个受保护路由首行调用 `requireRen(event)`**——这是真正的权限闸门，服务端强制，与前端 `isRen` 无关。
- 入参校验用 `kunParse*` + `shared/validations/` 里的 zod schema。
- 服务端工具放 `server/utils/`（Nitro 自动导入）；跨端共享的类型/常量放 `shared/types` 与 `shared/utils`（Nuxt 4 自动导入第一层导出）。
- Prisma 列名用 `snake_case`；对外 API 用 `camelCase` DTO（在 `dto.ts` 转换）。

## 监控核心约定（`server/utils/domain/`）

- **拿不准就归 `UNKNOWN`，绝不臆测 `AVAILABLE`**——一次假阳性会误发「立即抢注」。
- EPP 状态匹配先 `norm()`（小写 + 去非字母），兼容 `pendingDelete` 与 `pending delete` 两种写法。
- 调度靠每行的 `next_check_at` + 每分钟一次的 Nitro `domain:tick`；改节奏改 `computeNextCheckAt`。
- 通知扩展点只在 `server/utils/notify.ts`（加 Telegram / 邮件就改这一处）。
- gTLD 生命周期约 75–80 天，逻辑按此建模；**ccTLD 差异大**，预测掉落时间仅对 gTLD 准确。

## OAuth（`ren`）

- 全程服务端 PKCE（`server/utils/oauth.ts` + `session.ts`），verifier 走 httpOnly cookie，不进浏览器 JS。
- **OAuth 契约的唯一真源在 `../kun-galgame-infra`（`docs/integration/oauth`）**——我们是消费方，按它的契约对接，不要自行发明端点；端点/错误码以那边为准。

## 数据库 / Prisma

- schema 在 `prisma/schema/`（多文件）；用 driver adapter（`prisma.config.ts` 提供连接串，datasource 不写 url）。
- **改了 `prisma/schema/*` 必须在任务结束时提醒用户跑迁移**：开发 `pnpm prisma:push`，生产 `pnpm prisma:migrate`，并说明对哪个库（默认 `kun_domain_monitor`）。部署不会自动迁移，漏跑会导致线上读不存在的列 → 静默失败。

## 不要提交

`.env`、`prisma/generated`、`node_modules`、`.output` 已在 `.gitignore`，勿入库。
