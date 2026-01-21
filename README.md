# Shakederoy Backend

A cocktail recipe API built with Hono, Kysely, and PostgreSQL.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: [Hono](https://hono.dev/)
- **Database**: PostgreSQL 16
- **ORM**: [Kysely](https://kysely.dev/) + [Drizzle](https://orm.drizzle.team/) (for migrations)
- **Validation**: [Arktype](https://arktype.io/)
- **Auth**: JWT with signed cookies, Argon2 password hashing
- **Monorepo**: Turborepo + pnpm workspaces

## Project Structure

```
shakederoy-back/
├── apps/
│   └── server/           # Main API server
│       └── src/
│           ├── routes/   # API endpoints
│           ├── lib/      # Database, env, utilities
│           ├── middlewares/
│           └── scripts/  # Seed script
├── packages/
│   └── schemas/          # Database schemas (Drizzle)
└── toolings/             # Shared configs
```

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker (for PostgreSQL)

## Getting Started

### 1. Configure environment

Create `apps/server/.env`:

```env
PG_HOST=postgres
PG_PORT=5432
PG_DB=postgres
PG_USER=postgres
PG_PASSWORD=postgres
COOKIE_SECRET=your-cookie-secret
JWT_SECRET=your-jwt-secret
CORS_ORIGIN=http://localhost:3000
APP_PORT=3000
PAGE_SIZE=15
NODE_ENV=DEV
```

### 2. Build and install dependencies

```bash
docker compose -f dev.docker-compose.yaml build
docker compose -f dev.docker-compose.yaml run --rm app pnpm install
```

### 3. Start development environment

```bash
docker compose -f dev.docker-compose.yaml up
```

This starts:
- PostgreSQL database on port 5432
- API server on port 3000
- Drizzle Studio on port 4983

### 4. Run migrations

```bash
docker compose -f dev.docker-compose.yaml exec app pnpm -F @repo/schemas migration:run
```

### 5. Seed the database (optional)

```bash
docker compose -f dev.docker-compose.yaml exec app pnpm -F @repo/server seed
```

Default admin credentials:
- Email: `admin@shakederoy.com`
- Password: `AdminPassword123!`

## API Endpoints

### Auth

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/init` | Create first admin user | No |
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login with credentials | No |
| GET | `/auth/logout` | Logout | Yes |

### Users

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users` | List users (paginated) | No |
| GET | `/users/all` | List all users | No |
| GET | `/users/self` | Get current user | Yes |
| GET | `/users/:username` | Get user by username | No |
| POST | `/users/create` | Create user | Admin |
| PUT | `/users/update/self` | Update current user | Yes |
| PUT | `/users/update/:id` | Update user by ID | Admin |
| DELETE | `/users/delete/self` | Delete current user | Yes |
| DELETE | `/users/delete/:id` | Delete user by ID | Yes |

### Cocktails

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/cocktails` | List cocktails (paginated) | No |
| GET | `/cocktails/:id` | Get cocktail by ID | No |
| POST | `/cocktails/create` | Create cocktail | Yes |
| POST | `/cocktails/:id` | Update cocktail | Yes |
| DELETE | `/cocktails/:id` | Delete cocktail | Yes |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/healthcheck` | Server health status |

## Scripts

```bash
# Development
pnpm dev          # Start dev server with hot reload

# Build
pnpm build        # Build all packages

# Database
pnpm seed         # Seed database (from apps/server)

# Quality
pnpm lint         # Run linter
pnpm format       # Format code
pnpm typecheck    # Type checking
```

## Docker

Development with Docker:

```bash
docker compose -f dev.docker-compose.yaml up
```

Database only:

```bash
docker compose -f db.docker-compose.yaml up -d
```
