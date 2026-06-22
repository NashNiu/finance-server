# 云端部署:Vercel(前端) + Render(后端) + Supabase(Postgres)

整体架构:

```
浏览器 ──> Vercel(finance-web 静态站)
                │  /api/* 通过 vercel.json rewrite 反向代理(同源,无 CORS)
                ▼
            Render(finance-server / NestJS)
                │  Prisma + @prisma/adapter-pg
                ▼
            Supabase(PostgreSQL)
```

> 数据库已从 MySQL 迁移到 PostgreSQL(Prisma `provider = postgresql`,驱动 `@prisma/adapter-pg`)。
> 本地开发也需要 Postgres:用本地 Postgres,或直接把本地 `.env` 的 `DATABASE_URL` 指向 Supabase。

部署顺序:**Supabase → Render → Vercel**(因为 Vercel 的 rewrite 需要填 Render 的地址)。

---

## 1. Supabase(数据库)

1. 在 https://supabase.com 新建项目,设置数据库密码,等待初始化。
2. **Project Settings → Database → Connection string → URI**,选 **Session pooler**(端口 `5432`,IPv4 兼容,适合 Render 这种常驻服务,且支持 prepared statements)。形如:
   ```
   postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-0-xxx.pooler.supabase.com:5432/postgres
   ```
3. 末尾加 `?sslmode=no-verify`(**不要用 `require`**:较新的 pg 把 `require` 当成 `verify-full` 严格校验,会因 pooler 证书校验失败报 `TlsConnectionError`/500;`no-verify` 表示用 SSL 但不强制校验证书)。把 `[YOUR-PASSWORD]` 换成真实密码,并对密码里的特殊字符做 URL 编码(`%`→`%25`、`@`→`%40` 等)。这串就是后端的 `DATABASE_URL`,例如:
   ```
   postgresql://postgres.xxxx:%25Ef5tq.UC5dBT%40G@aws-0-xxx.pooler.supabase.com:5432/postgres?sslmode=no-verify
   ```

> 表结构和默认分类数据不用手动建——Render 构建时会自动 `prisma db push` + 跑 seed。

---

## 2. Render(后端 finance-server)

New → **Web Service**,连接 `finance-server` 仓库(分支 `dev` 或你的主分支):

| 配置项 | 值 |
|--------|-----|
| Runtime | Node |
| Build Command | `npm run render:build` |
| Start Command | `npm run start:prod` |

`render:build` 会:装依赖(含 devDeps)→ `prisma generate` → `nest build` → `prisma db push`(建表/建枚举)→ seed(幂等写入默认分类)。

**Environment 环境变量**:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | 第 1 步的 Supabase Session pooler URI(带密码、`?sslmode=require`) |
| `JWT_SECRET` | 一串随机长字符串(别用默认) |
| `JWT_EXPIRES` | `7d` |

> 不要设 `HOST`(默认 `0.0.0.0` 正确);`PORT` 由 Render 注入,代码已读取 `process.env.PORT`。
> `CORS_ORIGIN` 留空即可(前端走 Vercel rewrite,同源,无需 CORS)。

部署成功后记下后端地址,形如 `https://finance-server-xxxx.onrender.com`。
验证:浏览器打开 `https://<render>/api/categories` 应返回 `{"code":401,...}`(未带 token 的正常响应,说明服务和数据库都通了)。

> 注意:Render 免费 Web 服务闲置 ~15 分钟会休眠,下次请求冷启动 ~30–50s。属正常。

---

## 3. Vercel(前端 finance-web)

1. 先改 `finance-web/vercel.json`,把占位地址换成你的 Render 地址:
   ```json
   {
     "rewrites": [
       { "source": "/api/:path*", "destination": "https://finance-server-xxxx.onrender.com/api/:path*" }
     ]
   }
   ```
   提交并推送。
2. Vercel New Project → 导入 `finance-web` 仓库。框架会自动识别 **Vite**:
   - Build Command:`npm run build`(默认)
   - Output Directory:`dist`(默认)
   - 环境变量:无需额外设置(`.env.production` 里已是 `VITE_API_BASE_URL=/api`)。
3. Deploy。打开分配的 `*.vercel.app` 域名即可使用。

前端调用 `/api/*` 会被 Vercel 反代到 Render,**同源、无 CORS、无预检**。

---

## 改动清单(本次为上云所做)

- `prisma/schema.prisma`:`provider` 改为 `postgresql`
- 依赖:移除 `@prisma/adapter-mariadb`/`mariadb`,新增 `@prisma/adapter-pg`/`pg`
- `prisma.service.ts`、`prisma/seed.ts`:改用 `PrismaPg`
- `package.json`:修正 `start:prod` 为 `node dist/src/main`;新增 `prisma:push` / `deploy:db` / `render:build`
- `.env.example`:改为 Postgres/Supabase 示例
- `finance-web/vercel.json`:新增 `/api` rewrite 到 Render

## 本地开发(迁到 Postgres 后)

- 起一个本地 Postgres(或用 Supabase 的连接串),把 `finance-server/.env` 的 `DATABASE_URL` 换成 Postgres。
- `npm run prisma:generate && npm run prisma:push && npm run prisma:seed` 初始化。
- e2e 测试现在需要一个可连的 Postgres(本地或 Supabase)。
