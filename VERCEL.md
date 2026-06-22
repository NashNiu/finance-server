# 后端部署到 Vercel(Serverless)

NestJS 在 Vercel 上以 **Serverless 函数**运行(不是常驻服务器)。本仓库已改造好:

- `api/[...path].js` — catch-all 函数,启动 Nest(Express adapter)并复用实例;
  它 `require` 的是 **`dist/` 里 tsc 编译后的产物**,以保留 NestJS 的装饰器元数据
  (Vercel 默认用 esbuild 打包会丢失元数据、破坏依赖注入)。
- `src/app-setup.ts` — 本地服务器(`main.ts`)与 Serverless 共用的 Nest 配置。
- `vercel.json` — 构建命令 `prisma generate && nest build`,函数超时 30s。
- Prisma 用 driver adapter(`@prisma/adapter-pg`),**无引擎二进制**,打包干净。

## 部署步骤

1. **Vercel 新建 Project**,导入 `NashNiu/finance-server` 仓库,选择本分支
   (`vercel-serverless`)或先把它合并到 `dev`/`main` 再选对应分支。
2. **Framework Preset**:选 **Other**(不要选框架)。Build/Output 留空,
   `vercel.json` 已指定构建命令。
3. **Node.js Version**:Project Settings → 选 **20.x 或 22.x**
   (`package.json` 的 `engines` 已声明 `>=20`)。
4. **Environment Variables**(Production):
   - `DATABASE_URL` = Supabase Session pooler 连接串,**用 `?sslmode=no-verify`**,
     密码里的特殊字符做 URL 编码(`%`→`%25`、`@`→`%40`)。
   - `JWT_SECRET` = 一串随机长字符串。
   - `JWT_EXPIRES` = `7d`(可选)。
   - 不要设 `CORS_ORIGIN`(前端走同源 rewrite);若前后端跨域再设。
5. **数据库迁移/seed**:Vercel 构建**不会**跑 `prisma db push`/seed。
   首次部署前在本地对着 Supabase 跑一次即可(已完成):
   ```
   npm run prisma:push && npm run prisma:seed
   ```
   以后改了 schema,也在本地 `npm run prisma:push` 后再部署。
6. Deploy。接口地址:`https://<backend>.vercel.app/api/...`
   (例:`/api/auth/login`、`/api/categories`)。

## 前端对接(finance-web)

`finance-web/vercel.json` 里把 `/api` rewrite 到这个后端项目:
```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://<backend>.vercel.app/api/:path*" }
  ]
}
```
前端保持 `VITE_API_BASE_URL=/api`,这样浏览器只请求同源 `/api/*`,由 Vercel
转发到后端,**无需 CORS**。

## 注意

- **连接数**:Serverless 每个并发实例各持一条到 Supabase 的连接。低流量够用;
  并发高时改用 Supabase **Transaction pooler(6543)** 并在连接串加 `pgbouncer=true`。
- **冷启动**:首个请求要等 Nest 启动,略慢;之后热实例很快。
- 本地仍可正常 `npm run start:dev`(走 `main.ts` 的常驻服务器)。
