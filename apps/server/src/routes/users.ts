import { sValidator } from '@hono/standard-validator'
import { userRolesEnum } from '@repo/schemas/users'
import { type } from 'arktype'
import { env } from 'hono/adapter'
import { setSignedCookie } from 'hono/cookie'
import { sign } from 'hono/jwt'
import { HonoVar } from 'src/lib/hono'
import { isAuth } from 'src/middlewares/isAuth'
import { Payload } from 'src/types/payload'

const usersRoute = new HonoVar().basePath('/users')

usersRoute.get(
  '/',
  sValidator('query', type({ page: 'string.numeric.parse?' })),
  async (ctx) => {
    const db = ctx.get('database')
    const { page = 1 } = ctx.req.valid('query')

    const pageSize = Number(env(ctx).PAGE_SIZE)

    const userList = await db
      .selectFrom('users')
      .select([
        'id',
        'username',
        'email',
        'role',
        'profile_pic',
        'created_at',
        'updated_at',
      ])
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .orderBy('updated_at', 'desc')
      .execute()

    return ctx.json(userList, 200)
  }
)

usersRoute.get('/all', async (ctx) => {
  const db = ctx.get('database')

  const userList = await db
    .selectFrom('users')
    .select([
      'id',
      'username',
      'email',
      'role',
      'profile_pic',
      'created_at',
      'updated_at',
    ])
    .orderBy('updated_at', 'desc')
    .execute()

  return ctx.json(userList, 200)
})

usersRoute.get('/self', isAuth(), async (ctx) => {
  const payload = ctx.get('userPayload')
  const db = ctx.get('database')

  const user = await db
    .selectFrom('users')
    .select([
      'id',
      'username',
      'email',
      'role',
      'profile_pic',
      'created_at',
      'updated_at',
    ])
    .where('id', '=', payload.sub.id)
    .executeTakeFirst()

  if (!user) {
    return ctx.json({ message: 'User not found' }, 404)
  }

  return ctx.json(user, 200)
})

usersRoute.get(
  '/:username',
  sValidator(
    'param',
    type({
      username: 'string',
    })
  ),
  async (ctx) => {
    const db = ctx.get('database')
    const { username } = ctx.req.valid('param')

    const user = await db
      .selectFrom('users')
      .select([
        'id',
        'username',
        'email',
        'role',
        'profile_pic',
        'created_at',
        'updated_at',
      ])
      .where('username', '=', username)
      .executeTakeFirst()

    if (!user) {
      return ctx.json({ message: 'User not found' }, 404)
    }

    return ctx.json(user, 200)
  }
)

usersRoute.post(
  '/create',
  isAuth('admin'),
  sValidator(
    'json',
    type({
      username: 'string > 2',
      email: 'string.email',
      password: 'string > 7',
      role: type.enumerated(...userRolesEnum.enumValues),
    })
  ),
  async (ctx) => {
    const db = ctx.get('database')
    const { username, email, password, role } = ctx.req.valid('json')

    const user = await db
      .insertInto('users')
      .values({
        username,
        email,
        password,
        role,
      })
      .returning([
        'id',
        'username',
        'email',
        'role',
        'profile_pic',
        'created_at',
        'updated_at',
      ])
      .executeTakeFirst()

    if (!user) {
      return ctx.json({ message: 'Internal server error' }, 500)
    }

    return ctx.json(user, 201)
  }
)

usersRoute.put(
  '/update/self',
  isAuth(),
  sValidator(
    'form',
    type({
      username: 'string > 2?',
      email: 'string.email?',
      password: 'string > 7?',
      phoneNumber: 'string | null?',
      // profilePic: 'File | null?',
      city: 'string | null?',
      region: 'string | null?',
      zipCode: 'string | null?',
    })
  ),
  async (ctx) => {
    const payload = ctx.get('userPayload')
    const db = ctx.get('database')
    const { ...updateDatas } = ctx.req.valid('form')

    // if (profilePic && profilePic.size > Number(env(ctx).MAX_FILE_SIZE)) {
    //   return ctx.json({ message: 'File too large' }, 400)
    // }

    // const profilePicUrl = profilePic
    //   ? await uploadProfile(profilePic)
    //   : undefined

    const user = await db
      .updateTable('users')
      .set({ ...updateDatas })
      .where('id', '=', payload.sub.id)
      .returning([
        'id',
        'username',
        'email',
        'role',
        'profile_pic',
        'created_at',
        'updated_at',
      ])
      .executeTakeFirst()

    if (!user) {
      return ctx.json({ message: 'User not found' }, 404)
    }

    const newPayload: Payload = {
      sub: {
        id: user.id,
        username: user.username,
      },
      role: user.role,
    }

    const { COOKIE_SECRET, JWT_SECRET } = env(ctx)

    const token = await sign(newPayload, JWT_SECRET)

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
      username: 'string > 2?',
      email: 'string.email?',
      password: 'string > 7?',
      phoneNumber: 'string | null?',
      // profilePic: 'File | null?',
      city: 'string | null?',
      region: 'string | null?',
      zipCode: 'string | null?',
      role: type.enumerated(...userRolesEnum.enumValues).optional(),
    })
  ),
  async (ctx) => {
    const db = ctx.get('database')
    const { id } = ctx.req.valid('param')
    const { ...updateDatas } = ctx.req.valid('form')
    const { id: userId } = ctx.get('userPayload')

    // if (profilePic && profilePic.size > Number(env(ctx).MAX_FILE_SIZE)) {
    //   return ctx.json({ message: 'File too large' }, 400)
    // }

    // const profilePicUrl = profilePic
    //   ? await uploadProfile(profilePic)
    //   : undefined

    const user = await db
      .updateTable('users')
      .set({ ...updateDatas })
      .where('id', '=', id)
      .returning([
        'id',
        'username',
        'email',
        'role',
        'profile_pic',
        'created_at',
        'updated_at',
      ])
      .executeTakeFirst()

    if (!user) {
      return ctx.json({ message: 'User not found' }, 404)
    }

    if (id === userId) {
      const newPayload: Payload = {
        sub: {
          id: user.id,
          username: user.username,
        },
        role: user.role,
      }

      const { COOKIE_SECRET, JWT_SECRET } = env(ctx)

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

    const user = await db
      .deleteFrom('users')
      .where('id', '=', id)
      .returning('id')
      .executeTakeFirst()

    if (!user) {
      return ctx.json({ message: 'User not found' }, 404)
    }

    return ctx.json(user, 200)
  }
)

usersRoute.delete('/delete/self', isAuth(), async (ctx) => {
  const payload = ctx.get('userPayload')
  const db = ctx.get('database')

  const user = await db
    .deleteFrom('users')
    .where('id', '=', payload.sub.id)
    .returning('id')
    .executeTakeFirst()

  if (!user) {
    return ctx.json({ message: 'User not found' }, 404)
  }

  return ctx.json(user, 200)
})

export default usersRoute
