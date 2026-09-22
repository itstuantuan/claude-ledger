# 云记账前端契约分析（Phase 0）

> 扫描对象：`/Users/admin/Documents/claude-ledger`  
> 基线日期：2026-09-22  
> 状态：评审草案；按任务要求，完成后停止，不进入 Phase 1。

## 1. 扫描范围与基线

已完整检查：

- `src/features/*/schema.ts`：全部 Zod Schema 与导出类型。
- `src/lib/api/*.ts`：API Client、认证、业务访问层与错误模型。
- `src/mocks/*.ts`、`src/app/api/mock/[...path]/route.ts`：Mock 路由、权限和状态变化。
- `src/lib/utils/money.ts`、`date.ts`：金额与时间工具。
- `src/lib/auth/permissions.ts`：权限判断和登录回跳。
- `tests/*.test.ts`：7 个测试文件、31 个实际子测试。
- `contracts/openapi.yaml`：当前仅较完整描述 Auth、Ledger、Dashboard，业务 CRUD 未覆盖。
- 各业务页面对 API 的查询参数、表单请求和响应字段使用。

验证命令 `npm run test` 通过：**31 passed / 0 failed**。工作树开始扫描前已有未提交修改，本阶段只新增 `docs/`，未改动这些用户文件。

## 2. 当前前端业务模型

| 模型 | 关键字段 | 当前语义 |
|---|---|---|
| User | id, name, account, role, permissions, status | 单角色 + 显式权限数组；停用用户不得恢复会话 |
| Worker | teamId/teamName, 五项金额汇总, lastTransactionAt, version | 客户/油漆工是账务主体；金额均为字符串；乐观锁版本 |
| Team | leader, phone, memberCount, 三项金额汇总, version | 仅聚合成员金额，不是账务主体 |
| Project | workerIds/workerNames, teamId, 日期, status, materialTotal, version | Worker 多对多；Team 可空；账务仍归 Worker |
| Material | category/brand/specification/unit, defaultPrice/costPrice, salesCount, version | 分类和品牌当前均为字符串，无独立 Category/Brand API |
| PricingItem | materialId, defaultPrice, customerPrice, effectivePrice | 当前客户价无有效期字段，批量 PATCH 保存 |
| Order | 行项目、三项结算、三项后续结算快照、status | 创建时一次性结算；后续付款/退料会更新订单展示快照 |
| Payment | amount/method, receivableBefore/After | 独立收款，不带 orderId；Mock 自动 FIFO 分配到未结订单 |
| Prepaid | amount/method, balanceBefore/After | 当前仅实现充值，不含退款/调整/冲正 API |
| Return | original order、行项目、amount、receivableReduction、status | Clerk 申请为 PENDING；有确认权限者创建即 CONFIRMED；当前仅冲应收 |
| LedgerStatement | 期初、四类发生额、期末、逐笔余额 | 页面模型只含 ORDER/PAYMENT/RETURN，无 ADJUSTMENT/REVERSAL |
| DashboardData | 累计摘要、月趋势、欠款榜、最近业务 | 当前 Mock 混有静态趋势种子和动态业务数据 |

## 3. 金额与数量边界

- API 金额是十进制字符串，例如 `"18.00"`；Schema 最多 2 位小数。
- 前端运算使用 `bigint` 整数分，支持超过 JavaScript safe integer 的金额。
- 不接受指数、逗号、小数超过两位等格式。
- 数量是正十进制字符串，最多 3 位小数；Mock 换算为千分单位。
- 当前行金额舍入公式为：`round_half_up(unitPriceMinor × quantityMilli / 1000)`，再减行优惠。
- `OrderItem.discount` 是**行级固定金额**；`goodsAmount` 为折前行金额之和，`discountAmount` 为行优惠之和，`finalAmount = goodsAmount - discountAmount`。
- 当前 API 传入 `unitPrice`，Mock 没有验证它是否等于客户价/默认价，也未记录手工改价原因。

