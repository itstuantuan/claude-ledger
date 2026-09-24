# 云记账 API Contract（Phase 0）

> Base URL：`/api/v1`。本文优先匹配现有前端，不以 REST 风格为由更名字段。

## 1. 通用协议

- JSON 字段使用 camelCase。
- 成功：返回**裸业务对象/数组/分页对象**；不要包装 `{code,data}`。
- 创建成功 HTTP 201；查询/更新 200；logout 204。
- 错误：`{code,message,requestId,fieldErrors?}`，并返回匹配的 HTTP 状态。
- 所有响应 Header：`X-Request-ID`；认证与敏感查询：`Cache-Control: no-store`。
- Access Token：`Authorization: Bearer <token>`；refresh 使用 HttpOnly Cookie。
- 订单、收款、预存、退料及未来冲正/调整 POST 强制 `Idempotency-Key`。
- 列表响应：`{items,page,pageSize,total}`；page 从 1 开始，pageSize 最大 50（保持当前 UI）。
- 金额为元的 decimal string；数量为最多 3 位小数的 decimal string；时间响应 RFC3339。

## 2. 前端 API → Go API 映射

现有路径不变；“Go Handler”是建议 Feature 包。

| Frontend 调用 | Method/Path | Permission | Go Handler |
|---|---|---|---|
| authApi.login | POST `/auth/login` | public | auth.Login |
| api.refresh | POST `/auth/refresh` | refresh cookie | auth.Refresh |
| authApi.logout | POST `/auth/logout` | origin/csrf | auth.Logout |
| authApi.me | GET `/auth/me` | authenticated | auth.Me |
| workersApi.list/get | GET `/workers[/{id}]` | workers:read | worker.List/Get |
| workersApi.create/update | POST `/workers`, PATCH `/workers/{id}` | workers:write | worker.Create/Update |
| teamsApi.* | GET/POST/PATCH `/teams[/{id}]` | workers:read/write | team.* |
| projectsApi.* | GET/POST/PATCH `/projects[/{id}]` | workers:read/write | project.* |
| materialsApi.list | GET `/materials` | materials:read | material.List |
| materialsApi.create/update | POST/PATCH `/materials[/{id}]` | materials:write | material.Create/Update |
| pricingApi.list/save | GET/PATCH `/pricing` | materials:read/write | pricing.List/SaveBatch |
| ordersApi.list/get/create | GET `/orders[/{id}]`, POST `/orders` | workers:read / orders:create | order.* |
| paymentsApi.list/create | GET/POST `/payments` | finance:read / payments:create | payment.* |
| prepaidApi.list/create | GET/POST `/prepaid` | finance:read / prepaid:deposit | prepaid.* |
| returnsApi.list/create | GET/POST `/returns` | workers:read / returns:request | returnorder.* |
| ledgerApi.statement | GET `/ledger/statement` | reconciliation:read | ledger.Statement |
| dashboardApi.get | GET `/dashboard/summary` | reports:read | dashboard.Summary |

## 3. 请求与响应要点

### Auth

- Login request：`account` 1–80；`password` 1–128，密码不 trim。
- 现有前端没有 store selector；因此 V1 的 account 在全系统唯一。未来若允许不同门店重复账号，必须先给登录 Contract 增加门店标识或租户域名。
- Session：`{accessToken,expiresIn,user}`。
- User：`{id,name,account,role,permissions,status}`，枚举必须与前端一致。
- Refresh token 轮换；数据库只保存 hash。用户停用/权限变更后 refresh 返回 403。
- Refresh token 按会话族轮换；退出撤销整族，已轮换旧 token 被重放时也撤销该族的活动 token。

### Worker

- Input：`name,phone,wechat?,teamId,status,note,version?`。
- Response 还必须给：`teamName,materialTotal,returnTotal,paymentTotal,prepaidBalance,receivable,lastTransactionAt,version`。
- list filters：search, teamId, debt=`owing|clear`, status, sort=`lastTransactionAt_desc|receivable_desc|name_asc`, page, pageSize。
- PATCH version 不匹配：409 `VERSION_CONFLICT`。

### Team / Project

