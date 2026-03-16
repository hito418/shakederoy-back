import { type } from 'arktype'
import { env } from 'hono/adapter'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { Hono } from 'hono'
import { isAuth } from 'src/features/auth/auth.middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import { dto, errResponse } from 'src/shared/response-schemas'
import { GlassSchema, GlassPaginatedSchema } from 'src/features/cocktails/cocktails.dto'
import { glassesService } from 'src/container'
import { provide } from 'src/shared/provide'

const glassesRoute = new Hono()
  .basePath('/glasses')
  .use(provide('glasses', glassesService))

glassesRoute
  .get(
    '/',
    describeRoute({
      tags: ['Glasses'],
      summary: 'List glasses',
      description: 'Returns a paginated list of all glass types.',
      responses: {
        200: {
          description: 'Paginated list of glasses',
          content: { 'application/json': { schema: resolver(GlassPaginatedSchema) } },
        },
        500: errResponse('Database error'),
      },
    }),
    validator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await ctx.get('glasses').list(page, pageSize)

      return result
        .andThen((data) => dto(GlassPaginatedSchema, data))
        .match(
          (data) => ctx.json(data, 200),
          (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .get(
    '/:id',
    describeRoute({
      tags: ['Glasses'],
      summary: 'Get glass by ID',
      description: 'Returns a single glass type by its ID.',
      responses: {
        200: {
          description: 'Glass details',
          content: { 'application/json': { schema: resolver(GlassSchema) } },
        },
        404: errResponse('Glass not found'),
        500: errResponse('Database error'),
      },
    }),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const result = await ctx.get('glasses').getById(id)

      return result
        .andThen((data) => dto(GlassSchema, data))
        .match(
          (data) => ctx.json(data, 200),
          (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .post(
    '/create',
    describeRoute({
      tags: ['Glasses'],
      summary: 'Create glass',
      description: 'Creates a new glass type with optional description, capacity, and image. Requires admin role.',
      responses: {
        201: {
          description: 'Created glass',
          content: { 'application/json': { schema: resolver(GlassSchema) } },
        },
        401: errResponse('Missing or invalid session cookie, or insufficient role'),
        500: errResponse('Database error'),
      },
    }),
    isAuth('admin'),
    validator(
      'json',
      type({
        name: 'string >= 1',
        description: 'string?',
        capacity: 'number?',
        imageUrl: 'string?',
      })
    ),
    async (ctx) => {
      const { name, description, capacity, imageUrl } = ctx.req.valid('json')

      const result = await ctx.get('glasses').create({
        name,
        description,
        capacity,
        image_url: imageUrl,
      })

      return result
        .andThen((data) => dto(GlassSchema, data))
        .match(
          (data) => ctx.json(data, 201),
          (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .put(
    '/:id',
    describeRoute({
      tags: ['Glasses'],
      summary: 'Update glass',
      description: 'Updates a glass type by its ID. Requires admin role.',
      responses: {
        200: {
          description: 'Updated glass',
          content: { 'application/json': { schema: resolver(GlassSchema) } },
        },
        401: errResponse('Missing or invalid session cookie, or insufficient role'),
        404: errResponse('Glass not found'),
        500: errResponse('Database error'),
      },
    }),
    isAuth('admin'),
    validator('param', type({ id: 'string' })),
    validator(
      'json',
      type({
        name: 'string >= 1?',
        description: 'string?',
        capacity: 'number?',
        imageUrl: 'string?',
      })
    ),
    async (ctx) => {
      const { id } = ctx.req.valid('param')
      const { name, description, capacity, imageUrl } = ctx.req.valid('json')

      const result = await ctx.get('glasses').update(id, {
        name,
        description,
        capacity,
        image_url: imageUrl,
      })

      return result
        .andThen((data) => dto(GlassSchema, data))
        .match(
          (data) => ctx.json(data, 200),
          (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .delete(
    '/:id',
    describeRoute({
      tags: ['Glasses'],
      summary: 'Delete glass',
      description: 'Deletes a glass type by its ID. Requires admin role.',
      responses: {
        200: {
          description: 'Deleted glass',
          content: { 'application/json': { schema: resolver(GlassSchema) } },
        },
        401: errResponse('Missing or invalid session cookie, or insufficient role'),
        404: errResponse('Glass not found'),
        500: errResponse('Database error'),
      },
    }),
    isAuth('admin'),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const result = await ctx.get('glasses').delete(id)

      return result
        .andThen((data) => dto(GlassSchema, data))
        .match(
          (data) => ctx.json(data, 200),
          (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )

export default glassesRoute
