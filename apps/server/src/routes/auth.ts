import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { Hono } from 'hono'
import { isAuth } from 'src/features/auth/auth.middleware'
import { SafeUserSchema, SessionPayloadSchema } from 'src/features/auth/auth.dto'
import { type } from 'arktype'
import { env } from 'src/shared/env'
import { errorResponses } from 'src/shared/response-schemas'
import { errorToHttpStatus } from 'src/shared/errors'
import { authService } from 'src/container'
import { provide } from 'src/shared/provide'

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV !== 'DEV',
  sameSite: 'Lax' as const,
  path: '/',
}

const authRoute = new Hono()
  .basePath('/auth')
  .use(provide('auth', authService))
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

      const result = await ctx.get('auth').initAdmin(username, email, password)

      return result.match(
        (user) => ctx.json(user, 201),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
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
          content: { 'application/json': { schema: resolver(SessionPayloadSchema) } },
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
      const COOKIE_SECRET = env.COOKIE_SECRET

      const result = await ctx
        .get('auth')
        .registerUser(username, email, password)
        .andThen((credentials) =>
          ctx
            .get('sessionService')
            .create(credentials.id, credentials.username, credentials.role)
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
          content: { 'application/json': { schema: resolver(SessionPayloadSchema) } },
        },
        ...errorResponses,
      },
    }),
    async (ctx, next) => {
      const COOKIE_SECRET = env.COOKIE_SECRET
      const sessionId = await getSignedCookie(ctx, COOKIE_SECRET, 'session_id')

      if (!sessionId) {
        await next()
        return
      }

      const result = await ctx.get('sessionService').validate(sessionId)

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
      const COOKIE_SECRET = env.COOKIE_SECRET

      const result = await ctx
        .get('auth')
        .loginUser(credential, password)
        .andThen((credentials) =>
          ctx
            .get('sessionService')
            .create(credentials.id, credentials.username, credentials.role)
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
      const COOKIE_SECRET = env.COOKIE_SECRET
      const sessionId = await getSignedCookie(ctx, COOKIE_SECRET, 'session_id')

      if (sessionId) {
        await ctx.get('sessionService').delete(sessionId)
      }

      deleteCookie(ctx, 'session_id')
      return ctx.text('Logged out', 200)
    }
  )

export default authRoute
