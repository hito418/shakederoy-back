import { sValidator } from '@hono/standard-validator'
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie'
import { Payload } from '../types/payload'
import { sign, verify as verifyJwt } from 'hono/jwt'
import { isAuth } from 'src/middlewares/isAuth'
import { env } from 'hono/adapter'
import { type } from 'arktype'
import { HonoVar } from 'src/lib/hono'
import { hash, verify } from '@node-rs/argon2'

const authRoute = new HonoVar()
  .basePath('/auth')
  .post(
    '/init',
    sValidator(
      'json',
      type({
        username: 'string > 3',
        email: 'string.email',
        password: 'string > 8',
      })
    ),
    async (ctx) => {
      const { username, email, password } = ctx.req.valid('json')
      const db = ctx.get('database')

      const userList = await db
        .selectFrom('users')
        .select('id')
        .limit(1)
        .execute()

      if (userList.length > 0) {
        return ctx.json({ message: 'Initialization already done' }, 400)
      }

      const hashedPassword = await hash(password)

      const user = await db
        .insertInto('users')
        .values({
          username,
          email,
          password: hashedPassword,
          role: 'admin',
        })
        .returningAll()
        .executeTakeFirst()

      if (user) {
        const { password: _, ...safeUser } = user

        return ctx.json(safeUser, 201)
      }

      return ctx.json({ message: 'Failed to register' }, 500)
    }
  )
  .post(
    '/register',
    sValidator(
      'json',
      type({
        username: 'string > 3',
        email: 'string.email',
        password: 'string > 8',
      })
    ),
    async (ctx) => {
      const { username, email, password } = ctx.req.valid('json')
      const db = ctx.get('database')

      const hashedPassword = await hash(password)

      const user = await db
        .insertInto('users')
        .values({
          username,
          email,
          password: hashedPassword,
        })
        .returningAll()
        .executeTakeFirst()

      if (user) {
        const { password: _, ...safeUser } = user

        const payload: Payload = {
          sub: {
            id: safeUser.id,
            username: safeUser.username,
          },
          role: user.role,
        }

        const { COOKIE_SECRET, JWT_SECRET } = env(ctx)

        const token = await sign(payload, JWT_SECRET)

        await setSignedCookie(ctx, 'access_token', token, COOKIE_SECRET)

        return ctx.json(payload, 201)
      }

      return ctx.json({ message: 'Failed to register' }, 500)
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

      const user = await db
        .selectFrom('users')
        .selectAll()
        .where((eb) =>
          eb.or([eb('username', '=', credential), eb('email', '=', credential)])
        )
        .executeTakeFirst()

      if (!user) {
        return ctx.json({ message: 'User not found' }, 404)
      }

      const isMatch = await verify(user.password, password)

      if (isMatch) {
        const payload: Payload = {
          sub: {
            id: user.id,
            username: user.username,
          },
          role: user.role,
        }

        const { COOKIE_SECRET, JWT_SECRET } = env(ctx)

        const token = await sign(payload, JWT_SECRET)

        await setSignedCookie(ctx, 'access_token', token, COOKIE_SECRET)

        return ctx.json(payload, 200)
      }

      return ctx.json({ message: 'Wrong password' }, 401)
    }
  )
  .get('/logout', isAuth(), async (ctx) => {
    deleteCookie(ctx, 'access_token')
    return ctx.text('Logged out', 200)
  })

export default authRoute
