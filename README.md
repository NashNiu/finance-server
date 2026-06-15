# Finance Server

Backend API for a 小青账-style bookkeeping H5 app.

Built with **NestJS** + **Prisma 7** + **MySQL**, providing JWT-authenticated REST endpoints for managing income/expense records, categories, and monthly statistics.

---

## Prerequisites

- Node.js 18+
- A running MySQL server (5.7+ or 8.x)

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Required variables in `.env`:

| Variable       | Example                                        | Description                        |
|----------------|------------------------------------------------|------------------------------------|
| `DATABASE_URL` | `mysql://root:password@localhost:3306/finance` | MySQL connection string             |
| `JWT_SECRET`   | `your-secret-key`                              | Secret used to sign JWT tokens      |
| `JWT_EXPIRES`  | `7d`                                           | Token expiry (e.g. `7d`, `24h`)    |
| `PORT`         | `3000`                                         | Port the server listens on          |

> **Note:** This project uses Prisma 7 with the `@prisma/adapter-mariadb` driver adapter. The MariaDB driver is wire-compatible with MySQL, so no MySQL-specific driver is needed.

### 3. Run database migrations

Creates the `finance` database (if it does not exist) and all tables:

```bash
npm run prisma:migrate
```

### 4. Seed default categories

Inserts 10 built-in system categories (e.g. Food, Transport, Salary):

```bash
npm run prisma:seed
```

---

## Running the server

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run start
```

The API is served under the `/api` prefix on the configured `PORT`. CORS is enabled for all origins.

---

## Testing

```bash
npm run test:e2e
```

> **Note:** e2e tests run against the real database. The `finance` database must be migrated before running tests.

---

## Response format

All responses follow a uniform envelope:

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

- `code: 0` — success
- `code: <HTTP status>` — error (e.g. `401`, `404`, `409`); `data` will be `null`

---

## Authentication

1. Register or log in to receive a JWT token.
2. Include it in every subsequent request as a Bearer token:

```
Authorization: Bearer <token>
```

---

## API Endpoints

### Auth

| Method | Path               | Auth | Description                              |
|--------|--------------------|------|------------------------------------------|
| POST   | `/api/auth/register` | No  | Register a new user                      |
| POST   | `/api/auth/login`    | No  | Log in with existing credentials         |
| GET    | `/api/auth/me`       | Yes | Get the currently authenticated user     |

**POST `/api/auth/register`** and **POST `/api/auth/login`**

Request body:
```json
{ "username": "alice", "password": "secret" }
```

Response `data`:
```json
{ "token": "<jwt>", "user": { "id": 1, "username": "alice" } }
```

**GET `/api/auth/me`**

Response `data`:
```json
{ "id": 1, "username": "alice" }
```

---

### Categories

| Method | Path                    | Auth | Description                                              |
|--------|-------------------------|------|----------------------------------------------------------|
| GET    | `/api/categories`       | Yes  | List all categories (system-wide + user's custom ones)   |
| POST   | `/api/categories`       | Yes  | Create a custom category                                 |
| DELETE | `/api/categories/:id`   | Yes  | Delete a custom category (must be owned by the user)     |

**POST `/api/categories`** request body:
```json
{ "name": "Coffee", "icon": "☕", "type": "EXPENSE" }
```
`type` must be `"EXPENSE"` or `"INCOME"`.

**DELETE `/api/categories/:id`** returns `409 Conflict` if the category is referenced by existing records.

---

### Records

| Method | Path                | Auth | Description                          |
|--------|---------------------|------|--------------------------------------|
| GET    | `/api/records`      | Yes  | List records with optional filters   |
| POST   | `/api/records`      | Yes  | Create a new record                  |
| PATCH  | `/api/records/:id`  | Yes  | Partially update a record            |
| DELETE | `/api/records/:id`  | Yes  | Delete a record                      |

**GET `/api/records`** query parameters:

| Param        | Example      | Description                       |
|--------------|--------------|-----------------------------------|
| `month`      | `2025-06`    | Filter by month (YYYY-MM)         |
| `type`       | `EXPENSE`    | Filter by type                    |
| `categoryId` | `3`          | Filter by category ID             |
| `page`       | `1`          | Page number (default: 1)          |
| `pageSize`   | `20`         | Items per page (default: 20)      |

Response `data`:
```json
{ "items": [...], "total": 42, "page": 1, "pageSize": 20 }
```

**POST `/api/records`** request body:
```json
{
  "categoryId": 3,
  "type": "EXPENSE",
  "amount": 12.50,
  "note": "lunch",
  "recordDate": "2025-06-01"
}
```
`note` is optional. `recordDate` format: `YYYY-MM-DD`.

**PATCH `/api/records/:id`** accepts any subset of the POST body fields.

---

### Stats

| Method | Path                       | Auth | Description                                  |
|--------|----------------------------|------|----------------------------------------------|
| GET    | `/api/stats/summary`       | Yes  | Monthly income/expense/balance totals        |
| GET    | `/api/stats/by-category`   | Yes  | Breakdown by category for a month            |
| GET    | `/api/stats/trend`         | Yes  | 12-month income/expense trend for a year     |

**GET `/api/stats/summary?month=YYYY-MM`**

Response `data`:
```json
{ "income": 5000.00, "expense": 1200.50, "balance": 3799.50 }
```

**GET `/api/stats/by-category?month=YYYY-MM&type=EXPENSE`**

Response `data` (array):
```json
[{ "categoryId": 3, "name": "Food", "amount": 480.00 }]
```

**GET `/api/stats/trend?year=YYYY`**

Response `data` (12-element array, one entry per month):
```json
[{ "month": "2025-01", "income": 5000.00, "expense": 1200.50 }, ...]
```

---

## Project structure

```
src/
├── main.ts                  # Bootstrap: global prefix, interceptor, filter, CORS
├── app.module.ts            # Root module
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts    # PrismaClient with MariaDB adapter
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts   # /api/auth endpoints
│   ├── auth.service.ts
│   ├── jwt.strategy.ts
│   ├── jwt-auth.guard.ts
│   └── dto/
├── categories/
│   ├── categories.module.ts
│   ├── categories.controller.ts
│   ├── categories.service.ts
│   └── dto/
├── records/
│   ├── records.module.ts
│   ├── records.controller.ts
│   ├── records.service.ts
│   └── dto/
├── stats/
│   ├── stats.module.ts
│   ├── stats.controller.ts
│   └── stats.service.ts
└── common/
    ├── response.interceptor.ts   # Wraps all responses in {code,message,data}
    ├── http-exception.filter.ts  # Maps exceptions to {code,message,data:null}
    └── current-user.decorator.ts
```
