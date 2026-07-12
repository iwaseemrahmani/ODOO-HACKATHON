# TransitOps — Local setup (team)

## 1. Tools (everyone)

1. **Node.js 20+** — https://nodejs.org  
2. **pnpm** — `npm install -g pnpm`  
3. **Git**  
4. **Neon account** — https://console.neon.tech  

Check:

```bash
node -v
pnpm -v
```

---

## 2. Clone / open project

```bash
cd C:\Users\user\Documents\GitHub\ODOO-HACKATHON
```

(Or `git clone <your-repo-url>` then `cd ODOO-HACKATHON`)

---

## 3. Neon database (P1 creates once, team shares URL privately)

### On Neon console

1. **New Project** → name `transitops`  
2. Open **Connection details**  
3. Copy **two** strings if available:

| Env var | Which Neon string |
|---------|-------------------|
| `DATABASE_URL` | **Pooled** connection (host often has `-pooler`) |
| `DIRECT_URL` | **Direct** connection (no pooler) |

Both must start with `postgresql://` and include `?sslmode=require`.

If you only have one URI, use it for **both** `DATABASE_URL` and `DIRECT_URL`.

---

## 4. Env files (do not commit secrets)

### `apps/api/.env`

```env
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"

JWT_SECRET="team-shared-dev-secret-change-in-production"
PORT=4000
CORS_ORIGIN="http://localhost:5173"
```

### `apps/web/.env`

```env
VITE_API_URL=http://localhost:4000
```

Templates: `apps/api/.env.example`, `apps/web/.env.example`, root `.env.example`.

---

## 5. Install + create tables + seed

```bash
pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed
```

- `db:push` — creates tables on Neon from `schema.prisma`  
- `db:seed` — demo users, 4 vehicles, 4 drivers  

Optional first migration history:

```bash
pnpm db:migrate
# name: init
```

---

## 6. Run

```bash
pnpm dev
```

- Web: http://localhost:5173  
- API: http://localhost:4000/api/health  

Login: `dispatch@demo.com` / `password123`

---

## 7. Daily workflow

```bash
git pull
pnpm install
pnpm dev
```

If schema changed:

```bash
pnpm db:push
# or pnpm db:migrate
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `DATABASE_URL` error | Paste real Neon URI; quotes OK; `sslmode=require` |
| P1001 can't reach DB | Check Neon project active; network; password special chars URL-encoded |
| Login fails | Run `pnpm db:seed` again |
| CORS error | `CORS_ORIGIN=http://localhost:5173` and restart API |
| Frontend no API | `VITE_API_URL=http://localhost:4000` and restart web |

---

## Team roles (optional split)

| Person | Focus |
|--------|--------|
| P1 | Neon, env, deploy, schema |
| P2 | Vehicles / Drivers |
| P3 | Trips / Maintenance rules |
| P4 | Fuel, expenses, dashboard |
