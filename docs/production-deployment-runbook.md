# 云记账生产部署手册

本文档用于把“订单补料/退料 + 独立收款指定订单核销”版本部署到当前生产服务器 `47.94.95.143`。

本次目标版本：

- 前端仓库：`main-diy`，分支最新提交应包含 `feat: add order-specific payment allocation`。
- 后端仓库：`main`，分支最新提交应包含 `feat: add independent payment allocation`。
- 前端服务器目录：`/root/opt/claude-ledger`。
- 后端服务器目录：`/root/opt/claude-ledger-backend`。
- 前端容器：`claude-ledger-frontend-1`，只监听 `127.0.0.1:3000`。
- 后端容器：`claude-ledger-backend-api-1`，只监听 `127.0.0.1:8080`。
- 公网入口：Nginx，访问地址 `https://47.94.95.143`。

> 本次发布包含数据库迁移。务必先备份数据库，再迁移，最后依次更新后端和前端。不要使用 `git reset --hard`，不要删除服务器现有 `.env`。

## 1. 在本机确认待发布代码

在哪里执行：开发用 Mac 终端。

这一步在做什么：确认本地两个仓库已经包含本次功能提交，同时检查是否存在未提交文件。未提交文件不会进入后面生成的 Git bundle。

```bash
git -C /Users/macbookpro/Documents/dev/claude-ledger status --short --branch
git -C /Users/macbookpro/Documents/dev/claude-ledger log -3 --oneline

git -C /Users/macbookpro/Documents/dev/claude-ledger-backend status --short --branch
git -C /Users/macbookpro/Documents/dev/claude-ledger-backend log -3 --oneline
```

预期结果：

- 前端日志中能看到 `feat: add order-specific payment allocation`。
- 后端日志中能看到 `feat: add independent payment allocation`。
- 前端的 `next-env.d.ts` 和后端的 `.env.local-compose` 即使显示为未提交，也不要顺手删除；它们不属于本次发布提交。

## 2. 在本机生成离线代码包

在哪里执行：开发用 Mac 终端。

这一步在做什么：由于当前 GitHub 登录账号没有两个仓库的写入权限，服务器不能通过远程仓库取得新提交。Git bundle 会把指定分支的完整 Git 提交和对象打成单文件，服务器收到后仍可用标准 Git 快进合并。

```bash
release_dir="$(mktemp -d /tmp/claude-ledger-release.XXXXXX)"

git -C /Users/macbookpro/Documents/dev/claude-ledger \
  bundle create "$release_dir/claude-ledger-frontend.bundle" main-diy

git -C /Users/macbookpro/Documents/dev/claude-ledger-backend \
  bundle create "$release_dir/claude-ledger-backend.bundle" main

ls -lh "$release_dir"
```

预期结果：目录中出现两个非空的 `.bundle` 文件。

## 3. 把代码包上传到服务器

在哪里执行：仍在开发用 Mac 终端。

这一步在做什么：使用 SSH 密码登录，将两个代码包复制到服务器 `/root/opt`。这一步只上传文件，不会修改正在运行的容器。

```bash
scp "$release_dir/claude-ledger-frontend.bundle" \
  "$release_dir/claude-ledger-backend.bundle" \
  root@47.94.95.143:/root/opt/
```

终端提示时输入服务器 root 密码。上传完成后再登录服务器：

```bash
ssh root@47.94.95.143
```

后续第 4～12 步均在服务器 SSH 终端执行。

## 4. 检查当前生产状态

在哪里执行：服务器 SSH 终端。

