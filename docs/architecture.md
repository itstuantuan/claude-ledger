# 云记账 Go 架构与 Phase 1 计划

## 1. 目标目录

前后端采用两个完全独立、平级的项目：

```text
/Users/admin/Documents/
├── claude-ledger/          # Next.js 前端
└── claude-ledger-backend/  # Go API
```

后端仓库内部：

```text
claude-ledger-backend/
├── cmd/server/main.go
├── internal/
│   ├── platform/
│   │   ├── config/ database/ logger/ middleware/
│   │   ├── validation/ response/ apperror/ transaction/
│   │   └── idempotency/
│   ├── auth/ user/ role/ permission/
│   ├── store/
│   ├── worker/ team/ project/
│   ├── material/ pricing/
│   ├── order/ payment/ prepaid/ returnorder/
│   ├── ledger/ finance/ inventory/
│   ├── reconciliation/ dashboard/ audit/ integrity/
│   └── businessnumber/
├── migrations/
├── docs/
├── tests/
├── Dockerfile
├── docker-compose.yml
├── go.mod
└── .env.example
```

每个 feature 仅按需要包含 `handler.go/service.go/repository.go/model.go/dto.go/routes.go`，不制造空层。GORM Model、API DTO、领域对象分离。

## 2. 依赖方向与事务边界

```text
HTTP Handler -> Application Service -> Repository interfaces
                                   -> Accounting services
Repository implementations -> GORM/PostgreSQL
```

- Handler：解析、基础校验、身份上下文、响应映射；不写账务规则。
- Service：权限后的业务编排、事务边界、锁顺序、金额规则、幂等。
- Repository：只访问数据，接受 `context.Context` 和共享的 `*gorm.DB` tx；不得偷偷 Begin/Commit。
- 查询侧可写专用 SQL/Query Service，避免为纯报表强套聚合对象。
- 所有 store-scoped Repository 方法强制接收 storeID，禁止只有 resourceID 的查询签名。

## 3. 平台规则

- Go 当前稳定版在 Phase 1 启动时从官方发布信息确认，不在 Phase 0 写死。
- Gin、GORM PostgreSQL driver、golang-jwt/jwt、validator、decimal、Zap、golang-migrate、OpenAPI。
- Config 仅来自环境变量，启动时验证必需项；不提交 secret。
- Request ID 入口生成/接受安全值，贯穿 context、日志、错误与响应 header。
- 日志字段：request_id、user_id、store_id、method、path、status、duration、error_code；禁止 token/password/cookie。
- Graceful shutdown：停止接收、带超时等待 HTTP、关闭 SQL DB。
- `/health` 返回应用与数据库状态；不泄露 DSN。
- 生产 CORS 只允许配置白名单；credentials 模式禁止 `*`；Cookie 写接口校验 Origin/CSRF。

## 4. Phase 1 具体任务

1. 建立独立平级项目 `../claude-ledger-backend` 及 Go module，与前端分别构建、部署和回滚；只创建本阶段需要的 platform 包。
2. 实现 Config：APP_ENV、APP_PORT、DATABASE_URL、JWT 配置占位、CORS_ORIGINS、LOG_LEVEL、HTTP/DB timeout。
3. 实现 Zap logger、敏感 header 过滤和环境化编码器。
4. 实现数据库连接池、ping、context timeout；不调用 AutoMigrate。
5. 引入 golang-migrate CLI/库，先创建 stores 基础 migration 和 migration 运行说明；完整业务 migration 在设计批准后的对应阶段落地。
6. 实现 AppError 与统一错误 middleware，输出当前前端错误 JSON；panic recovery 不泄露堆栈。
7. 实现 Request ID、访问日志、CORS、安全 header middleware。
8. 注册 `/health`，分别报告 application/database；添加数据库不可用测试。
9. 建立 validator 封装与 decimal/quantity JSON 类型，测试金额拒绝指数/超过精度/浮点。
10. 建立统一分页解析（page>=1、1<=pageSize<=50）及裸响应 DTO。
11. 提供 Dockerfile（multi-stage、非 root、健康检查）与 docker-compose postgres/api。
12. 提供 `.env.example`，不覆盖前端现有 `.env.local`。
13. 补全开发文档：启动 PostgreSQL、migrate up/down、运行服务、测试和排障。
14. 建立 httptest 测试：request ID、错误结构、CORS、panic、health、validation、graceful wiring。
15. CI/本地门禁：`go test ./...`、`go vet ./...`、格式检查、migration up/down/up 验证。

## 5. Phase 1 验收

- `docker compose up -d postgres` 后 migration 可重复执行。
- `go run ./cmd/server` 可启动；`GET /health` 检查应用与数据库。
- 错误 JSON 能被现有 `ApiError` 正确解析；成功 JSON 不多一层 envelope。
- CORS/credentials 对配置源正确，对其他源拒绝。
- 请求日志含 request/store/user 占位字段且无敏感值。
- SIGINT/SIGTERM 有界优雅退出。
- 所有 Phase 1 测试通过，前端现有 31 项测试仍为 31/31。

## 6. 后续阶段门禁

- Phase 2 前确认 refresh session 存储、Cookie path/domain/SameSite、权限常量完全兼容。
- Phase 3 前确认分类字符串兼容、客户价版本化策略、Project server-side worker/team filters。
- Phase 4 前必须批准 `accounting-rules.md`、订单手工价规则、三条 Ledger 分录模型及 Payment allocation。
- Phase 6 前必须决定 Return settlementType、申请/确认端点与原支付来源退款策略。
- Inventory 启用前必须决定 STRICT/WARN_ONLY/ALLOW_NEGATIVE，不能硬编码。

## 7. 明确不做

Phase 1 不实现业务 CRUD、认证、Ledger、Redis、消息队列、CQRS、微服务、Kubernetes，也不删除任何 Mock。遵循逐模块“后端测试通过 → 前端切换 → 前端测试通过 → 删除该模块 Mock”。
