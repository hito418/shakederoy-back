import { sValidator } from '@hono/standard-validator'
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie'
import { verify as verifyJwt } from 'hono/jwt'
import { isAuth } from 'src/features/auth/middleware'
import { initAdmin, registerUser, loginUser, createToken } from 'src/features/auth/service'
import { env } from 'hono/adapter'
import { type } from 'arktype'
import { HonoVar } from 'src/shared/hono'

const authRoute = new HonoVar()
  .basePath('/auth')
  .post(
    '/init',
    sValidator(
      'json',
      type({
        email: 'string.email',
        password: 'string > 8',
      })
    ),
    async (ctx) => {
      const { email, password } = ctx.req.valid('json')
      const db = ctx.get('database')

      const result = await initAdmin(db, email, password)

      if ('error' in result) {
        if (result.error === 'already_initialized') {
          return ctx.json({ message: 'Initialization already done' }, 400)
        }
        return ctx.json({ message: 'Failed to register' }, 500)
      }

      return ctx.json(result.user, 201)
    }
  )
  .post(
    '/register',
    sValidator(
      'json',
      type({
        email: 'string.email',
        password: 'string > 8',
      })
    ),
    async (ctx) => {
      const { email, password } = ctx.req.valid('json')
      const db = ctx.get('database')

      const result = await registerUser(db, email, password)

      if ('error' in result) {
        return ctx.json({ message: 'Failed to register' }, 500)
      }

      const { COOKIE_SECRET, JWT_SECRET } = env(ctx)
      const token = await createToken(result.payload, JWT_SECRET)
      await setSignedCookie(ctx, 'access_token', token, COOKIE_SECRET)

      return ctx.json(result.payload, 201)
    }
  )
  .post(
    '/login',
    async (ctx, next) => {
      const { COOKIE_SECRET, JWT_SECRET } = env(ctx)
      const token = await getSignedCookie(ctx, COOKIE_SECRET, 'access_token')

      if (!token) {
        await next()
        return
      }

      const payload = await verifyJwt(token, JWT_SECRET)

      if (!payload) {
        await next()
        return
      }

      await setSignedCookie(ctx, 'access_token', token, COOKIE_SECRET)

      return ctx.json(payload, 200)
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

      const result = await loginUser(db, credential, password)

      if ('error' in result) {
        if (result.error === 'not_found') {
          return ctx.json({ message: 'User not found' }, 404)
        }
        return ctx.json({ message: 'Wrong password' }, 401)
      }

      const { COOKIE_SECRET, JWT_SECRET } = env(ctx)
      const token = await createToken(result.payload, JWT_SECRET)
      await setSignedCookie(ctx, 'access_token', token, COOKIE_SECRET)

      return ctx.json(result.payload, 200)
    }
  )
  .get('/logout', isAuth(), async (ctx) => {
    deleteCookie(ctx, 'access_token')
    return ctx.text('Logged out', 200)
  })

export default authRoute
