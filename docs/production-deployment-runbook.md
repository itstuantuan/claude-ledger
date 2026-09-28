# 云记账生产部署手册（前后端 ACR 镜像发布）

适用于已有生产环境的版本更新：**代码更新 → ACR 构建并推送成功 → 服务器拉取镜像 → 必要的数据库迁移 → 更新后端 → 更新前端 → 验收**。

服务器不承担镜像构建。前后端均禁止执行 `docker compose up -d --build`，也不要在服务器执行 `docker compose build` 或 `docker build`。ACR 构建失败或镜像拉取失败时，停止本次发布，保留现有容器运行。

本文是操作说明，不表示已执行服务器部署。服务器信息沿用原部署记录，执行前应核对实际环境。

## 1. 环境与发布前提

| 项目 | 前端 | 后端 |
| --- | --- | --- |
| 代码分支（沿用原记录） | `main-diy` | `main` |
| 服务器目录 | `/root/opt/claude-ledger` | `/root/opt/claude-ledger-backend` |
| Compose 文件 | `compose.yaml` | `docker-compose.yml` |
| 应用服务名 | `frontend` | `api` |
| 生产监听地址 | `127.0.0.1:3000` | `127.0.0.1:8080` |

服务器：`47.94.95.143`；Nginx 公网入口：`https://47.94.95.143`。

发布前确认：

1. 前后端代码均已推送到 ACR 构建任务实际关联的仓库和分支。记录两个提交 SHA，不再以某次功能的提交标题作为发布条件。
2. 两个 ACR 构建任务均已成功，目标镜像已经推送，镜像架构匹配服务器。
3. 记录镜像完整地址、标签和 digest。优先使用发布专用标签或 `仓库@sha256:…`；使用 `latest` 时必须核对构建记录与拉取后的 digest，防止发布到其他并发构建的版本。
4. 前端 Dockerfile 已固定 `NEXT_PUBLIC_API_MODE=real`；ACR 构建参数 `NEXT_PUBLIC_API_BASE_URL` 应为 `/api/v1`。公开环境变量已写入浏览器产物，服务器修改 `.env` 不会改变镜像中的值。变更 API 地址后应重新触发 ACR 构建。
5. 后端若有新迁移，服务器 `migrations/` 必须与本次后端镜像对应提交一致。当前迁移服务挂载宿主机 `./migrations`，仅拉取 API 镜像不会更新迁移文件。

不要覆盖生产 `.env`，不要执行 `git reset --hard`、`git clean` 或 `docker compose down -v`。日常发布只更新两个应用服务，不重建数据库，不运行 seed。

## 2. 一次性确认生产镜像配置

以下命令均在服务器 SSH 终端执行。登录：

```bash
ssh root@47.94.95.143
```

当前后端 Compose 中的 API 镜像为：

```text
crpi-qs80efbyksjfaftp.cn-beijing.personal.cr.aliyuncs.com/cloud-ledger/claude-ledger-backend:latest
```

当前前端仓库的 Compose 仍包含 `build:`，且 `image:` 为本地名称 `claude-ledger-frontend:latest`，不能直接把它当作 ACR 镜像拉取。前端 ACR 的实际仓库名未保存在当前项目配置中，应从成功的 ACR 构建记录复制，不能猜测。

为两个项目分别创建服务器本地的 `compose.acr.yaml`，用于指定本次发布镜像。若文件已经存在，先检查并保存原内容，再更新镜像地址，不要覆盖其他生产配置。

前端 `/root/opt/claude-ledger/compose.acr.yaml`：

```yaml
services:
  frontend:
    image: <替换为前端 ACR 完整镜像地址及标签或 digest>
```

后端 `/root/opt/claude-ledger-backend/compose.acr.yaml`：

```yaml
services:
  api:
    image: <替换为后端 ACR 完整镜像地址及标签或 digest>
```

两个占位符必须替换后才能继续。后端可使用上方已知地址，但发布专用标签或 digest 应以实际构建结果为准。覆盖文件只改应用镜像，沿用原 Compose 的环境变量、网络、健康检查及数据卷。前端遗留的 `build:` 不会被覆盖文件删除，因此所有启动命令都必须带 `--no-build`。

前端生产 `.env` 应包含以下非密钥配置；已存在 `.env` 时只核对对应项：

```dotenv
NEXT_PUBLIC_API_MODE=real
NEXT_PUBLIC_API_BASE_URL=/api/v1
FRONTEND_PORT=127.0.0.1:3000
```

`NEXT_PUBLIC_API_BASE_URL` 在此也用于满足原 Compose 的变量校验；实际浏览器地址仍由 ACR 构建时的值决定。后端核对 `APP_ENV=production`、`COOKIE_SECURE=true`，以及 `CORS_ORIGINS` 包含实际 HTTPS 入口，保留数据库凭据和 JWT 密钥。

