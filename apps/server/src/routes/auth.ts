import { type } from 'arktype'
import { Hono } from 'hono'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { env } from 'hono/adapter'
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie'
import {
  SafeUserSchema,
  SessionPayloadSchema,
} from 'src/features/auth/auth.dto'
import { isAuth } from 'src/features/auth/auth.middleware'
import {
  initAdmin,
  loginUser,
  registerUser,
} from 'src/features/auth/auth.service'
import {
  createSession,
  deleteSession,
  validateSession,
} from 'src/features/auth/session.service'
import { errorToHttpStatus } from 'src/shared/errors'
import { errorResponses } from 'src/shared/response-schemas'

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV !== 'DEV',
  sameSite: 'Lax' as const,
  path: '/',
}

const authRoute = new Hono()
  .basePath('/auth')
  .post(
    '/init',
    describeRoute({
      tags: ['Auth'],
      summary: 'Initialize admin account',
      responses: {
        201: {
          description: 'Admin account created',
          content: { 'application/json': { schema: resolver(SafeUserSchema) } },
        },
        ...errorResponses,
      },
    }),
    validator(
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
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .post(
    '/register',
    describeRoute({
      tags: ['Auth'],
      summary: 'Register',
      responses: {
        201: {
          description: 'User registered and session created',
          content: {
            'application/json': { schema: resolver(SessionPayloadSchema) },
          },
        },
        ...errorResponses,
      },
    }),
    validator(
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

      const result = await registerUser(db, username, email, password).andThen(
        (credentials) =>
          createSession(
            db,
            credentials.id,
            credentials.username,
            credentials.role
          )
      )

      if (result.isErr()) {
        return ctx.json(
          { message: result.error.message },
          errorToHttpStatus(result.error)
        )
      }

      const { sessionId, payload } = result.value
      await setSignedCookie(
        ctx,
        'session_id',
        sessionId,
        COOKIE_SECRET,
        SESSION_COOKIE_OPTIONS
      )

      return ctx.json(payload, 201)
    }
  )
  .post(
    '/login',
    describeRoute({
      tags: ['Auth'],
      summary: 'Login',
      responses: {
        200: {
          description: 'Logged in and session created',
          content: {
            'application/json': { schema: resolver(SessionPayloadSchema) },
          },
        },
        ...errorResponses,
      },
    }),
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
    validator(
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

      const result = await loginUser(db, credential, password).andThen(
        (credentials) =>
          createSession(
            db,
            credentials.id,
            credentials.username,
            credentials.role
          )
      )

      if (result.isErr()) {
        return ctx.json(
          { message: result.error.message },
          errorToHttpStatus(result.error)
        )
      }

      const { sessionId, payload } = result.value
      await setSignedCookie(
        ctx,
        'session_id',
        sessionId,
        COOKIE_SECRET,
        SESSION_COOKIE_OPTIONS
      )

      return ctx.json(payload, 200)
    }
  )
  .get(
    '/logout',
    describeRoute({
      tags: ['Auth'],
      summary: 'Logout',
      responses: {
        200: { description: 'Logged out' },
        ...errorResponses,
      },
    }),
    isAuth(),
    async (ctx) => {
      const { COOKIE_SECRET } = env(ctx)
      const sessionId = await getSignedCookie(ctx, COOKIE_SECRET, 'session_id')

      if (sessionId) {
        const db = ctx.get('database')
        await deleteSession(db, sessionId)
      }

      deleteCookie(ctx, 'session_id')
      return ctx.text('Logged out', 200)
    }
  )

export default authRoute
