# TransitOps — Deploy (Neon + Render + Vercel)

## Architecture

```text
Browser → Vercel (apps/web)
              ↓ HTTPS
         Render (apps/api)
              ↓ DATABASE_URL
         Neon Postgres
```

React **never** connects to Neon. Only the API does.

---

## A. Neon (database)

1. Project already created (see SETUP.md)  
2. Keep **DATABASE_URL** (pooler) + **DIRECT_URL** (direct)  
3. Tables: created by `pnpm db:push` or `prisma migrate deploy` from API  

No Render disk needed.

---

## B. Render (API)

1. **New → Web Service** → connect GitHub repo  
2. Settings:

| Field | Value |
|-------|--------|
| **Root Directory** | `apps/api` |
| **Runtime** | Node |
| **Build Command** | `pnpm install && pnpm exec prisma generate && pnpm build` |
| **Start Command** | `pnpm start` |
| | (`prisma db push` then `node dist/index.js` — keeps Neon schema in sync) |
| **Plan** | Free |

If `pnpm` missing on build:

```bash
npm install -g pnpm && pnpm install && pnpm exec prisma generate && pnpm build
```

**P3005 fix:** Tables were created with `db:push`, so do **not** run `prisma migrate deploy` on start.  
Use start command: `pnpm start` (only `node dist/index.js`).

3. **Environment variables:**

```env
DATABASE_URL=<Neon pooler URI ?sslmode=require>
DIRECT_URL=<Neon direct URI ?sslmode=require>
JWT_SECRET=<long-random-production-secret>
CORS_ORIGIN=https://YOUR-APP.vercel.app
PORT=10000
```

4. Deploy → test:

```text
https://YOUR-API.onrender.com/api/health
```

5. Seed once (Shell or one-off):

```bash
pnpm exec tsx prisma/seed.ts
```

(with same env vars)

---

## C. Vercel (Web)

1. **Import** GitHub repo  
2. Settings:

| Field | Value |
|-------|--------|
| **Root Directory** | `apps/web` |
| **Framework** | Vite |
| **Build** | `pnpm install && pnpm build` |
| **Output** | `dist` |

3. **Env:**

```env
VITE_API_URL=https://YOUR-API.onrender.com
```

4. Deploy  
5. Set Render `CORS_ORIGIN` to the Vercel URL → redeploy API  

---

## D. Checklist

- [ ] Neon project + URLs in Render env  
- [ ] API health returns `ok: true`  
- [ ] Seeded demo users  
- [ ] Vercel `VITE_API_URL` points at Render  
- [ ] Login works on live site  

**Free Render sleeps** — first request may take 30–60s.

---

## E. Do not

- Put `DATABASE_URL` on Vercel  
- Commit `.env` with real passwords  
- Share Neon password in a public README  
