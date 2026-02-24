import { sValidator } from '@hono/standard-validator'
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie'
import { isAuth } from 'src/features/auth/middleware'
import { initAdmin, registerUser, loginUser } from 'src/features/auth/service'
import { createSession, validateSession, deleteSession } from 'src/features/auth/session-service'
import { env } from 'hono/adapter'
import { type } from 'arktype'
import { HonoVar } from 'src/shared/hono'
import { errorToHttpStatus } from 'src/shared/errors'

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'PROD',
  sameSite: 'Lax' as const,
  path: '/',
}

const authRoute = new HonoVar()
  .basePath('/auth')

const logoutHandler = async (ctx: any) => {
  const { COOKIE_SECRET } = env(ctx)
  const sessionId = await getSignedCookie(ctx, COOKIE_SECRET, 'session_id')

  if (sessionId) {
    const db = ctx.get('database')
    await deleteSession(db, sessionId)
  }

  deleteCookie(ctx, 'session_id')
  return ctx.text('Logged out', 200)
}

authRoute
  .post(
    '/init',
    sValidator(
      'json',
      type({
        username: 'string >= 3',
        email: 'string.email',
        password: 'string > 8',
      })
    ),
    async (ctx) => {
      const { username, email, password } = ctx.req.valid('json')
      const db = ctx.get('database')

      const result = await initAdmin(db, username, email, password)

      return result.match(
        (user) => ctx.json(user, 201),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .post(
    '/register',
    sValidator(
      'json',
      type({
        username: 'string >= 3',
        email: 'string.email',
        password: 'string > 8',
      })
    ),
    async (ctx) => {
      const { username, email, password } = ctx.req.valid('json')
      const db = ctx.get('database')
      const { COOKIE_SECRET } = env(ctx)

      const result = await registerUser(db, username, email, password)
        .andThen((credentials) =>
          createSession(db, credentials.id, credentials.username, credentials.role)
        )

      if (result.isErr()) {
        return ctx.json({ message: result.error.message }, errorToHttpStatus(result.error))
      }

      const { sessionId, payload } = result.value
      await setSignedCookie(ctx, 'session_id', sessionId, COOKIE_SECRET, SESSION_COOKIE_OPTIONS)

      return ctx.json(payload, 201)
    }
  )
  .post(
    '/login',
    async (ctx, next) => {
      const { COOKIE_SECRET } = env(ctx)
      const db = ctx.get('database')
      const sessionId = await getSignedCookie(ctx, COOKIE_SECRET, 'session_id')

      if (!sessionId) {
        await next()
        return
      }

      const result = await validateSession(db, sessionId)

      if (result.isErr()) {
        await next()
        return
      }

      return ctx.json(result.value, 200)
    },
    sValidator(
      'json',
      type({
        credential: 'string',
        password: 'string',
      })
    ),
    async (ctx) => {
      const { credential, password } = ctx.req.valid('json')
      const db = ctx.get('database')
      const { COOKIE_SECRET } = env(ctx)

      const result = await loginUser(db, credential, password)
        .andThen((credentials) =>
          createSession(db, credentials.id, credentials.username, credentials.role)
        )

      if (result.isErr()) {
        return ctx.json({ message: result.error.message }, errorToHttpStatus(result.error))
      }

      const { sessionId, payload } = result.value
      await setSignedCookie(ctx, 'session_id', sessionId, COOKIE_SECRET, SESSION_COOKIE_OPTIONS)

      return ctx.json(payload, 200)
    }
  )
  .get('/logout', isAuth(), logoutHandler)
  .post('/logout', isAuth(), logoutHandler)

export default authRoute
