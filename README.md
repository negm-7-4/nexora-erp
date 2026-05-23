# Nexora ERP

A complete, multi-tenant **business management platform (ERP + SaaS)** for small and
medium businesses. Sales, purchases, inventory, manufacturing, HR, CRM, logistics,
treasury, finance reporting, and an AI copilot — all in one app, with offline-first
local storage and optional cloud sync via **MongoDB** or **Firebase**.

The app is **English-first** and ships with an optional Arabic mode (RTL).

---

## Features

- **Operations** — Sales, Purchases, Clients, Suppliers, Workers, Inventory, Expenses.
- **Manufacturing** — Bills of materials and production orders.
- **People & growth** — HR, CRM leads, Logistics/vehicles, Treasury.
- **Finance center** — P&L, balance sheet, aging reports, Excel export, printable invoices.
- **AI Copilot** — natural-language actions ("log a 500 maintenance expense").
- **Multi-tenant SaaS** — every company is fully isolated; only the super admin
  sees all companies. Each company admin manages only their own users & permissions.
- **Billing** — three plans (Free / Pro / Enterprise) priced in EGP, with
  **Vodafone Cash** and **InstaPay** payments (gateway-ready for Paymob/Kashier).
- **Mobile** — Android build via Capacitor (see [MOBILE.md](MOBILE.md)).

---

## Architecture

```text
┌────────────────────┐      VITE_API_URL       ┌──────────────────────┐
│  React + Vite app   │ ───────────────────────▶ │  Node/Express API     │
│  (frontend, /src)   │   JWT auth + REST sync   │  (/server)            │
└────────────────────┘                          └──────────┬───────────┘
        │ falls back to                                     │ Mongoose
        ▼                                                   ▼
  Firebase / IndexedDB / localStorage              ┌──────────────────┐
  (offline-first)                                  │     MongoDB       │
                                                   └──────────────────┘
```

Data is stored as **one document per tenant**, synced by a `lastModified`
last-write-wins rule. When `VITE_API_URL` is set and the user holds a JWT, the
app syncs through MongoDB; otherwise it transparently falls back to Firebase or
local storage, so the app always runs.

---

## Quick start

### 1. Backend (MongoDB API)

```bash
cd server
cp .env.example .env        # fill in MONGODB_URI (Atlas or local) + JWT_SECRET
npm install
npm start                   # → http://localhost:4000
```

Health check: `GET http://localhost:4000/api/health`

### 2. Frontend

```bash
cp .env.example .env        # set VITE_API_URL=http://localhost:4000/api
npm install
npm run dev                 # → http://localhost:5173
```

### Or run the whole stack with Docker

```bash
docker compose up --build   # MongoDB + API; then run the frontend with npm run dev
```

---

## Configuration

### Frontend (`.env`)

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | MongoDB backend base URL incl. `/api`. When unset, falls back to Firebase/local. |
| `VITE_FIREBASE_*` | Optional Firebase config (alternative cloud backend). |
| `VITE_ANTHROPIC_API_KEY` | Optional — enables the online AI copilot. |

### Backend (`server/.env`)

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB Atlas or local connection string. **Required.** |
| `JWT_SECRET` | Secret for signing auth tokens. Use a long random value. |
| `PORT` | API port (default 4000). |
| `CORS_ORIGIN` | Allowed frontend origins (comma-separated, or `*`). |
| `SUPER_ADMIN_EMAIL` | Email that becomes the platform super admin on registration. |
| `VODAFONE_CASH_NUMBER` / `INSTAPAY_HANDLE` | Default receiving accounts (also editable in-app by the super admin). |
| `PAYMOB_API_KEY` / `KASHIER_API_KEY` | Optional — enable an automated card/wallet gateway. |

---

## SaaS & roles

- **Super admin** (`SUPER_ADMIN_EMAIL`): the only role that can see **all** companies,
  enter any company's workspace, manage plans/status, configure the **receiving
  payment accounts**, and approve/reject payments.
- **Company admin / owner**: sees only their own company's data and manages only
  their own users and permissions.
- **Company user**: scoped, permission-gated access within their company.

### Billing flow (Vodafone Cash / InstaPay)

1. The super admin sets the receiving Vodafone Cash number / InstaPay handle
   (`PUT /api/admin/payment-settings`) — so money always lands in the right wallet.
2. A customer picks a plan and transfers manually, then submits the transaction
   reference (`POST /api/billing/submit`).
3. The super admin verifies it (`POST /api/admin/payments/:id/decision`), which
   upgrades the company's plan automatically.

A real gateway (Paymob/Kashier, which expose Vodafone Cash & InstaPay via API) can
be plugged in later with `PAYMOB_API_KEY` / `KASHIER_API_KEY`.

---

## API reference

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | — | Service + DB status |
| `POST` | `/api/register` | — | Create account + company workspace |
| `POST` | `/api/login` | — | Authenticate, returns JWT + tenantId |
| `GET` | `/api/data` | user | Load the tenant's dataset |
| `PUT` | `/api/data` | user | Save the tenant's dataset (last-write-wins) |
| `GET` | `/api/billing/plans` | — | Plans + receiving payment accounts |
| `GET` | `/api/billing/me` | user | Current plan + payment history |
| `POST` | `/api/billing/submit` | user | Submit a manual payment for verification |
| `GET` | `/api/admin/tenants` | super | List all companies |
| `PATCH` | `/api/admin/tenants/:id` | super | Update plan/status/name |
| `DELETE` | `/api/admin/tenants/:id` | super | Delete a company and its data |
| `GET`/`PUT` | `/api/admin/payment-settings` | super | Read/update receiving accounts |
| `GET` | `/api/admin/payments` | super | List payment submissions |
| `POST` | `/api/admin/payments/:id/decision` | super | Approve/reject a payment |

---

## Testing the backend

```bash
cd server
npm install
node test/api.test.js   # spins up an in-memory MongoDB and runs the full flow
```

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the frontend dev server |
| `npm run build` | Production build |
| `npm run lint` | Lint the frontend |
| `npm run android:sync` | Build + sync the Android (Capacitor) project |

---

## License

Proprietary — © Nexora.
