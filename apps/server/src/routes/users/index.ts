import { type } from 'arktype'
import { env } from 'src/shared/env'
import { deleteCookie, getSignedCookie } from 'hono/cookie'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { Hono } from 'hono'
import { isAuth } from 'src/features/auth/auth.middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import { dto, errResponse } from 'src/shared/response-schemas'
import {
  SafeUserSchema,
  SafeUserPaginatedSchema,
} from 'src/features/users/users.dto'
import { usersService } from 'src/container'
import { provide } from 'src/shared/provide'
import favoritesRoute from './favorites'
import collectionsRoute from './collections'

const usersRoute = new Hono()
  .basePath('/users')
  .use(provide('users', usersService))

usersRoute.route('/', favoritesRoute)
usersRoute.route('/', collectionsRoute)

usersRoute.get(
  '/',
  describeRoute({
    tags: ['Users'],
    summary: 'List users',
    description: 'Returns a paginated list of all users.',
    responses: {
      200: {
        description: 'Paginated list of users',
        content: {
          'application/json': { schema: resolver(SafeUserPaginatedSchema.out) },
        },
      },
      500: errResponse('Database error'),
    },
  }),
  validator('query', type({ page: 'string.numeric.parse?' })),
  async (ctx) => {
    const { page = 1 } = ctx.req.valid('query')
    const pageSize = env.PAGE_SIZE

    const result = await ctx.get('users').list(page, pageSize)

    return result
      .andThen((userList) => dto(SafeUserPaginatedSchema, userList))
      .match(
        (userList) => ctx.json(userList, 200),
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
  }
)

usersRoute.get(
  '/self',
  describeRoute({
    tags: ['Users'],
    summary: 'Get current user',
    description: 'Returns the profile of the currently authenticated user.',
    responses: {
      200: {
        description: 'Current user',
        content: { 'application/json': { schema: resolver(SafeUserSchema) } },
      },
      401: errResponse('Missing or invalid session cookie'),
      404: errResponse('User not found'),
      500: errResponse('Database error'),
    },
  }),
  isAuth(),
  async (ctx) => {
    const payload = ctx.get('userPayload')

    const result = await ctx.get('users').getById(payload.sub.id)

    return result
      .andThen((user) => dto(SafeUserSchema, user))
      .match(
        (user) => ctx.json(user, 200),
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
  }
)

usersRoute.get(
  '/:id',
  describeRoute({
    tags: ['Users'],
    summary: 'Get user by ID',
    description: 'Returns a single user by their ID.',
    responses: {
      200: {
        description: 'User found',
        content: { 'application/json': { schema: resolver(SafeUserSchema) } },
      },
      404: errResponse('User not found'),
      500: errResponse('Database error'),
    },
  }),
  validator(
    'param',
    type({
      id: 'string',
    })
  ),
  async (ctx) => {
    const { id } = ctx.req.valid('param')

    const result = await ctx.get('users').getById(id)

    return result
      .andThen((user) => dto(SafeUserSchema, user))
      .match(
        (user) => ctx.json(user, 200),
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
  }
)

usersRoute.post(
  '/create',
  describeRoute({
    tags: ['Users'],
    summary: 'Create user (admin)',
    description:
      'Creates a new user with a specified role. Requires admin role.',
    responses: {
      201: {
        description: 'User created',
        content: { 'application/json': { schema: resolver(SafeUserSchema) } },
      },
      401: errResponse(
        'Missing or invalid session cookie, or insufficient role'
      ),
      500: errResponse('Database error'),
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
    const { username, email, password, role } = ctx.req.valid('json')

    const result = await ctx
      .get('users')
      .create(username, email, password, role)

    return result
      .andThen((user) => dto(SafeUserSchema, user))
      .match(
        (user) => ctx.json(user, 201),
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
  }
)

usersRoute.put(
  '/update/self',
  describeRoute({
    tags: ['Users'],
    summary: 'Update current user',
    description:
      'Updates the profile of the currently authenticated user. Accepts form data.',
    responses: {
      200: {
        description: 'User updated',
        content: { 'application/json': { schema: resolver(SafeUserSchema) } },
      },
      401: errResponse('Missing or invalid session cookie'),
      404: errResponse('User not found'),
      500: errResponse('Database error'),
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
    const updateDatas = ctx.req.valid('form')

    const result = await ctx.get('users').update(payload.sub.id, updateDatas)

    return result
      .andThen((user) => dto(SafeUserSchema, user))
      .match(
        (user) => ctx.json(user, 200),
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
  }
)

usersRoute.put(
  '/update/:id',
  describeRoute({
    tags: ['Users'],
    summary: 'Update user (admin)',
    description:
      'Updates any user by ID including role changes. Requires admin role.',
    responses: {
      200: {
        description: 'User updated',
        content: { 'application/json': { schema: resolver(SafeUserSchema) } },
      },
      401: errResponse(
        'Missing or invalid session cookie, or insufficient role'
      ),
      404: errResponse('User not found'),
      500: errResponse('Database error'),
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
    const { id } = ctx.req.valid('param')
    const updateDatas = ctx.req.valid('form')

    const result = await ctx.get('users').update(id, updateDatas)

    return result
      .andThen((user) => dto(SafeUserSchema, user))
      .match(
        (user) => ctx.json(user, 200),
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
  }
)

usersRoute.delete(
  '/delete/:id',
  describeRoute({
    tags: ['Users'],
    summary: 'Delete user (admin)',
    description: 'Deletes a user by ID. Requires admin role.',
    responses: {
      200: {
        description: 'User deleted',
        content: { 'application/json': { schema: resolver(SafeUserSchema) } },
      },
      401: errResponse(
        'Missing or invalid session cookie, or insufficient role'
      ),
      404: errResponse('User not found'),
      500: errResponse('Database error'),
    },
  }),
  validator('param', type({ id: 'string' })),
  isAuth('admin'),
  async (ctx) => {
    const { id } = ctx.req.valid('param')

    const result = await ctx.get('users').delete(id)

    return result
      .andThen((user) => dto(SafeUserSchema, user))
      .match(
        (user) => ctx.json(user, 200),
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
  }
)

usersRoute.delete(
  '/delete/self',
  describeRoute({
    tags: ['Users'],
    summary: 'Delete current user',
    description:
      'Deletes the currently authenticated user and clears their session.',
    responses: {
      200: {
        description: 'User deleted',
        content: { 'application/json': { schema: resolver(SafeUserSchema) } },
      },
      401: errResponse('Missing or invalid session cookie'),
      404: errResponse('User not found'),
      500: errResponse('Database error'),
    },
  }),
  isAuth(),
  async (ctx) => {
    const payload = ctx.get('userPayload')
    const COOKIE_SECRET = env.COOKIE_SECRET
    const sessionId = await getSignedCookie(ctx, COOKIE_SECRET, 'session_id')

    const result = await ctx.get('users').delete(payload.sub.id)

    if (result.isOk()) {
      if (sessionId) {
        await ctx.get('sessionService').delete(sessionId)
      }
      deleteCookie(ctx, 'session_id')
    }

    return result
      .andThen((user) => dto(SafeUserSchema, user))
      .match(
        (user) => ctx.json(user, 200),
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
  }
)

export default usersRoute