定义后续使用的 Compose 快捷函数，确保每次都加载基础文件和 ACR 覆盖文件。**后续命令需在同一 Bash 会话中运行；重新登录后先重新定义函数。**

```bash
bash
fe() {
  (cd /root/opt/claude-ledger && docker compose -f compose.yaml -f compose.acr.yaml "$@")
}
be() {
  (cd /root/opt/claude-ledger-backend && docker compose -f docker-compose.yml -f compose.acr.yaml "$@")
}

fe config --quiet
be config --quiet
fe config --images
be config --images
fe ps
be ps
```

确认输出中的两个应用镜像正是本次 ACR 构建产物；两个 `config --quiet` 都必须成功。不要分享完整 `config` 输出，其中可能包含生产密钥。使用既有 Compose 项目名，不要另加 `-p` 或改变原 `COMPOSE_PROJECT_NAME`。

## 3. 每次发布：检查并保存回滚镜像

先确认当前应用、数据库和 Nginx 正常：

```bash
fe ps
be ps
nginx -t
curl -fsS http://127.0.0.1:8080/health
curl -fsS -o /dev/null http://127.0.0.1:3000/login
```

每条检查成功后再继续。如果发布前已经异常，先排查原故障。

在拉取新镜像之前保存当前运行镜像。以下代码在子 shell 中遇错停止；必须看到最后的备份路径才算完成：

```bash
(
  set -eu
  release_stamp="$(date +%Y%m%d-%H%M%S)"
  backup_dir="/root/opt/backups/claude-ledger-$release_stamp"
  mkdir -p "$backup_dir"
  chmod 700 "$backup_dir"
  fe_id="$(fe ps -q frontend)"
  be_id="$(be ps -q api)"
  test -n "$fe_id"
  test -n "$be_id"
  fe_image="$(docker inspect "$fe_id" --format '{{.Image}}')"
  be_image="$(docker inspect "$be_id" --format '{{.Image}}')"
  docker tag "$fe_image" "claude-ledger-frontend:rollback-$release_stamp"
  docker tag "$be_image" "claude-ledger-backend-api:rollback-$release_stamp"
  printf '%s\n' "$fe_image" > "$backup_dir/frontend-image-id.txt"
  printf '%s\n' "$be_image" > "$backup_dir/backend-image-id.txt"
  printf 'services:\n  frontend:\n    image: claude-ledger-frontend:rollback-%s\n' "$release_stamp" > "$backup_dir/frontend.rollback.yaml"
  printf 'services:\n  api:\n    image: claude-ledger-backend-api:rollback-%s\n' "$release_stamp" > "$backup_dir/backend.rollback.yaml"
  printf '备份目录：%s\n' "$backup_dir"
)
```

记下输出的真实路径，在后续命令中赋值：

```bash
backup_dir='/root/opt/backups/claude-ledger-替换为上一步时间戳'
test -s "$backup_dir/frontend.rollback.yaml"
test -s "$backup_dir/backend.rollback.yaml"
```

任一验证失败时停止。发布验收和回滚窗口结束前，不要清理这些旧镜像。

## 4. 登录 ACR 并拉取前后端镜像

使用 ACR 提供的用户名和仓库访问凭证登录。以下是当前后端的 Registry；前端若使用另一个 Registry，还需要登录该地址：

```bash
docker login crpi-qs80efbyksjfaftp.cn-beijing.personal.cr.aliyuncs.com
be pull api && fe pull frontend
```

两个镜像都拉取成功后，核对输出的 digest 与 ACR 发布记录，然后才能执行迁移或切换。拉取不会替换正在运行的容器。失败时解决仓库权限、标签或网络问题再重试，不要退回服务器构建。

## 5. 有数据库迁移时：同步文件、备份、迁移

没有新迁移时跳过本节。应用镜像更新通常不要求服务器拉取全部业务源码，但本项目迁移读取宿主机文件，因此有新迁移时必须同步匹配镜像版本的 `migrations/` 和必要的部署配置。

同步前检查服务器仓库 `git status --short --branch`。使用当前可用的 Git 或文件传输流程取得准确的发布提交，不覆盖人工修改和 `.env`。Git bundle 只是无法访问远程仓库时的备用传输方式，不是每次镜像部署的必需步骤。

先备份数据库并验证备份可读；本块失败后不可继续迁移：

```bash
(
  set -eu
  : "${backup_dir:?请先设置本次备份目录}"
  test -d "$backup_dir"
  umask 077
  be exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$backup_dir/database.dump"
  test -s "$backup_dir/database.dump"
  be exec -T postgres pg_restore --list < "$backup_dir/database.dump" > "$backup_dir/database-toc.txt"
  test -s "$backup_dir/database-toc.txt"
)
```

