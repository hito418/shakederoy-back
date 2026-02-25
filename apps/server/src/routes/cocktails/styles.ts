import { type } from 'arktype'
import { env } from 'hono/adapter'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { HonoVar } from 'src/shared/hono'
import { isAuth } from 'src/features/auth/auth.middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import { errorResponses } from 'src/shared/response-schemas'
import { CocktailStyleSchema, CocktailStylePaginatedSchema } from 'src/features/cocktails/cocktails.dto'
import {
  listCocktailStyles,
  getCocktailStyleById,
  createCocktailStyle,
  updateCocktailStyle,
  deleteCocktailStyle,
} from 'src/features/cocktails/styles.service'

const stylesRoute = new HonoVar()

stylesRoute
  .get(
    '/',
    describeRoute({
      tags: ['Cocktail Styles'],
      summary: 'List cocktail styles',
      responses: {
        200: {
          description: 'Paginated list of cocktail styles',
          content: { 'application/json': { schema: resolver(CocktailStylePaginatedSchema) } },
        },
        ...errorResponses,
      },
    }),
    validator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await listCocktailStyles(db, page, pageSize)

      return result.match(
        (styleList) => ctx.json(styleList, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .get(
    '/:id',
    describeRoute({
      tags: ['Cocktail Styles'],
      summary: 'Get cocktail style by ID',
      responses: {
        200: {
          description: 'Cocktail style details',
          content: { 'application/json': { schema: resolver(CocktailStyleSchema) } },
        },
        ...errorResponses,
      },
    }),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')

      const result = await getCocktailStyleById(db, id)

      return result.match(
        (style) => ctx.json(style, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .post(
    '/create',
    describeRoute({
      tags: ['Cocktail Styles'],
      summary: 'Create cocktail style',
      responses: {
        201: {
          description: 'Created cocktail style',
          content: { 'application/json': { schema: resolver(CocktailStyleSchema) } },
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
      const db = ctx.get('database')
      const { name, description } = ctx.req.valid('json')

      const result = await createCocktailStyle(db, { name, description })

      return result.match(
        (newStyle) => ctx.json(newStyle, 201),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .put(
    '/:id',
    describeRoute({
      tags: ['Cocktail Styles'],
      summary: 'Update cocktail style',
      responses: {
        200: {
          description: 'Updated cocktail style',
          content: { 'application/json': { schema: resolver(CocktailStyleSchema) } },
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
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')
      const { name, description } = ctx.req.valid('json')

      const result = await updateCocktailStyle(db, id, { name, description })

      return result.match(
        (updatedStyle) => ctx.json(updatedStyle, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .delete(
    '/:id',
    describeRoute({
      tags: ['Cocktail Styles'],
      summary: 'Delete cocktail style',
      responses: {
        200: {
          description: 'Deleted cocktail style',
          content: { 'application/json': { schema: resolver(CocktailStyleSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth('admin'),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')

      const result = await deleteCocktailStyle(db, id)

      return result.match(
        (deletedStyle) => ctx.json(deletedStyle, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

export default stylesRoute