- TeamInput：name, leader, phone, status, note, version。
- ProjectInput：name, address, manager, workerIds（至少 1）, teamId, startDate, endDate, status, note, version。
- `endDate < startDate`：422 `VALIDATION_ERROR`。
- 当前项目 list 只正式承诺 search/status/page/pageSize；建议兼容扩展 workerId/teamId 以修复详情页前端分页过滤问题。

### Material / Pricing

- MaterialInput：name, category, brand, specification, unit, defaultPrice, costPrice, status, version。
- Pricing GET：workerId 必填，返回全部 ACTIVE materials 的 default/customer/effective price。
- Pricing PATCH：`{workerId,prices:[{materialId,price|null}]}`；null 表示移除客户价。
- 数据库可版本化价格，但响应保持当前字段。

### Order

- Input：workerId, projectId|null, projectName|null, occurredAt, items, paymentAmount, prepaidDeduction, paymentMethod|null, note。
- Item Input：materialId, quantity, unitPrice, discount。
- 如果 paymentAmount > 0 且无 paymentMethod：422。
- 后端重新计算并校验报价、优惠、预存和结算；不信任客户端汇总。
- Response 必须完全符合当前 `orderSchema`，包括：goodsAmount、discountAmount、finalAmount、paymentAmount、prepaidDeduction、addedReceivable、returnedAmount、settledAmount、outstandingAmount。
- list filters：search, workerId, status, from, to, page, pageSize。

### Payment / Prepaid / Return

- PaymentInput/PrepaidInput：workerId, amount>0, paymentMethod, occurredAt, note。
- Payment 超应收：422 `PAYMENT_EXCEEDED`。
- ReturnInput：orderId, occurredAt, items=`[{materialId,quantity}]`, note。
- 当前 Return Contract 不含 settlementType；只可实现 CREDIT_RECEIVABLE 兼容路径，超出可冲额度应拒绝。
- Return 创建者有 `returns:confirm` 时当前 Mock 会直接 CONFIRMED，否则 PENDING；该规则列为待确认风险。

### Ledger / Dashboard

- `/ledger/statement` 参数 workerId 必填，from/to 是门店时区业务日。
- 期末公式：opening + charge - payment - prepaid - return = closing。
- Dashboard 输出字段保持当前 Schema；所有日/月边界按 Store.timezone。

## 4. 稳定错误码

| HTTP | Code | 场景 |
|---:|---|---|
| 400 | INVALID_JSON | 无法解析 JSON |
| 401 | UNAUTHENTICATED / INVALID_CREDENTIALS / SESSION_EXPIRED | 认证失败 |
| 403 | FORBIDDEN / ACCOUNT_DISABLED / INVALID_ORIGIN | 权限、停用、来源 |
| 404 | *_NOT_FOUND | Worker/Team/Project/Material/Order 等不存在 |
| 409 | VERSION_CONFLICT | 乐观锁冲突 |
| 409 | IDEMPOTENCY_CONFLICT | 相同 key 不同请求 |
| 409 | *_ALREADY_REVERSED | 重复冲正 |
| 422 | VALIDATION_ERROR | 字段格式/基础校验 |
| 422 | IDEMPOTENCY_REQUIRED | 重要 POST 缺 key |
| 422 | MATERIAL_UNAVAILABLE | 材料无效或停用 |
| 422 | DISCOUNT_EXCEEDED | 行优惠超过折前金额 |
| 422 | SETTLEMENT_EXCEEDED | 付款+预存超过订单净额 |
| 422 | INSUFFICIENT_PREPAID_BALANCE | 预存不足（兼容期可别名 PREPAID_EXCEEDED） |
| 422 | PAYMENT_EXCEEDED | 收款超过应收 |
| 422 | RETURN_QUANTITY_EXCEEDED | 超可退数量 |
| 422 | RETURN_SETTLEMENT_REQUIRED | 退料超过可冲应收且缺少去向 |
| 422 | INVALID_DATE_RANGE | 日期范围错误 |
| 429 | RATE_LIMITED | 登录等限流 |
| 500 | INTERNAL_ERROR | 未分类服务错误，不泄露内部信息 |

## 5. 前端未有、暂不直接开放的未来端点

以下需要先补 UI/Zod/API Client/OpenAPI，再实现：Payment/Order/Return 冲正、预存退款/调整、Ledger Adjustment、Return confirm、库存调整、用户/角色管理、审计与 Integrity Check。禁止后端私自定义后要求前端追随。
