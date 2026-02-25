import { type } from 'arktype'
import { env } from 'hono/adapter'
import { deleteCookie, getSignedCookie } from 'hono/cookie'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { HonoVar } from 'src/shared/hono'
import { isAuth } from 'src/features/auth/auth.middleware'
import { deleteSession } from 'src/features/auth/session.service'
import { errorToHttpStatus } from 'src/shared/errors'
import { errorResponses } from 'src/shared/response-schemas'
import { SafeUserSchema, SafeUserPaginatedSchema } from 'src/features/users/users.dto'
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from 'src/features/users/users.service'
import favoritesRoute from './favorites'
import collectionsRoute from './collections'

const usersRoute = new HonoVar().basePath('/users')

usersRoute.get(
  '/',
  describeRoute({
    tags: ['Users'],
    summary: 'List users',
    responses: {
      200: {
        description: 'Paginated list of users',
        content: { 'application/json': { schema: resolver(SafeUserPaginatedSchema) } },
      },
      ...errorResponses,
    },
  }),
  validator('query', type({ page: 'string.numeric.parse?' })),
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

usersRoute.get(
  '/self',
  describeRoute({
    tags: ['Users'],
    summary: 'Get current user',
    responses: {
      200: {
        description: 'Current user',
        content: { 'application/json': { schema: resolver(SafeUserSchema) } },
      },
      ...errorResponses,
    },
  }),
  isAuth(),
  async (ctx) => {
    const payload = ctx.get('userPayload')
    const db = ctx.get('database')

    const result = await getUserById(db, payload.sub.id)

    return result.match(
      (user) => ctx.json(user, 200),
      (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
    )
  }
)

usersRoute.get(
  '/:id',
  describeRoute({
    tags: ['Users'],
    summary: 'Get user by ID',
    responses: {
      200: {
        description: 'User found',
        content: { 'application/json': { schema: resolver(SafeUserSchema) } },
      },
      ...errorResponses,
    },
  }),
  validator(
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
  describeRoute({
    tags: ['Users'],
    summary: 'Create user (admin)',
    responses: {
      201: {
        description: 'User created',
        content: { 'application/json': { schema: resolver(SafeUserSchema) } },
      },
      ...errorResponses,
    },
  }),
  isAuth('admin'),
  validator(
    'json',
    type({
      username: 'string >= 3',
      email: 'string.email',
      password: 'string > 7',
      role: '"admin" | "user"',
    })
  ),
  async (ctx) => {
    const db = ctx.get('database')
    const { username, email, password, role } = ctx.req.valid('json')

    const result = await createUser(db, username, email, password, role)

    return result.match(
      (user) => ctx.json(user, 201),
      (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
    )
  }
)

usersRoute.put(
  '/update/self',
  describeRoute({
    tags: ['Users'],
    summary: 'Update current user',
    responses: {
      200: {
        description: 'User updated',
        content: { 'application/json': { schema: resolver(SafeUserSchema) } },
      },
      ...errorResponses,
    },
  }),
  isAuth(),
  validator(
    'form',
    type({
      username: 'string >= 3?',
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
    const updateDatas = ctx.req.valid('form')

    const result = await updateUser(db, payload.sub.id, updateDatas)

    return result.match(
      (user) => ctx.json(user, 200),
      (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
    )
  }
)

usersRoute.put(
  '/update/:id',
  describeRoute({
    tags: ['Users'],
    summary: 'Update user (admin)',
    responses: {
      200: {
        description: 'User updated',
        content: { 'application/json': { schema: resolver(SafeUserSchema) } },
      },
      ...errorResponses,
    },
  }),
  isAuth('admin'),
  validator(
    'param',
    type({
      id: 'string',
    })
  ),
  validator(
    'form',
    type({
      username: 'string >= 3?',
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
    const updateDatas = ctx.req.valid('form')

    const result = await updateUser(db, id, updateDatas)

    return result.match(
      (user) => ctx.json(user, 200),
      (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
    )
  }
)

usersRoute.delete(
  '/delete/:id',
  describeRoute({
    tags: ['Users'],
    summary: 'Delete user (admin)',
    responses: {
      200: {
        description: 'User deleted',
        content: { 'application/json': { schema: resolver(SafeUserSchema) } },
      },
      ...errorResponses,
    },
  }),
  validator('param', type({ id: 'string' })),
  isAuth('admin'),
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

usersRoute.delete(
  '/delete/self',
  describeRoute({
    tags: ['Users'],
    summary: 'Delete current user',
    responses: {
      200: {
        description: 'User deleted',
        content: { 'application/json': { schema: resolver(SafeUserSchema) } },
      },
      ...errorResponses,
    },
  }),
  isAuth(),
  async (ctx) => {
    const payload = ctx.get('userPayload')
    const db = ctx.get('database')
    const { COOKIE_SECRET } = env(ctx)
    const sessionId = await getSignedCookie(ctx, COOKIE_SECRET, 'session_id')

    const result = await deleteUser(db, payload.sub.id)

    if (result.isOk()) {
      if (sessionId) {
        await deleteSession(db, sessionId)
      }
      deleteCookie(ctx, 'session_id')
    }

    return result.match(
      (user) => ctx.json(user, 200),
      (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
    )
  }
)

usersRoute.route('/', favoritesRoute)
usersRoute.route('/', collectionsRoute)

export default usersRoute