这一步在做什么：在修改生产环境前确认 Nginx、数据库、前端和后端目前都正常。如果发布前已经异常，应先排查原故障，不要把故障和新版本混在一起处理。

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
nginx -t
curl -fsS http://127.0.0.1:8080/health
curl -fsSI http://127.0.0.1:3000/login | head
curl -fsS https://47.94.95.143/health
```

预期结果：

- `nginx -t` 显示配置测试成功。
- 后端 `/health` 返回正常 JSON。
- 前端 `/login` 返回 `HTTP/1.1 200`。
- 公网 HTTPS 健康检查成功。

## 5. 检查两个服务器仓库是否干净

在哪里执行：服务器 SSH 终端。

这一步在做什么：避免覆盖服务器上尚未保存的人工修改。`git merge --ff-only` 本身不会强行覆盖，但提前检查能减少误操作。

```bash
git -C /root/opt/claude-ledger status --short --branch
git -C /root/opt/claude-ledger-backend status --short --branch
```

预期结果：两个仓库都不应出现未知的已修改或未跟踪代码文件。`.env` 通常被 Git 忽略，所以不会显示。

如果这里出现不认识的改动：立即停止发布，先把输出保存下来确认用途。不要执行 `git reset --hard` 或 `git clean`。

## 6. 创建发布备份

在哪里执行：服务器 SSH 终端。

这一步在做什么：保存发布前的数据库、代码提交号和容器镜像。代码或容器更新失败时，可以快速恢复到发布前状态。

```bash
release_stamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="/root/opt/backups/claude-ledger-$release_stamp"
mkdir -p "$backup_dir"

git -C /root/opt/claude-ledger rev-parse HEAD > "$backup_dir/frontend-commit.txt"
git -C /root/opt/claude-ledger-backend rev-parse HEAD > "$backup_dir/backend-commit.txt"

docker tag "$(docker inspect claude-ledger-frontend-1 --format '{{.Image}}')" \
  "claude-ledger-frontend:pre-payment-$release_stamp"

docker tag "$(docker inspect claude-ledger-backend-api-1 --format '{{.Image}}')" \
  "claude-ledger-backend-api:pre-payment-$release_stamp"

cd /root/opt/claude-ledger-backend
docker compose exec -T postgres sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' \
  > "$backup_dir/database.dump"

test -s "$backup_dir/database.dump"
ls -lh "$backup_dir"
```

预期结果：

- `database.dump` 大小不为 0。
- 目录内有前后端提交号文件。
- `docker image ls` 能看到两个带 `pre-payment-时间戳` 的备份镜像标签。

如果 `pg_dump` 报错或 `test -s` 失败：停止发布，不要执行数据库迁移。

## 7. 把新提交合入服务器代码目录

在哪里执行：服务器 SSH 终端。

这一步在做什么：从刚上传的 bundle 读取提交，并要求 Git 只能进行快进合并。`--ff-only` 可以防止服务器意外产生合并提交。

先更新后端：

```bash
cd /root/opt/claude-ledger-backend
git fetch /root/opt/claude-ledger-backend.bundle main
git merge --ff-only FETCH_HEAD
git log -3 --oneline
```

预期最近三条提交中包含：

```text
feat: add independent payment allocation
```

再更新前端：

```bash
cd /root/opt/claude-ledger
git fetch /root/opt/claude-ledger-frontend.bundle main-diy
git merge --ff-only FETCH_HEAD
git log -3 --oneline
```

预期最近三条提交中包含：

```text
feat: add order-specific payment allocation
```

如果 `git merge --ff-only` 失败：停止发布并保留输出。不要改成普通 `git merge`，也不要强制重置分支。

## 8. 核对生产环境变量

在哪里执行：服务器 SSH 终端。

这一步在做什么：确认浏览器始终通过当前 HTTPS 域名访问同源 API，后端也允许当前公网来源。这里只检查配置，不要把包含密码或 JWT 密钥的完整 `.env` 发到聊天或截图中。

前端检查：

```bash
grep -E '^(NEXT_PUBLIC_API_MODE|NEXT_PUBLIC_API_BASE_URL|FRONTEND_PORT)=' \
  /root/opt/claude-ledger/.env
```

应至少包含：

```text
NEXT_PUBLIC_API_MODE=real
NEXT_PUBLIC_API_BASE_URL=/api/v1
FRONTEND_PORT=127.0.0.1:3000
```

如果 `FRONTEND_PORT` 当前写法不同，但 `docker compose ps` 显示的确是 `127.0.0.1:3000->3000/tcp`，保持现状即可。

后端检查：

```bash
grep -E '^(APP_ENV|COOKIE_SECURE|CORS_ORIGINS)=' \
  /root/opt/claude-ledger-backend/.env