## 4. 状态枚举

| 类型 | 当前枚举 |
|---|---|
| Role | OWNER, FINANCE, CLERK |
| EntityStatus | ACTIVE, DISABLED |
| ProjectStatus | PLANNING, ACTIVE, COMPLETED, CANCELLED |
| OrderStatus | DRAFT, CONFIRMED, PARTIALLY_PAID, PAID, REVERSED |
| PaymentMethod | WECHAT, ALIPAY, CASH, BANK_CARD, OTHER |
| ReturnStatus | PENDING, CONFIRMED, REVERSED |
| LedgerEntryType | ORDER, PAYMENT, RETURN |
| Dashboard recent type | ORDER, PAYMENT, RETURN |

注意：任务说明示例使用 `BANK_TRANSFER`，现有前端使用 `BANK_CARD`。Go API 必须先兼容 `BANK_CARD`；是否新增银行转账需前端与业务共同确认。

## 5. 权限模型

当前权限字符串必须原样兼容：

```text
workers:read
workers:write
materials:read
materials:write
orders:create
returns:request
returns:confirm
returns:manual
finance:read
payments:create
prepaid:deposit
ledger:adjust
reconciliation:read
reports:read
system:manage
```

Mock 角色授权：

- OWNER：全部权限。
- FINANCE：`workers:read`、`materials:read`、`finance:read`、`payments:create`、`prepaid:deposit`、`reconciliation:read`、`reports:read`。
- CLERK：`workers:read`、`materials:read`、`orders:create`、`returns:request`。

前端 `PermissionGate` 仅控制界面；Go 后端必须逐请求验证 ACTIVE 用户、显式权限和 store scope。

## 6. API Client 契约

- 实际 Base URL 由 `NEXT_PUBLIC_API_BASE_URL` 提供，要求包含 `/api/v1`。
- **成功响应是裸业务 JSON**，不是 `{code,message,data}` 包络；Go 后端必须返回 Schema 所需对象/分页对象。
- 错误响应固定为 `{ code: string, message: string, requestId?: string, fieldErrors?: Record<string,string[]> }`。
- 所有请求发送 `Accept: application/json`、`credentials: include`、`cache: no-store`。
- 有 body 时发送 JSON；有 access token 时发送 `Authorization: Bearer ...`。
- 重要 POST 发送 `Idempotency-Key`；401 可刷新并原样重试一次，body 与 key 不能改变。
- 并发 401 共享一次 refresh；第二次 401 结束会话；普通 403/404/409/422/500 不重试写操作。
- 返回数据必须通过 Zod；不匹配时前端抛 `INVALID_RESPONSE`，不会降级到 Mock。
- 服务端所有响应应设置 `X-Request-ID`；错误 body 也返回相同 requestId。

## 7. 当前 Mock API

所有路径以下均相对 `/api/v1`（Mock 时为 `/api/mock`）：

| Method | Path | Request / Query | Success |
|---|---|---|---|
| POST | `/auth/login` | `{account,password}` | Session |
| POST | `/auth/refresh` | HttpOnly cookie | Session |
| POST | `/auth/logout` | cookie | 204 |
| GET | `/auth/me` | Bearer | User |
| GET | `/workers` | search, teamId, debt, status, sort, page, pageSize | WorkerPage |
| GET | `/workers/{id}` | — | Worker |
| POST | `/workers` | WorkerInput | Worker, 201 |
| PATCH | `/workers/{id}` | WorkerInput + version | Worker |
| GET/POST/PATCH | `/teams[/{id}]` | search/page/pageSize 或 TeamInput | Team/Page |
| GET/POST/PATCH | `/projects[/{id}]` | search/status/page/pageSize 或 ProjectInput | Project/Page |
| GET | `/materials` | search, brand, category, status, page, pageSize | MaterialPage |
| POST/PATCH | `/materials[/{id}]` | MaterialInput | Material |
| GET | `/pricing?workerId=` | workerId | PricingItem[] |
| PATCH | `/pricing` | PricingBatchInput | PricingItem[] |
| GET | `/orders` | search, workerId, status, from, to, page, pageSize | OrderPage |
| GET | `/orders/{id}` | — | Order |
| POST | `/orders` | OrderInput + Idempotency-Key | Order, 201 |
| GET/POST | `/payments` | filters 或 PaymentInput + key | PaymentPage/Payment |
| GET/POST | `/prepaid` | filters 或 PrepaidInput + key | PrepaidPage/Prepaid |
| GET/POST | `/returns` | search, workerId, from, to, page, pageSize 或 ReturnInput + key | ReturnPage/Return |
| GET | `/ledger/statement` | workerId, from, to | LedgerStatement |
| GET | `/dashboard/summary` | — | DashboardData |

