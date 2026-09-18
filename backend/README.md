# DevSalary Go Backend

Go REST API + Neon PostgreSQL for DevSalary.

## Setup

1. Copy `.env.example` to `.env`.
2. Put your Neon `DATABASE_URL` in `.env`.
3. Run `migrations/001_init.sql` in Neon SQL Editor.
4. From this `backend` folder, run `go mod tidy`.
5. Import the existing root JSON dataset:

```bash
go run ./cmd/seed
```

6. Start the API:

```bash
go run ./cmd/api
```

## Endpoints

- `GET /api/v1/health`
- `GET /api/v1/salaries`
- `GET /api/v1/salaries/stats`

Filters: `country`, `role`, `level`, `work_type`, `limit`, `offset`.

Default seed file is `../devsalary-data.json` when running from `backend/`.
