import { type } from 'arktype'
import { env } from 'hono/adapter'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { Hono } from 'hono'
import { isAuth } from 'src/features/auth/auth.middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import { errorResponses } from 'src/shared/response-schemas'
import { AlcoholTypeSchema, AlcoholTypePaginatedSchema } from 'src/features/cocktails/cocktails.dto'
import { alcoholTypesService } from 'src/container'
import { provide } from 'src/shared/provide'

const alcoholTypesRoute = new Hono()
  .basePath('/alcohol-types')
  .use(provide('alcoholTypes', alcoholTypesService))

alcoholTypesRoute
  .get(
    '/',
    describeRoute({
      tags: ['Alcohol Types'],
      summary: 'List alcohol types',
      description: 'Returns a paginated list of all alcohol types.',
      responses: {
        200: {
          description: 'Paginated list of alcohol types',
          content: { 'application/json': { schema: resolver(AlcoholTypePaginatedSchema) } },
        },
        ...errorResponses,
      },
    }),
    validator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await ctx.get('alcoholTypes').list(page, pageSize)

      return result.match(
        (alcoholTypeList) => ctx.json(alcoholTypeList, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error)),
      )
    }
  )
  .get(
    '/:id',
    describeRoute({
      tags: ['Alcohol Types'],
      summary: 'Get alcohol type by ID',
      description: 'Returns a single alcohol type by its ID.',
      responses: {
        200: {
          description: 'Alcohol type details',
          content: { 'application/json': { schema: resolver(AlcoholTypeSchema) } },
        },
        ...errorResponses,
      },
    }),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const result = await ctx.get('alcoholTypes').getById(id)

      return result.match(
        (alcoholType) => ctx.json(alcoholType, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .post(
    '/create',
    describeRoute({
      tags: ['Alcohol Types'],
      summary: 'Create alcohol type',
      description: 'Creates a new alcohol type with optional ABV range. Requires admin role.',
      responses: {
        201: {
          description: 'Created alcohol type',
          content: { 'application/json': { schema: resolver(AlcoholTypeSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth('admin'),
    validator(
      'json',
      type({
        name: 'string >= 1',
        description: 'string?',
        abvRangeMin: 'string.numeric?',
        abvRangeMax: 'string.numeric?',
      })
    ),
    async (ctx) => {
      const { name, description, abvRangeMin, abvRangeMax } = ctx.req.valid('json')

      const result = await ctx.get('alcoholTypes').create({
        name,
        description,
        abv_range_min: abvRangeMin,
        abv_range_max: abvRangeMax,
      })

      return result.match(
        (newAlcoholType) => ctx.json(newAlcoholType, 201),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .put(
    '/:id',
    describeRoute({
      tags: ['Alcohol Types'],
      summary: 'Update alcohol type',
      description: 'Updates an alcohol type by its ID. Requires admin role.',
      responses: {
        200: {
          description: 'Updated alcohol type',
          content: { 'application/json': { schema: resolver(AlcoholTypeSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth('admin'),
    validator('param', type({ id: 'string' })),
    validator(
      'json',
      type({
        name: 'string >= 1?',
        description: 'string?',
        abvRangeMin: 'string.numeric?',
        abvRangeMax: 'string.numeric?',
      })
    ),
    async (ctx) => {
      const { id } = ctx.req.valid('param')
      const { name, description, abvRangeMin, abvRangeMax } = ctx.req.valid('json')

      const result = await ctx.get('alcoholTypes').update(id, {
        name,
        description,
        abv_range_min: abvRangeMin,
        abv_range_max: abvRangeMax,
      })

      return result.match(
        (updatedAlcoholType) => ctx.json(updatedAlcoholType, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .delete(
    '/:id',
    describeRoute({
      tags: ['Alcohol Types'],
      summary: 'Delete alcohol type',
      description: 'Deletes an alcohol type by its ID. Requires admin role.',
      responses: {
        200: {
          description: 'Deleted alcohol type',
          content: { 'application/json': { schema: resolver(AlcoholTypeSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth('admin'),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const result = await ctx.get('alcoholTypes').delete(id)

      return result.match(
        (deletedAlcoholType) => ctx.json(deletedAlcoholType, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

export default alcoholTypesRoute