当前路由只导出 GET/POST/PATCH；没有 PUT/DELETE。分页默认 10 或页面指定 20，Mock 最大 50。

## 8. 31 项测试覆盖

| # | 测试主题 | 覆盖 |
|---:|---|---|
| 1–6 | API 刷新与写请求重试 | 并发 401 单刷新、二次 401、刷新失败不重放、登录不刷新、退出竞态、幂等 key/body 保留 |
| 7–11 | HTTP 错误 | 403/404/409/422/500 保留机器码、requestId、字段错误且写请求不重试 |
| 12–16 | Client 健壮性 | HTML 错误、Schema/网络错误、取消请求、缺少 base URL、停用账号 |
| 17–18 | 客户 Schema | 手机格式；项目成员和日期范围 |
| 19–20 | Dashboard | 摘要/趋势合法；欠款榜降序且最多 5 人 |
| 21–24 | 基础设施 | 精确金额、权限、回跳白名单、登录 trim 规则 |
| 25–26 | Ledger | Seed 期初/期末；未知客户 |
| 27–29 | 三角色认证 | 登录、Cookie 刷新、me、退出、令牌撤销 |
| 30 | Mock 安全 | 错密码、伪造 token、跨源写入 |
| 31 | 结算联动 | 独立收款及已确认退料更新原订单结算快照 |

当前缺口：31 项是前端合同/Mock 测试，不覆盖数据库事务、行锁、持久幂等、三套账不变量、真实冲正、并发预存、并发退料、库存或 store scope。

## 9. 前端类型到后端映射原则

| Frontend | Go DTO | Domain | Database |
|---|---|---|---|
| 金额 string | 自定义 DecimalString | decimal.Decimal | NUMERIC(20,2) |
| 数量 string | 自定义 QuantityString | decimal.Decimal | NUMERIC(20,3) |
| id string | string/uuid.UUID | typed ID（可轻量封装） | UUID |
| occurredAt string | RFC3339/date 接受器 | time.Time | TIMESTAMPTZ |
| version int | int64 | optimistic version | BIGINT CHECK > 0 |
| status enum | validator oneof | typed string enum | TEXT + CHECK |

GORM Model 不直接 JSON 输出。响应 DTO 必须保留现有 camelCase、nullable 和裸 JSON 结构。

## 10. 风险分级

### BLOCKER

1. **Ledger 基线不可追溯。** Mock 由 `worker.receivable - 当前内存业务净发生额` 反推 baseline，Seed 应收没有来源单据。正式库必须用 opening adjustment/migration ledger 显式入账，否则“为什么欠款”无法回答。兼容方案：Worker 响应不变，迁移时为每个期初余额生成 `OPENING_BALANCE` LedgerEntry。
2. **退料结算 Contract 缺字段。** `ReturnInput` 没有 settlementType，现有行为只在可冲额度内冲应收，超出部分不进入现金或预存。无法实现 CASH_REFUND/PREPAID_REFUND。兼容方案：V1 后端先严格保持 CREDIT_RECEIVABLE；新增方式需要前端字段与页面后再开放。
3. **收款分配语义隐式。** PaymentInput 没有 orderId，Mock 自动按订单 occurredAt FIFO 核销；Payment 响应也不暴露分配。后果是用户无法解释某张单为何结清。兼容方案：保留现有请求，正式后端创建 `payment_allocations` 并按明确 FIFO 分配；未来可增加可选 orderId/allocations，响应保持兼容。
4. **OpenAPI 不完整。** 仅 Auth/Ledger/Dashboard 有描述，无法作为 Go 全量生成合同。Phase 1 前应将本文 api-contract 的既有端点补入 OpenAPI，但不得改变前端字段。

