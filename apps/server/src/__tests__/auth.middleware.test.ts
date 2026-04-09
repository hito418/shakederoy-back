import { vi, describe, it, expect, beforeEach } from 'vitest'
import { Hono, type MiddlewareHandler } from 'hono'
import {
  mockSessionService,
  testUser,
  testAdmin,
  stubValidSession,
  stubNoSession,
} from './helpers'

vi.mock('src/shared/env', () => ({
  env: { COOKIE_SECRET: 'test-cookie-secret-that-is-long-enough' },
}))

const mockGetSignedCookie = vi.fn()
vi.mock('hono/cookie', () => ({
  getSignedCookie: (...args: unknown[]) => mockGetSignedCookie(...args),
}))

const { isAuth, optionalAuth } = await import(
  'src/features/auth/auth.middleware'
)

function createTestApp(
  middleware: MiddlewareHandler,
  sessionSvc: ReturnType<typeof mockSessionService>
) {
  return new Hono()
    .use((ctx, next) => {
      ctx.set('sessionService' as never, sessionSvc as never)
      return next()
    })
    .use(middleware)
    .get('/test', (ctx) => {
      const payload = ctx.get('userPayload' as never)
      return ctx.json({ payload })
    })
}

describe('isAuth middleware', () => {
  let sessionSvc: ReturnType<typeof mockSessionService>

  beforeEach(() => {
    vi.clearAllMocks()
    sessionSvc = mockSessionService()
  })

  it('returns 401 when no session cookie', async () => {
    mockGetSignedCookie.mockResolvedValue(undefined)
    const app = createTestApp(isAuth(), sessionSvc)

    const res = await app.request('/test')

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ message: 'Unauthorized' })
  })

  it('returns 401 when cookie signature is invalid', async () => {
    mockGetSignedCookie.mockResolvedValue(false)
    const app = createTestApp(isAuth(), sessionSvc)

    const res = await app.request('/test')

    expect(res.status).toBe(401)
  })

  it('returns 401 when session validation fails', async () => {
    mockGetSignedCookie.mockResolvedValue('invalid-session')
    stubNoSession(sessionSvc)
    const app = createTestApp(isAuth(), sessionSvc)

    const res = await app.request('/test')

    expect(res.status).toBe(401)
  })

  it('passes through for valid session without role restriction', async () => {
    mockGetSignedCookie.mockResolvedValue('valid-session')
    stubValidSession(sessionSvc, testUser)
    const app = createTestApp(isAuth(), sessionSvc)

    const res = await app.request('/test')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ payload: testUser })
  })

  it('passes through when user has the required role', async () => {
    mockGetSignedCookie.mockResolvedValue('valid-session')
    stubValidSession(sessionSvc, testAdmin)
    const app = createTestApp(isAuth('admin'), sessionSvc)

    const res = await app.request('/test')

    expect(res.status).toBe(200)
  })

  it('returns 401 when user lacks the required role', async () => {
    mockGetSignedCookie.mockResolvedValue('valid-session')
    stubValidSession(sessionSvc, testUser)
    const app = createTestApp(isAuth('admin'), sessionSvc)

    const res = await app.request('/test')

    expect(res.status).toBe(401)
  })

  it('accepts any of multiple allowed roles', async () => {
    mockGetSignedCookie.mockResolvedValue('valid-session')
    stubValidSession(sessionSvc, testAdmin)
    const app = createTestApp(isAuth('user', 'admin'), sessionSvc)

    const res = await app.request('/test')

    expect(res.status).toBe(200)
  })

  it('sets userPayload on context for downstream handlers', async () => {
    mockGetSignedCookie.mockResolvedValue('valid-session')
    stubValidSession(sessionSvc, testUser)
    const app = createTestApp(isAuth(), sessionSvc)

    const res = await app.request('/test')
    const body = await res.json()

    expect(body.payload).toEqual(testUser)
  })
})

describe('optionalAuth middleware', () => {
  let sessionSvc: ReturnType<typeof mockSessionService>

  beforeEach(() => {
    vi.clearAllMocks()
    sessionSvc = mockSessionService()
  })

  it('sets null payload when no cookie is present', async () => {
    mockGetSignedCookie.mockResolvedValue(undefined)
    const app = createTestApp(optionalAuth(), sessionSvc)

    const res = await app.request('/test')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ payload: null })
  })

  it('sets null payload when session validation fails', async () => {
    mockGetSignedCookie.mockResolvedValue('bad-session')
    stubNoSession(sessionSvc)
    const app = createTestApp(optionalAuth(), sessionSvc)

    const res = await app.request('/test')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ payload: null })
  })

  it('sets user payload when session is valid', async () => {
    mockGetSignedCookie.mockResolvedValue('valid-session')
    stubValidSession(sessionSvc, testUser)
    const app = createTestApp(optionalAuth(), sessionSvc)

    const res = await app.request('/test')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ payload: testUser })
  })

  it('does not block the request even with invalid cookie', async () => {
    mockGetSignedCookie.mockResolvedValue(false)
    const app = createTestApp(optionalAuth(), sessionSvc)

    const res = await app.request('/test')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ payload: null })
  })
})
