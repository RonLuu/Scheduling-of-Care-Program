# Care Scheduler — Demo

A demo repo showing **React (Vite) → Express** with a swappable DB layer.

## What’s inside

- `server/` — Express API, DB-agnostic repository pattern with two drivers:
  - `sqlite` (dev) using better-sqlite3, auto-creates schema and seeds a little data
  - `postgres` (prod) using node-postgres
- `client/` — Vite React app with a simple **My Tasks** UI calling the API

## Quick start

### 1) API (SQLite dev)

```bash
cd server
npm i
npm run build
npm run dev   # starts http://localhost:3000
```

Open: http://localhost:3000/api/my-tasks

### 2) Web (React)

```bash
cd ../client
npm i
npm run dev   # opens http://localhost:5173 with /api proxy to 3000
```

## NOTE

2 existing accounts for testing purpose:

1. alex@gmail.com 123456789 (staff)
2. chris@gmail.com 123456789 (admin)