### HIGH

1. OrderInput 允许任意 unitPrice，Mock 不校验客户价/默认价，也没有手工价原因。正式后端必须后算，并为偏离有效价建立权限和审计规则。
2. 客户价没有 effectiveFrom/effectiveTo；历史成交价由 OrderItem 固化没问题，但未来价格无法按日期预设。建议保持 API 兼容，数据库先保留有效期能力，当前 PATCH 结束旧价并创建新价。
3. 退料按 `line.subtotal × returnedQty / purchasedQty` 比例分摊优惠并四舍五入；多次分批退完可能有尾差。最后一次退料必须使用“行净额 - 历史有效退料额”吃掉尾差。
4. Mock 幂等只按 key 返回旧响应，不比较 request hash。正式后端相同 key 不同 body 必须 `IDEMPOTENCY_CONFLICT`。
5. 业务编号 Mock 使用 UTC 日期和数组长度，重启/并发会重复。正式库需 store timezone + `business_sequences` 行锁。
6. 订单的 `settledAmount` 包含现金付款和预存抵扣；后续 Payment 又加入 settled。字段名易被误解为真实现金，财务统计必须来自 FinancialTransaction，不能汇总该字段。
7. CONFIRMED Return 创建时由权限自动决定，缺少显式确认端点。真实流程需要“申请”和“确认”事务分离，否则同一 POST 的角色差异会改变账务副作用。

### MEDIUM

1. `projectsApi.list` 不支持 workerId/teamId 的服务端过滤，详情页取前 50 条再前端过滤，数据增长后会漏项。
2. `pricing` PATCH 是批量覆盖语义但无 version，存在并发丢更新。
3. workers/teams/projects/materials 的 version 乐观锁正确，但 PATCH 当前发送完整表单，不是真正稀疏 PATCH；后端应按 DTO 明确更新白名单。
4. Worker/Team/Project 的汇总值是响应缓存，正式数据必须由流水聚合或事务内维护并可校验。
5. 时间输入可能仅 `YYYY-MM-DD`，Mock 用 `new Date(value).toISOString()` 会按 UTC 解释；正式后端需按 Store timezone 定义业务日。
6. Material category/brand 是字符串；若建分类表，API 仍须返回/接收现有字符串，不能突然改 categoryId。
7. Dashboard `paymentTotal` 当前包含开单时即时付款与独立收款，但预存充值未计入；命名应明确是“客户还款/订单收款”而非总现金流。

### LOW

1. 手机 Schema 仅接受中国大陆 11 位号码，可能无法记录座机/国际号码；是否放宽需要业务确认。
2. Page Schema 未限制 page/pageSize/total 非负，服务端仍应校验并限制 pageSize。
3. 现有 OpenAPI 的金额字段只有 string，建议补 pattern 与示例，但不影响运行时契约。

## 11. 需要前端改动吗

- Phase 1–3 基础设施、Auth、客户、材料：**不需要**改现有字段。
- Phase 4 快速开单：可先兼容，但“手工价授权/原因”若业务要求可追溯，需要新增可选字段或独立审计输入。
- Phase 5 独立收款：可后端透明实现 FIFO allocations，前端无需立即改；若要指定订单则需增强 UI。
- Phase 6 退料：实现三种结算方式前**需要**前端新增 settlementType 及对应权限/提示；不能由后端猜。
- 冲正、预存退款、账务调整：当前无 API/UI，需新 Contract，经确认后再做。
