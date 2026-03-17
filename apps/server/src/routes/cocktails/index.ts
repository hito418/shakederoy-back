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
import type { CocktailListFilters } from 'src/features/cocktails/cocktails.service'
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
  .route('/styles', stylesRoute)
  .route('/', extrasRoute)
  .route('/', analyticsRoute)
  .route('/', glassesRoute)
  .route('/', alcoholTypesRoute)
  .route('/', ingredientsRoute)
  .get(
    '/',
    describeRoute({
      tags: ['Cocktails'],
      summary: 'List cocktails',
      description:
        'Returns a paginated, filterable, and sortable list of cocktails.',
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
    validator(
      'query',
      type({
        page: 'string.numeric.parse?',
        'search?': 'string',
        'sort_by?':
          "'favorites_first'|'name_asc'|'name_desc'|'prep_time_asc'|'prep_time_desc'|'newest'|'most_popular'|'most_viewed'|'best_rated'",
        'is_alcoholic?': "'true'|'false'",
        'difficulty?': "'easy'|'medium'|'hard'",
        'alcohol_type_id?': 'string',
        'style_id?': 'string',
        'intensity_min?': 'string.numeric.parse',
        'intensity_max?': 'string.numeric.parse',
        'prep_time_min?': 'string.numeric.parse',
        'prep_time_max?': 'string.numeric.parse',
        'ingredient_count_min?': 'string.numeric.parse',
        'ingredient_count_max?': 'string.numeric.parse',
        'favorites_only?': "'true'|'false'",
        'status?': "'draft'|'pending'|'approved'|'rejected'",
        'community?': "'true'|'false'",
        'user_id?': 'string',
      })
    ),
    async (ctx) => {
      const query = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const toBool = (v?: 'true' | 'false') =>
        v === 'true' ? true : v === 'false' ? false : undefined

      const filters: CocktailListFilters = {
        search: query.search,
        isAlcoholic: toBool(query.is_alcoholic),
        difficulty: query.difficulty,
        alcoholTypeId: query.alcohol_type_id,
        styleId: query.style_id,
        intensityMin: query.intensity_min,
        intensityMax: query.intensity_max,
        prepTimeMin: query.prep_time_min,
        prepTimeMax: query.prep_time_max,
        ingredientCountMin: query.ingredient_count_min,
        ingredientCountMax: query.ingredient_count_max,
        favoritesOnly: toBool(query.favorites_only) ?? undefined,
        status: query.status,
        community: toBool(query.community),
        sortBy: query.sort_by,
        userId: query.user_id,
      }

      const result = await ctx
        .get('cocktails')
        .list(query.page ?? 1, pageSize, filters)

      return result
        .andThen((data) => dto(CocktailPaginatedSchema, data))
        .match(
          (data) => ctx.json(data, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
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
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .post(
    '/create',
    describeRoute({
      tags: ['Cocktails'],
      summary: 'Create cocktail',
      description:
        'Creates a cocktail with its ingredients, preparation steps, and style in a single request. Requires authentication.',
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
          'ingredientId?': 'string',
          'ingredientName?': 'string',
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
          ingredient_name: i.ingredientName,
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
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
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
        'status?': "'draft' | 'pending' | 'approved' | 'rejected'",
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
        status: body.status,
      })

      return result
        .andThen((data) => dto(CocktailSchema, data))
        .match(
          (data) => ctx.json(data, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
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
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )

export default cocktailsRoute
