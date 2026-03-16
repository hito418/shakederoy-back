import { type } from 'arktype'
import { env } from 'hono/adapter'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { Hono } from 'hono'
import { isAuth } from 'src/features/auth/auth.middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import { dto, errResponse } from 'src/shared/response-schemas'
import {
  CocktailSchema,
  CocktailPaginatedSchema,
  CocktailFullSchema,
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
        500: errResponse('Database error'),
      },
    }),
    validator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await ctx.get('cocktails').list(page, pageSize)

      return result
        .andThen((data) => dto(CocktailPaginatedSchema, data))
        .match(
          (data) => ctx.json(data, 200),
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
        404: errResponse('Cocktail not found'),
        500: errResponse('Database error'),
      },
    }),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const result = await ctx.get('cocktails').getById(id)

      return result
        .andThen((data) => dto(CocktailSchema, data))
        .match(
          (data) => ctx.json(data, 200),
          (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .post(
    '/create',
    describeRoute({
      tags: ['Cocktails'],
      summary: 'Create cocktail',
      description: 'Creates a cocktail with its ingredients, preparation steps, and style in a single request. Requires authentication.',
      responses: {
        201: {
          description: 'Created cocktail with relations',
          content: {
            'application/json': { schema: resolver(CocktailFullSchema) },
          },
        },
        401: errResponse('Missing or invalid session cookie'),
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator(
      'json',
      type({
        name: 'string > 3',
        slug: 'string >= 1',
        'description?': 'string',
        isAlcoholic: 'boolean',
        'mainAlcoholId?': 'string',
        'difficulty?': "'easy' | 'medium' | 'hard'",
        'prepTime?': 'number',
        'glassId?': 'string',
        'styleId?': 'string',
        ingredients: type({
          ingredientId: 'string',
          'quantity?': 'string',
          'unit?': 'string',
        }).array(),
        steps: 'string[]',
      })
    ),
    async (ctx) => {
      const payload = ctx.get('userPayload')
      const body = ctx.req.valid('json')

      const result = await ctx.get('cocktails').createFull({
        cocktail: {
          name: body.name,
          slug: body.slug,
          description: body.description,
          is_alcoholic: body.isAlcoholic,
          main_alcohol_id: body.mainAlcoholId,
          difficulty: body.difficulty,
          prep_time: body.prepTime,
          glass_id: body.glassId,
          created_by_id: payload.sub.id,
        },
        ingredients: body.ingredients.map((i) => ({
          ingredient_id: i.ingredientId,
          quantity: i.quantity,
          unit: i.unit,
        })),
        steps: body.steps,
        styleId: body.styleId,
      })

      return result
        .andThen((data) => dto(CocktailFullSchema, data))
        .match(
          (data) => ctx.json(data, 201),
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
        401: errResponse('Missing or invalid session cookie'),
        404: errResponse('Cocktail not found'),
        500: errResponse('Database error'),
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
        'isAlcoholic?': 'boolean',
        'mainAlcoholId?': 'string | null',
        'difficulty?': "'easy' | 'medium' | 'hard'",
        'prepTime?': 'number',
        'glassId?': 'string',
      })
    ),
    async (ctx) => {
      const { id } = ctx.req.valid('param')
      const body = ctx.req.valid('json')

      const result = await ctx.get('cocktails').update(id, {
        name: body.name,
        slug: body.slug,
        description: body.description,
        is_alcoholic: body.isAlcoholic,
        main_alcohol_id: body.mainAlcoholId,
        difficulty: body.difficulty,
        prep_time: body.prepTime,
        glass_id: body.glassId,
      })

      return result
        .andThen((data) => dto(CocktailSchema, data))
        .match(
          (data) => ctx.json(data, 200),
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
        401: errResponse('Missing or invalid session cookie'),
        404: errResponse('Cocktail not found'),
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const result = await ctx.get('cocktails').delete(id)

      return result
        .andThen((data) => dto(CocktailSchema, data))
        .match(
          (data) => ctx.json(data, 200),
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
