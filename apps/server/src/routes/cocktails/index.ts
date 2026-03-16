import { type } from 'arktype'
import { env } from 'hono/adapter'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { Hono } from 'hono'
import { isAuth } from 'src/features/auth/auth.middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import { errorResponses } from 'src/shared/response-schemas'
import {
  CocktailSchema,
  CocktailPaginatedSchema,
} from 'src/features/cocktails/cocktails.dto'
import { cocktailsService } from 'src/container'
import { provide } from 'src/shared/provide'
import stylesRoute from './styles'
import extrasRoute from './extras'
import analyticsRoute from './analytics'
import glassesRoute from './glasses'
import alcoholTypesRoute from './alcohol-types'
import ingredientsRoute from './ingredients'

const cocktailsRoute = new Hono()
  .basePath('/cocktails')
  .use(provide('cocktails', cocktailsService))

cocktailsRoute
  .get(
    '/',
    describeRoute({
      tags: ['Cocktails'],
      summary: 'List cocktails',
      description: 'Returns a paginated list of all cocktails.',
      responses: {
        200: {
          description: 'Paginated list of cocktails',
          content: {
            'application/json': { schema: resolver(CocktailPaginatedSchema) },
          },
        },
        ...errorResponses,
      },
    }),
    validator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await ctx.get('cocktails').list(page, pageSize)

      return result.match(
        (cocktailList) => ctx.json(cocktailList, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .get(
    '/:id',
    describeRoute({
      tags: ['Cocktails'],
      summary: 'Get cocktail by ID',
      description: 'Returns full cocktail details by its ID.',
      responses: {
        200: {
          description: 'Cocktail details',
          content: {
            'application/json': { schema: resolver(CocktailSchema) },
          },
        },
        ...errorResponses,
      },
    }),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const result = await ctx.get('cocktails').getById(id)

      return result.match(
        (cocktail) => ctx.json(cocktail, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .post(
    '/create',
    describeRoute({
      tags: ['Cocktails'],
      summary: 'Create cocktail',
      description: 'Creates a new cocktail with optional attributes like intensity, difficulty, and glass type. Requires authentication.',
      responses: {
        201: {
          description: 'Created cocktail',
          content: {
            'application/json': { schema: resolver(CocktailSchema) },
          },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator(
      'json',
      type({
        name: 'string > 3',
        slug: 'string >= 1',
        'description?': 'string',
        'intensity?': 'number',
        'difficulty?': 'number',
        'prepTime?': 'number',
        'glassId?': 'string',
      })
    ),
    async (ctx) => {
      const payload = ctx.get('userPayload')
      const { name, slug, description, intensity, difficulty, prepTime, glassId } =
        ctx.req.valid('json')

      const result = await ctx.get('cocktails').create({
        name,
        slug,
        description,
        intensity,
        difficulty,
        prep_time: prepTime,
        glass_id: glassId,
        created_by_id: payload.sub.id,
      })

      return result.match(
        (newCocktail) => ctx.json(newCocktail, 201),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .put(
    '/:id',
    describeRoute({
      tags: ['Cocktails'],
      summary: 'Update cocktail',
      description: 'Updates cocktail details. Requires authentication.',
      responses: {
        200: {
          description: 'Updated cocktail',
          content: {
            'application/json': { schema: resolver(CocktailSchema) },
          },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    validator(
      'json',
      type({
        'name?': 'string > 3',
        'slug?': 'string >= 1',
        'description?': 'string',
        'intensity?': 'number',
        'difficulty?': 'number',
        'prepTime?': 'number',
        'glassId?': 'string',
      })
    ),
    async (ctx) => {
      const { id } = ctx.req.valid('param')
      const { name, slug, description, intensity, difficulty, prepTime, glassId } =
        ctx.req.valid('json')

      const result = await ctx.get('cocktails').update(id, {
        name,
        slug,
        description,
        intensity,
        difficulty,
        prep_time: prepTime,
        glass_id: glassId,
      })

      return result.match(
        (updatedCocktail) => ctx.json(updatedCocktail, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .delete(
    '/:id',
    describeRoute({
      tags: ['Cocktails'],
      summary: 'Delete cocktail',
      description: 'Deletes a cocktail by its ID. Requires authentication.',
      responses: {
        200: {
          description: 'Deleted cocktail',
          content: {
            'application/json': { schema: resolver(CocktailSchema) },
          },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const result = await ctx.get('cocktails').delete(id)

      return result.match(
        (deletedCocktail) => ctx.json(deletedCocktail, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .route('/styles', stylesRoute)
  .route('/', extrasRoute)
  .route('/', analyticsRoute)
  .route('/', glassesRoute)
  .route('/', alcoholTypesRoute)
  .route('/', ingredientsRoute)

export default cocktailsRoute
