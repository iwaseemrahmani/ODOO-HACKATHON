# TransitOps

**Fleet & Transport Operations ERP** — hackathon-ready monorepo.

Manage vehicles, drivers, trips, maintenance, fuel, and expenses with **backend-enforced business rules** and **role-based access**.

| Layer | Stack |
|-------|--------|
| Monorepo | pnpm workspaces |
| Web | React + Vite + TypeScript + Tailwind (`apps/web`) |
| API | Node + Express + TypeScript (`apps/api`) |
| DB | **Neon PostgreSQL** via Prisma |
| Auth | JWT + bcrypt + RBAC |
| Deploy | Vercel (web) + Render (api) + Neon (db) |

---

## Quick start

1. **Create a Neon project** → copy connection strings (see [SETUP.md](./SETUP.md)).
2. Put them in `apps/api/.env`:

```env
DATABASE_URL="postgresql://...?sslmode=require"
DIRECT_URL="postgresql://...?sslmode=require"
JWT_SECRET="your-secret"
PORT=4000
CORS_ORIGIN="http://localhost:5173"
```

3. Run:

```bash
cd C:\Users\user\Documents\GitHub\ODOO-HACKATHON
pnpm install
pnpm db:push
pnpm db:seed
pnpm dev
```

| App | URL |
|-----|-----|
| Web | http://localhost:5173 |
| API | http://localhost:4000 |
| Health | http://localhost:4000/api/health |

### Demo logins (password: `password123`)

| Email | Role |
|-------|------|
| fleet@demo.com | FLEET_MANAGER |
| dispatch@demo.com | DISPATCHER |
| safety@demo.com | SAFETY_OFFICER |
| finance@demo.com | FINANCIAL_ANALYST |

---

## Features

- JWT login + protected routes  
- Vehicles / Drivers CRUD  
- Trips: Draft → Dispatch → Complete / Cancel  
- Maintenance open/close (InShop / Available)  
- Fuel logs & expenses  
- Dashboard KPIs  
- RBAC on API + role-aware sidebar  

### Business rules (server)

- Unique vehicle registration  
- No dispatch if vehicle Retired / InShop / OnTrip  
- No driver if license expired or Suspended / OnTrip  
- Cargo ≤ maxLoad  
- Dispatch → OnTrip; Complete/Cancel → Available  
- Open maintenance → InShop; Close → Available  

---

## Docs

| File | Purpose |
|------|---------|
| [SETUP.md](./SETUP.md) | Local env for the whole team |
| [DEPLOY.md](./DEPLOY.md) | Neon + Render + Vercel |

---

## Repo layout

```text
apps/api   → Express + Prisma
apps/web   → React SPA
```

---

## License

MIT (hackathon use)
