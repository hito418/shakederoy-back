import { vi, describe, it, expect, beforeEach } from 'vitest'
import { okAsync, errAsync } from 'neverthrow'
import { AppError } from 'src/shared/errors'

const sessionSvc = {
  create: vi.fn(),
  validate: vi.fn(),
  delete: vi.fn(),
  deleteAllForUser: vi.fn(),
  cleanupExpired: vi.fn(),
}

const authSvc = {
  initAdmin: vi.fn(),
  registerUser: vi.fn(),
  loginUser: vi.fn(),
}

vi.mock('src/shared/env', () => ({
  env: {
    PG_HOST: 'localhost',
    PG_PORT: 5432,
    PG_DB: 'test',
    PG_USER: 'test',
    PG_PASSWORD: 'test',
    COOKIE_SECRET: 'test-cookie-secret-that-is-long-enough',
    CORS_ORIGIN: 'http://localhost:3000',
    APP_PORT: 3000,
    PAGE_SIZE: 15,
    NODE_ENV: 'DEV',
  },
}))

vi.mock('src/shared/db', () => ({ db: {} }))

vi.mock('src/container', () => ({
  sessionService: sessionSvc,
  authService: authSvc,
  cocktailsService: {},
  stylesService: {},
  extrasService: {},
  glassesService: {},
  alcoholTypesService: {},
  ingredientsService: {},
  analyticsService: {},
  usersService: {},
  favoritesService: {},
  collectionsService: {},
  barsService: {},
  reviewsService: {},
  partiesService: {},
}))

const { app } = await import('src/app')

describe('GET /healthcheck', () => {
  it('returns 200 with status ok', async () => {
    const res = await app.request('/healthcheck')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
  })
})

describe('POST /auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 201 on successful registration', async () => {
    authSvc.registerUser.mockReturnValue(
      okAsync({ id: 'user-1', username: 'alice', role: 'user' })
    )
    sessionSvc.create.mockReturnValue(
      okAsync({
        sessionId: 'sess-123',
        payload: { sub: { id: 'user-1' }, username: 'alice', role: 'user' },
      })
    )

    const res = await app.request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'alice',
        email: 'alice@example.com',
        password: 'strongpassword1',
      }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toEqual({
      sub: { id: 'user-1' },
      username: 'alice',
      role: 'user',
    })
  })

  it('returns 500 when registration fails', async () => {
    authSvc.registerUser.mockReturnValue(
      errAsync(AppError.databaseError('Failed to register user'))
    )

    const res = await app.request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'alice',
        email: 'alice@example.com',
        password: 'strongpassword1',
      }),
    })

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toHaveProperty('message')
  })

  it('returns 409 when user already exists', async () => {
    authSvc.registerUser.mockReturnValue(
      errAsync(AppError.alreadyExists('User'))
    )

    const res = await app.request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'alice',
        email: 'alice@example.com',
        password: 'strongpassword1',
      }),
    })

    expect(res.status).toBe(409)
  })
})

describe('POST /auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 on successful login', async () => {
    authSvc.loginUser.mockReturnValue(
      okAsync({ id: 'user-1', username: 'alice', role: 'user' })
    )
    sessionSvc.create.mockReturnValue(
      okAsync({
        sessionId: 'sess-456',
        payload: { sub: { id: 'user-1' }, username: 'alice', role: 'user' },
      })
    )

    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: 'alice',
        password: 'strongpassword1',
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      sub: { id: 'user-1' },
      username: 'alice',
      role: 'user',
    })
  })

  it('returns 404 when user not found', async () => {
    authSvc.loginUser.mockReturnValue(
      errAsync(AppError.notFound('User'))
    )

    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: 'unknown',
        password: 'somepassword1',
      }),
    })

    expect(res.status).toBe(404)
  })

  it('returns 401 on wrong password', async () => {
    authSvc.loginUser.mockReturnValue(
      errAsync(AppError.invalidCredentials('Wrong password'))
    )

    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: 'alice',
        password: 'wrongpassword1',
      }),
    })

    expect(res.status).toBe(401)
  })
})

describe('POST /auth/init', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 201 when no admin exists', async () => {
    const now = new Date()
    authSvc.initAdmin.mockReturnValue(
      okAsync({
        id: 'admin-1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        profile_pic: null,
        is_bar_owner: false,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })
    )

    const res = await app.request('/auth/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        email: 'admin@example.com',
        password: 'adminpassword1',
      }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.username).toBe('admin')
    expect(body.role).toBe('admin')
  })

  it('returns 409 when admin already exists', async () => {
    authSvc.initAdmin.mockReturnValue(
      errAsync(AppError.alreadyExists('Admin initialization'))
    )

    const res = await app.request('/auth/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        email: 'admin@example.com',
        password: 'adminpassword1',
      }),
    })

    expect(res.status).toBe(409)
  })
})

describe('GET /auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without session cookie', async () => {
    const res = await app.request('/auth/logout')

    expect(res.status).toBe(401)
  })
})

describe('request validation', () => {
  it('rejects register with short username', async () => {
    const res = await app.request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'ab',
        email: 'ab@example.com',
        password: 'strongpassword1',
      }),
    })

    expect(res.status).toBe(400)
  })

  it('rejects register with invalid email', async () => {
    const res = await app.request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'alice',
        email: 'not-an-email',
        password: 'strongpassword1',
      }),
    })

    expect(res.status).toBe(400)
  })

  it('rejects register with short password', async () => {
    const res = await app.request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'alice',
        email: 'alice@example.com',
        password: '12345678',
      }),
    })

    expect(res.status).toBe(400)
  })
})
