import { type } from 'arktype'
import { env } from 'hono/adapter'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { Hono } from 'hono'
import { isAuth } from 'src/features/auth/auth.middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import { errorResponses } from 'src/shared/response-schemas'
import {
  CocktailStyleSchema,
  CocktailStylePaginatedSchema,
} from 'src/features/cocktails/cocktails.dto'
import { stylesService } from 'src/container'
import { provide } from 'src/shared/provide'

const stylesRoute = new Hono()
  .use(provide('styles', stylesService))

stylesRoute
  .get(
    '/',
    describeRoute({
      tags: ['Cocktail Styles'],
      summary: 'List cocktail styles',
      description: 'Returns a paginated list of all cocktail styles.',
      responses: {
        200: {
          description: 'Paginated list of cocktail styles',
          content: {
            'application/json': {
              schema: resolver(CocktailStylePaginatedSchema),
            },
          },
        },
        ...errorResponses,
      },
    }),
    validator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await ctx.get('styles').list(page, pageSize)

      return result.match(
        (styleList) => ctx.json(styleList, 200),
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .get(
    '/:id',
    describeRoute({
      tags: ['Cocktail Styles'],
      summary: 'Get cocktail style by ID',
      description: 'Returns a single cocktail style by its ID.',
      responses: {
        200: {
          description: 'Cocktail style details',
          content: {
            'application/json': { schema: resolver(CocktailStyleSchema) },
          },
        },
        ...errorResponses,
      },
    }),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const result = await ctx.get('styles').getById(id)

      return result.match(
        (style) => ctx.json(style, 200),
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .post(
    '/create',
    describeRoute({
      tags: ['Cocktail Styles'],
      summary: 'Create cocktail style',
      description: 'Creates a new cocktail style. Requires admin role.',
      responses: {
        201: {
          description: 'Created cocktail style',
          content: {
            'application/json': { schema: resolver(CocktailStyleSchema) },
          },
        },
        ...errorResponses,
      },
    }),
    isAuth('admin'),
    validator(
      'json',
      type({
        name: 'string >= 1',
        'description?': 'string',
      })
    ),
    async (ctx) => {
      const { name, description } = ctx.req.valid('json')

      const result = await ctx.get('styles').create({ name, description })

      return result.match(
        (newStyle) => ctx.json(newStyle, 201),
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .put(
    '/:id',
    describeRoute({
      tags: ['Cocktail Styles'],
      summary: 'Update cocktail style',
      description: 'Updates a cocktail style by its ID. Requires admin role.',
      responses: {
        200: {
          description: 'Updated cocktail style',
          content: {
            'application/json': { schema: resolver(CocktailStyleSchema) },
          },
        },
        ...errorResponses,
      },
    }),
    isAuth('admin'),
    validator('param', type({ id: 'string' })),
    validator(
      'json',
      type({
        'name?': 'string >= 1',
        'description?': 'string',
      })
    ),
    async (ctx) => {
      const { id } = ctx.req.valid('param')
      const { name, description } = ctx.req.valid('json')

      const result = await ctx
        .get('styles')
        .update(id, { name, description })

      return result.match(
        (updatedStyle) => ctx.json(updatedStyle, 200),
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .delete(
    '/:id',
    describeRoute({
      tags: ['Cocktail Styles'],
      summary: 'Delete cocktail style',
      description: 'Deletes a cocktail style by its ID. Requires admin role.',
      responses: {
        200: {
          description: 'Deleted cocktail style',
          content: {
            'application/json': { schema: resolver(CocktailStyleSchema) },
          },
        },
        ...errorResponses,
      },
    }),
    isAuth('admin'),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const result = await ctx.get('styles').delete(id)

      return result.match(
        (deletedStyle) => ctx.json(deletedStyle, 200),
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

export default stylesRoute