确认 `DATABASE_URL` 指向当前生产数据库，迁移脚本与目标镜像匹配，并评估旧 API 是否能在迁移期间继续工作。不兼容或长时间锁表的迁移需安排维护窗口、暂停业务写入。

```bash
be --profile tools run --rm --no-deps --no-build migrate version
be --profile tools run --rm --no-deps --no-build migrate up
be --profile tools run --rm --no-deps --no-build migrate version
```

每条成功后再运行下一条；预期版本以本次发布脚本为准。当前本地项目最高迁移是 `000006_create_payment_allocations`，对应版本 6，但以后不能把 6 当作固定目标。结果必须不是 dirty 状态。

`migrate` 当前使用 `migrate/migrate:v4.19.1` 工具镜像，不在 API 镜像内；缺少时需提前确保该镜像可获取。`--no-deps` 不会启动数据库，因此数据库必须已经运行且健康。迁移失败时停止发布，保留错误，不随意 `force` 或 `down`。

## 6. 切换后端，再切换前端

先更新后端，仅替换 API 服务：

```bash
be up -d --no-deps --no-build --pull never api
be ps api
be logs --no-color --tail=80 api
curl -fsS http://127.0.0.1:8080/health
```

等待后端启动完成，确认健康接口成功、日志无启动错误，再更新前端：

```bash
fe up -d --no-deps --no-build --pull never frontend
fe ps frontend
fe logs --no-color --tail=80 frontend
docker inspect "$(fe ps -q frontend)" --format '{{.State.Health.Status}}'
curl -fsS -o /dev/null http://127.0.0.1:3000/login
```

前端健康检查可能需要几十秒，等待状态变为 `healthy`。启动成功不等于验收完成。`--no-build` 明确禁止本机构建，`--pull never` 确保使用刚才已拉取并核对的本地镜像，`--no-deps` 避免同时操作数据库等依赖。

Compose 会在镜像变更后重建对应容器，通常无需 `--force-recreate`，也无需先执行 `down`。单实例切换可能存在短暂中断。

## 7. 验收并记录实际运行版本

```bash
nginx -t
curl -fsS https://47.94.95.143/health
curl -fsS -o /dev/null https://47.94.95.143/login
curl -sS -o /dev/null -w '%{http_code}\n' http://47.94.95.143/
docker inspect "$(fe ps -q frontend)" --format '{{.Config.Image}} {{.Image}}'
docker inspect "$(be ps -q api)" --format '{{.Config.Image}} {{.Image}}'
```

确认 HTTPS 正常、HTTP 跳转 HTTPS（原环境预期 308）、运行镜像与目标版本一致。证书校验失败时排查证书，不把忽略校验作为验收通过。

浏览器登录，检查页面加载、API 请求、登录态和本次变更对应的业务流程。补料、退料、指定订单收款、自动核销等写入验收应使用约定的测试账号和测试业务数据，避免污染真实账务。

在本次备份目录记录前后端提交 SHA、ACR 构建编号、目标 digest、实际运行镜像 ID、数据库版本、发布时间及验收结果。暂时保留数据库备份和回滚镜像。

## 8. 回滚应用

先设置 `backup_dir` 为第 3 节记录的实际备份路径。回滚文件引用发布前运行镜像的独立本地标签，不依赖已移动的 `latest`，也不拉取远端镜像。

回滚前端：

```bash
fe -f "$backup_dir/frontend.rollback.yaml" up -d --no-deps --no-build --pull never frontend
fe ps frontend
curl -fsS -o /dev/null http://127.0.0.1:3000/login
```

回滚后端前，先确认旧 API 与当前数据库结构、已产生的新数据兼容：

```bash
be -f "$backup_dir/backend.rollback.yaml" up -d --no-deps --no-build --pull never api
be ps api
curl -fsS http://127.0.0.1:8080/health
```

回滚覆盖文件临时指定旧镜像；原 `compose.acr.yaml` 仍指向新版本。回滚成功后，应把其镜像地址改为经核对的旧版本地址，或在后续操作中持续加载回滚覆盖文件，避免再次启动失败版本。

应用回滚不会撤销迁移。不要机械执行 `migrate down 1`；先评估数据损失与兼容性。恢复整库需要停止业务写入、确认恢复时间点及备份后新增数据的处理方式，并执行经过验证的恢复流程。这里不把破坏性数据库操作作为常规发布步骤。

## 9. 日常发布速查

完成 ACR 配置、定义 `fe` / `be` 函数、记录旧镜像，且确认无需迁移后，核心操作是：

```bash
be pull api && fe pull frontend
# 上行必须成功；核对两个镜像 digest 后继续。
be up -d --no-deps --no-build --pull never api
# 确认后端 /health 成功后继续。
fe up -d --no-deps --no-build --pull never frontend
```

有迁移时，在拉取成功后、切换后端前插入第 5 节。无论前端还是后端，都不在服务器重新构建镜像。
