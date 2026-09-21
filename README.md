# 云记账 · 油漆门店经营管理

在原有暖白、灰绿界面的基础上分阶段开发。目前已完成 Phase 1–7：布局与认证、客户与工地、材料与客户价、用料单、收款/预存/退料、往来账与客户对账、工作台经营统计。本版本仍为本地合同 mock，不能用于真实经营记账。

## 本地启动

需要 Node.js 20.9+（当前验证环境 Node 22）。使用 npm 和 package-lock.json 安装。

```bash
npm ci
cp .env.example .env.local
```

没有 Go 后端时将 `.env.local` 改为：

```dotenv
NEXT_PUBLIC_API_MODE=mock
NEXT_PUBLIC_API_BASE_URL=
ALLOW_LOCAL_MOCK_BUILD=true
```

```bash
npm run build
npm run start -- --port 3001
```

访问 http://127.0.0.1:3001/login 。开发时运行 `npm run dev -- --port 3001`。

本地 mock 测试账号：`owner`（老板）、`finance`（财务）、`clerk`（店员）；密码均为 `Paint123!`。这是公开测试凭据，与真实账号无关。模拟服务仅允许 localhost/127.0.0.1；生产构建默认禁止 mock，`ALLOW_LOCAL_MOCK_BUILD=true` 是本机预览的显式例外，不应配置到正式部署。

## 已完成

- 原有视觉主题，折叠侧栏、平板抽屉、面包屑、页面搜索（Ctrl/Cmd K）、通知空状态和用户菜单。
- 中文账号密码登录、字段校验、显示密码、请求期间禁用按钮、错误提示、退出。
- 受保护的工作台和账号页；登录后恢复安全的本地跳转；403/404、加载/失败/重试状态。
- API Client 统一基址、Authorization、JSON/schema、credentials、错误、取消请求与幂等 key。
- access token 仅内存；HttpOnly cookie 恢复会话；并发 401 单次刷新；第二次 401 退出；账号切换清空 Query 缓存。
- Zustand 管理 UI/会话；TanStack Query 管理请求；React Hook Form + Zod 校验；Tailwind、shadcn/ui 风格基础组件、Lucide、date-fns。
- 统一整数分金额工具，避免浮点计算；ESLint、strict TypeScript、Node 测试。
- 油漆工列表、详情、搜索、施工队/欠款/状态筛选、排序和分页；老板可新增编辑，店员/财务按权限只读。
- 施工队列表和详情，明确施工队只聚合成员金额；工地/项目列表和详情，支持多油漆工关联、日期与状态校验。
- Phase 2 REST Client、Zod 合同和显式 mock；并发编辑使用 `version` 返回 409，模拟写入在服务重启后恢复为种子数据。
- Phase 3–5 材料与客户价、用料单、收款、预存款和退料业务闭环。
- Phase 6 客户往来余额总览；按客户和日期生成期初、发生额、期末应收及逐笔对账明细。
- Phase 7 工作台经营总览、近六月趋势、应收排行和最近业务。

## 接入独立 Go 后端

将 `.env.local` 的 `NEXT_PUBLIC_API_MODE` 改为 `real`，设置 `NEXT_PUBLIC_API_BASE_URL`（含 `/api/v1`），重启/重新构建。公开环境变量在 Next 构建时注入。

认证合同见 `contracts/openapi.yaml`。Go 实现 login/refresh/logout/me，返回合同中的用户和权限。Cookie 要设置 HttpOnly、合适的 SameSite、path 和 secure；跨源开发需准确配置允许源及 credentials；Cookie 写入接口需防 CSRF。前端提供原生 Origin 请求头，mock 校验同源。

真实模式不静默回退到 mock。前端 Guard 和 PermissionGate 只控制界面，服务端必须逐请求验证权限、令牌和账号状态。mock 使用进程内会话，服务重启后会话失效，不具备正式身份系统的密码存储、持久会话或登录限流。

## 验证

```bash
npm run test
npm run lint
npm run build
npm run typecheck
```

路由变化时可先运行 `npx next typegen` 刷新生成类型。测试覆盖并发刷新、刷新失败、过期退出、幂等键保留、取消请求、各类错误、字段映射、Decimal 格式化与权限基础。

## 原代码与数据

原 `src/app/dashboard/workspace.tsx` 及 CSS 保留供后续迁移，目前未被新路由调用。原 localStorage `yunji-ledger-v1` 不读取、不覆盖、不自动迁移；新 UI 偏好单独使用 `paint-store-ui-v1`。旧预览组件中有尚未迁移的代码，ESLint 对原冻结文件的既有 effect 模式有定点例外，新增代码执行完整检查。

后续推进 Phase 8：用户、权限管理与操作日志。