```

应包含或等价于：

```text
APP_ENV=production
COOKIE_SECURE=true
CORS_ORIGINS=http://47.94.95.143,https://47.94.95.143
```

不要修改数据库密码、JWT 密钥或其他生产密钥。

## 9. 执行数据库迁移

在哪里执行：服务器 SSH 终端，后端目录。

这一步在做什么：在已有第 5 版补料/退料结构之上应用 `000006_create_payment_allocations`，新增收款与订单的核销关系表，并为历史上开单时直接付款的记录回填核销关系。

```bash
cd /root/opt/claude-ledger-backend
docker compose --profile tools run --rm migrate up
```

预期输出包含：

```text
6/u create_payment_allocations
```

确认数据库当前迁移版本：

```bash
docker compose --profile tools run --rm migrate version
```

预期版本是 `6`，且不是 dirty 状态。

如果迁移失败：不要启动新版后端，也不要随意执行 `migrate force`。保留错误输出，根据第 13 节恢复数据库或排查迁移问题。

## 10. 构建并切换后端

在哪里执行：服务器 SSH 终端，后端目录。

这一步在做什么：先构建包含新接口的 Go 镜像，构建成功后只重建 API 容器，不重建 PostgreSQL。数据库在迁移和构建期间仍可由旧 API 服务。

```bash
cd /root/opt/claude-ledger-backend
docker compose build api
docker compose up -d --no-deps api
docker compose ps api
docker compose logs --no-color --tail=80 api
curl -fsS http://127.0.0.1:8080/health
```

预期结果：

- API 容器状态为 `Up`。
- 日志中没有数据库迁移、约束或启动错误。
- 本机 `/health` 返回正常结果。

如果 Docker Hub 下载超时：不要反复重启线上容器。保留旧容器运行，先解决镜像下载或从其他机器传入对应的 Linux amd64 基础镜像，再重新执行 `docker compose build api`。

## 11. 构建并切换前端

在哪里执行：服务器 SSH 终端，前端目录。

这一步在做什么：构建包含“自动核销最早订单”和“指定订单结款”入口的新 Next.js 镜像。只有构建完全成功后，Compose 才会重建线上前端容器。

```bash
cd /root/opt/claude-ledger
docker compose build frontend
docker compose up -d --no-deps frontend
docker compose ps frontend
docker compose logs --no-color --tail=80 frontend
```

等待健康检查变为 `healthy`：

```bash
docker inspect claude-ledger-frontend-1 --format '{{.State.Health.Status}}'
curl -fsSI http://127.0.0.1:3000/login | head
```

预期结果：健康状态为 `healthy`，登录页返回 200。

## 12. 检查 Nginx 和公网访问

在哪里执行：服务器 SSH 终端，然后在自己的电脑浏览器验收。

这一步在做什么：确认 Nginx 配置仍然只使用公网 IP，不再依赖 DuckDNS；确认 HTTP 会跳转 HTTPS，前端和 API 均能从公网访问。

服务器执行：

```bash
nginx -t
grep -n -E 'server_name|duckdns|proxy_pass' /etc/nginx/conf.d/cloud-ledger.conf
curl -fsS https://47.94.95.143/health
curl -fsSI https://47.94.95.143/login | head
curl -sS -o /dev/null -w '%{http_code}\n' \
  -H 'Content-Type: application/json' \
  -d '{}' \
  https://47.94.95.143/api/v1/auth/login
```

预期结果：

- `nginx -t` 成功。
- `server_name` 只有 `47.94.95.143`，没有 DuckDNS。
- `/health` 和 `/login` 正常。
- 空登录请求返回 `422`，这表示公网 Nginx 已把 `/api/v1` 正确转发给后端，而不是接口不存在。

自己的电脑执行：

```bash
curl -fsSI http://47.94.95.143/ | head
curl -fsSI https://47.94.95.143/login | head
```

HTTP 应返回 `308` 并跳转到 HTTPS；HTTPS 登录页应返回 `200`。

## 13. 使用真实账号进行业务验收

在哪里执行：电脑浏览器访问 `https://47.94.95.143`。

这一步在做什么：确认不仅容器健康，而且真实账号、权限、价格和账务数据可以走通完整业务链路。

建议选择一张专门用于验收、尚未结清的测试用料单：

