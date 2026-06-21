# kun-domain-monitor

监控**已注册域名**的生命周期状态与到期时间，在域名掉落、可被重新注册的那几天**第一时间提醒用户抢注**。

> 场景：你想要的域名已被别人注册，必须等它到期。到期后会经历一段确定的释放流程，最终掉落、对所有人开放注册——但没人会通知想要它的人。本项目抓的就是这个需求。

## 它能做什么

- 用 **RDAP**（ICANN 自 2025-01-28 起强制的标准，取代 WHOIS；ccTLD 自动回退 WHOIS）查询每个域名的注册状态。
- 把原始 **EPP 状态码**归纳为生命周期阶段：`正常 / 续费宽限 / 赎回期 / 待删除 / 可注册 / 未知`。
- **自适应轮询**：离到期远时每周查一次，进入待删除后每 15 分钟查一次，临近预测掉落时间升频到每分钟。
- 关键阶段跃迁（进入赎回 / 进入待删除 / 已掉落可注册）触发**通知**（日志 + 可选 webhook）。
- 账号走 **../kun-galgame-infra 的 OAuth**，仅 `ren` 角色可用。

它做的是**提醒**，不是真正的 drop-catch（那需要在掉落瞬间用大量注册商连接抢单）。

## 技术栈

Nuxt 4 全栈 · Nitro `scheduledTasks`（in-stack 调度，无外部 cron）· Prisma 7 + PostgreSQL · Redis（会话/缓存）· `@kungal/ui-nuxt` · `rdapper`。

## 本地启动

```bash
pnpm install
cp .env.example .env          # 填好数据库 / Redis / OAuth 配置
pnpm prisma:push              # 建表 + 生成 Prisma client
pnpm dev
```

需要先在 kun-galgame-infra 注册一个 OAuth client，拿到 `OAUTH_CLIENT_ID` / `OAUTH_CLIENT_SECRET`，并把回调地址 `${origin}/api/auth/callback`（dev 默认 `http://localhost:3970/api/auth/callback`）登记进去。`grants` 需包含 `authorization_code` 与 `refresh_token`。

## 架构速览

```
nuxt.config.ts  ──> nitro.scheduledTasks: '* * * * *' -> domain:tick
server/tasks/domain/tick.ts        每分钟拉取 next_check_at 已到期的域名，逐个检查
server/utils/domain/
  ├─ rdap.ts        rdapper 封装 + IANA bootstrap 24h 缓存
  ├─ lifecycle.ts   EPP 状态 -> 阶段；预测掉落时间；自适应下次检查时间
  ├─ check.ts       核心循环：查询 -> 落库快照 -> 写事件 -> 通知
  └─ dto.ts         Prisma 行 -> API DTO
server/utils/
  ├─ oauth.ts       OAuth2 授权码 + PKCE 客户端（服务端）
  ├─ session.ts     Redis 会话 + httpOnly cookie
  └─ requireRen.ts  服务端 ren 门禁（每个受保护路由都调用）
server/api/
  ├─ auth/          login(302) · callback · me · logout
  └─ domain/        列表 · 添加 · 删除 · 改 · 立即检查 · 事件历史（均 ren-gated）
app/                登录页 + 监控列表页（KunUI）
prisma/schema/domain.prisma   Domain + DomainEvent
```

## 数据模型

- **Domain**：监控对象 + 最新快照（`phase` / `statuses` / `expiration_date` / `predicted_drop_at`）+ 调度字段（`next_check_at` / `consecutive_errors`）。
- **DomainEvent**：阶段跃迁审计 + 通知去重依据。

## 调参（环境变量）

| 变量 | 默认 | 说明 |
|------|------|------|
| `MONITOR_BATCH_SIZE` | 20 | 每分钟最多检查多少个到期域名 |
| `MONITOR_LOOKUP_TIMEOUT_MS` | 15000 | 单次查询超时 |
| `MONITOR_NOTIFY_WEBHOOK` | 空 | 每条状态变更事件 POST 到此地址（Telegram/Slack…），空则仅日志 |

## 已知边界

- gTLD（.com 等）生命周期约 75–80 天，逻辑按此建模；**ccTLD 差异大**，部分无 RDAP、无赎回期，预测掉落时间仅对 gTLD 准确，其余以原始状态为准。
- `predicted_drop_at` 是上界估计（首次观测到 `pendingDelete` 起 +5 天）；gTLD 实际释放集中在 UTC 14:00 前后，可按 TLD 进一步精确化。
- 通知渠道目前是日志 + 可选 webhook，扩展点在 `server/utils/notify.ts`（加 Telegram / 邮件即可）。
- 横向扩容（多实例）时 Nitro 计划任务需加分布式锁；当前 PM2 `instances: 1` 单实例无此问题。
