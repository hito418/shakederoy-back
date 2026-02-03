import { sValidator } from '@hono/standard-validator'
import { type } from 'arktype'
import { env } from 'hono/adapter'
import { setSignedCookie } from 'hono/cookie'
import { sign } from 'hono/jwt'
import { HonoVar } from 'src/shared/hono'
import { isAuth } from 'src/features/auth/middleware'
import { Payload } from 'src/shared/types/payload'
import { Errors, errorToHttpStatus } from 'src/shared/errors'
import { fromPromise } from 'src/shared/db-helpers'
import {
  listUsers,
  listAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from 'src/features/users/service'

const usersRoute = new HonoVar().basePath('/users')

usersRoute.get(
  '/',
  sValidator('query', type({ page: 'string.numeric.parse?' })),
  async (ctx) => {
    const db = ctx.get('database')
    const { page = 1 } = ctx.req.valid('query')
    const pageSize = Number(env(ctx).PAGE_SIZE)

    const result = await listUsers(db, page, pageSize)

    return result.match(
      (userList) => ctx.json(userList, 200),
      (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
    )
  }
)

usersRoute.get('/all', async (ctx) => {
  const db = ctx.get('database')

  const result = await listAllUsers(db)

  return result.match(
    (userList) => ctx.json(userList, 200),
    (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
  )
})

usersRoute.get('/self', isAuth(), async (ctx) => {
  const payload = ctx.get('userPayload')
  const db = ctx.get('database')

  const result = await getUserById(db, payload.sub.id)

  return result.match(
    (user) => ctx.json(user, 200),
    (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
  )
})

usersRoute.get(
  '/:id',
  sValidator(
    'param',
    type({
      id: 'string',
    })
  ),
  async (ctx) => {
    const db = ctx.get('database')
    const { id } = ctx.req.valid('param')

    const result = await getUserById(db, id)

    return result.match(
      (user) => ctx.json(user, 200),
      (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
    )
  }
)

usersRoute.post(
  '/create',
  isAuth('admin'),
  sValidator(
    'json',
    type({
      email: 'string.email',
      password: 'string > 7',
      role: '"admin" | "user"',
    })
  ),
  async (ctx) => {
    const db = ctx.get('database')
    const { email, password, role } = ctx.req.valid('json')

    const result = await createUser(db, email, password, role)

    return result.match(
      (user) => ctx.json(user, 201),
      (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
    )
  }
)

usersRoute.put(
  '/update/self',
  isAuth(),
  sValidator(
    'form',
    type({
      email: 'string.email?',
      password: 'string > 7?',
      phoneNumber: 'string | null?',
      city: 'string | null?',
      region: 'string | null?',
      zipCode: 'string | null?',
    })
  ),
  async (ctx) => {
    const payload = ctx.get('userPayload')
    const db = ctx.get('database')
    const { ...updateDatas } = ctx.req.valid('form')
    const { COOKIE_SECRET, JWT_SECRET } = env(ctx)

    const result = await updateUser(db, payload.sub.id, updateDatas).andThen((user) => {
      const newPayload: Payload = {
        sub: { id: user.id },
        role: user.role,
      }
      return fromPromise(
        sign(newPayload, JWT_SECRET),
        () => Errors.internalError('Failed to create token')
      ).map((token) => ({ user, token }))
    })

    if (result.isErr()) {
      return ctx.json({ message: result.error.message }, errorToHttpStatus(result.error))
    }

    const { user, token } = result.value
    await setSignedCookie(ctx, 'access_token', token, COOKIE_SECRET)

    return ctx.json(user, 200)
  }
)

usersRoute.put(
  '/update/:id',
  isAuth('admin'),
  sValidator(
    'param',
    type({
      id: 'string',
    })
  ),
  sValidator(
    'form',
    type({
      email: 'string.email?',
      password: 'string > 7?',
      phoneNumber: 'string | null?',
      city: 'string | null?',
      region: 'string | null?',
      zipCode: 'string | null?',
      role: '"admin" | "user"?',
    })
  ),
  async (ctx) => {
    const db = ctx.get('database')
    const { id } = ctx.req.valid('param')
    const { ...updateDatas } = ctx.req.valid('form')
    const { id: userId } = ctx.get('userPayload').sub
    const { COOKIE_SECRET, JWT_SECRET } = env(ctx)

    const result = await updateUser(db, id, updateDatas)

    if (result.isErr()) {
      return ctx.json({ message: result.error.message }, errorToHttpStatus(result.error))
    }

    const user = result.value

    if (id === userId) {
      const newPayload: Payload = {
        sub: { id: user.id },
        role: user.role,
      }

      const token = await sign(newPayload, JWT_SECRET)
      await setSignedCookie(ctx, 'access_token', token, COOKIE_SECRET)
    }

    return ctx.json(user, 200)
  }
)

usersRoute.delete(
  '/delete/:id',
  sValidator('param', type({ id: 'string' })),
  isAuth(),
  async (ctx) => {
    const db = ctx.get('database')
    const { id } = ctx.req.valid('param')

    const result = await deleteUser(db, id)

    return result.match(
      (user) => ctx.json(user, 200),
      (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
    )
  }
)

usersRoute.delete('/delete/self', isAuth(), async (ctx) => {
  const payload = ctx.get('userPayload')
  const db = ctx.get('database')

  const result = await deleteUser(db, payload.sub.id)

  return result.match(
    (user) => ctx.json(user, 200),
    (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
  )
})

export default usersRoute