1. 登录后进入“用料记录”，打开一张订单详情。
2. 确认页面右上角出现“补料”和“退料”按钮。
3. 点击“补料”，选择一种材料，输入数量后提交。
4. 确认当前材料数量、累计领料金额和未结金额相应增加。
5. 查看“用料变动流水”，确认出现补料单号、材料、操作人和时间。
6. 点击“退料”，退回刚才补入数量的一部分。
7. 确认当前数量、累计退料金额和未结金额相应减少。
8. 刷新页面，确认结果仍然存在，且流水没有重复。
9. 进入“收款”，选择该客户，先选“指定一张订单”，对一张未结订单登记一笔小额部分收款。
10. 确认收款列表展示指定订单号，订单已结金额增加、未结金额等额减少。
11. 再登记一笔“自动核销最早未结订单”的收款，确认系统优先冲减最早的未结订单。

当前安全规则：

- 退料数量不能超过这张订单当前剩余数量。
- 退料金额不能超过这张订单当前未结金额。
- 已收款部分如果也要退，需要先设计退款或转预存余额流程；当前版本会拒绝这种操作，防止账务出现无法解释的负数。
- 多人同时调整同一张订单时，后提交者会看到版本冲突提示，刷新后可以重新操作。
- 指定订单时，收款金额不能超过该订单未结金额；不指定时会按业务时间和创建顺序自动核销。

## 14. 应用回滚

仅当新版后端或前端出现无法立即修复的问题时执行。

### 14.1 回滚前端容器

这一步在做什么：把 `latest` 标签重新指向第 6 步保存的旧前端镜像，然后重建前端容器。不会影响数据库。

```bash
docker image ls 'claude-ledger-frontend:pre-payment-*'
docker tag "claude-ledger-frontend:pre-payment-$release_stamp" claude-ledger-frontend:latest
cd /root/opt/claude-ledger
docker compose up -d --no-build --no-deps --force-recreate frontend
docker compose ps frontend
```

如果 SSH 会话已经断开、`release_stamp` 变量不存在，请从 `docker image ls` 输出复制完整备份标签，不要猜时间戳。

### 14.2 回滚后端容器

这一步在做什么：恢复旧后端镜像。数据库第 6 版迁移可以暂时保留，旧 API 不会使用新增的核销关系表。

```bash
docker image ls 'claude-ledger-backend-api:pre-payment-*'
docker tag "claude-ledger-backend-api:pre-payment-$release_stamp" claude-ledger-backend-api:latest
cd /root/opt/claude-ledger-backend
docker compose up -d --no-build --no-deps --force-recreate api
curl -fsS http://127.0.0.1:8080/health
```

### 14.3 数据库回滚原则

如果上线后没有产生任何独立收款数据，可以在确认备份有效后执行：

```bash
cd /root/opt/claude-ledger-backend
docker compose --profile tools run --rm migrate down 1
```

如果已经产生真实独立收款数据，不要直接执行数据库降级。降级会删除收款与订单的核销关系，虽然付款和应收流水仍在，但订单级追溯会丢失。需要完整回到发布前状态时，应停掉 API，并使用第 6 步的 `database.dump` 恢复整个数据库；这会丢失备份之后产生的所有业务数据，必须先与业务人员确认时间窗口。

## 15. 发布成功后的记录与清理

在哪里执行：服务器 SSH 终端。

这一步在做什么：保留可追溯的发布信息，并把上传的 bundle 移入本次备份目录。这里使用移动而不是直接删除，方便短期内恢复或核对。

```bash
git -C /root/opt/claude-ledger rev-parse HEAD
git -C /root/opt/claude-ledger-backend rev-parse HEAD
docker compose -f /root/opt/claude-ledger/compose.yaml ps
docker compose -f /root/opt/claude-ledger-backend/docker-compose.yml ps

mv /root/opt/claude-ledger-frontend.bundle "$backup_dir/"
mv /root/opt/claude-ledger-backend.bundle "$backup_dir/"
```

最终确认：

- 前端提交历史包含 `feat: add order-specific payment allocation`。
- 后端提交历史包含 `feat: add independent payment allocation`。
- 数据库迁移版本为 `6`。
- 前端容器为 `healthy`，后端 `/health` 正常。
- 公网 HTTPS 正常。
- 至少完成一次指定订单部分结款和一次自动核销验收。
