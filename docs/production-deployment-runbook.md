# 云记账部署命令（前端 + 后端）

代码提交并推送后，等待对应 ACR 镜像构建成功，再在服务器执行以下命令。前后端同时发布时，先后端、后前端。

**不再执行 `docker compose up -d --build`，服务器不构建镜像。**

## 前端更新

```bash
cd /root/opt/claude-ledger
docker compose pull frontend &&
docker compose up -d --no-deps --no-build --pull never frontend
```

检查状态，等待显示 `healthy`：

```bash
docker compose ps frontend
curl -fsS -o /dev/null -w 'HTTP %{http_code}\n' https://47.94.95.143/login
```

查看日志：

```bash
docker compose logs --tail=50 frontend
```

## 后端更新（没有新数据库迁移）

```bash
cd /root/opt/claude-ledger-backend
docker compose pull api &&
docker compose up -d --no-deps --no-build --pull never api
```

检查状态，健康接口应返回应用和数据库均为 `up`：

```bash
docker compose ps api
curl -fsS http://127.0.0.1:8080/health
```

查看日志：

```bash
docker compose logs --tail=50 api
```

## 后端有新数据库迁移时

先把与本次 ACR 镜像对应版本的 `migrations/` 同步到服务器，保留生产 `.env`。迁移读取服务器文件，拉取 API 镜像不会更新它们。

以下在服务器 Bash 中执行；任何一步失败立即停止，不继续更新 API。迁移必须兼容仍在运行的旧 API；不兼容的迁移需安排维护窗口。

```bash
(
  set -eu
  cd /root/opt/claude-ledger-backend
  docker compose pull api

  backup_dir="/root/opt/backups/database-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$backup_dir"
  chmod 700 "$backup_dir"
  umask 077
  docker compose exec -T postgres sh -c \
    'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' \
    > "$backup_dir/database.dump"
  test -s "$backup_dir/database.dump"
  docker compose exec -T postgres pg_restore --list \
    < "$backup_dir/database.dump" > "$backup_dir/database-toc.txt"

  docker compose --profile tools run --rm --no-deps --no-build migrate up
  docker compose --profile tools run --rm --no-deps --no-build migrate version
  docker compose up -d --no-deps --no-build --pull never api
)
```

完成后执行上方后端健康检查。不要用 `migrate force` 跳过迁移错误，不要执行 `docker compose down -v`。

## 当前镜像与注意事项

前端 `compose.yaml` 的 `frontend.image`：

```text
crpi-qs80efbyksjfaftp.cn-beijing.personal.cr.aliyuncs.com/cloud-ledger/cloud-ledger:latest
```

后端 `docker-compose.yml` 的 `api.image`：

```text
crpi-qs80efbyksjfaftp.cn-beijing.personal.cr.aliyuncs.com/cloud-ledger/claude-ledger-backend:latest
```

- `git pull` 更新代码；`docker compose pull` 拉取新镜像。普通应用更新只需拉取镜像，迁移文件或部署配置变更时另行同步。
- 镜像拉取失败时停止，不继续切换容器。若提示未登录或无权限，先执行 `docker login crpi-qs80efbyksjfaftp.cn-beijing.personal.cr.aliyuncs.com`。
- 前端 API 地址 `/api/v1` 在 ACR 构建时写入；改地址需要重新构建 ACR 镜像。
- 前端 ACR 已通过开启「海外机器构建」解决 Docker Hub 基础镜像拉取超时。
- 应用镜像和数据备份应保留到验收完成，便于回滚。
