import { type } from 'arktype'
import { env } from 'hono/adapter'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { Hono } from 'hono'
import { isAuth } from 'src/features/auth/auth.middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import { dto, errResponse } from 'src/shared/response-schemas'
import {
  IngredientSchema,
  IngredientPaginatedSchema,
} from 'src/features/cocktails/cocktails.dto'
import { ingredientsService } from 'src/container'
import { provide } from 'src/shared/provide'

const ingredientsRoute = new Hono()
  .basePath('/ingredients')
  .use(provide('ingredients', ingredientsService))

ingredientsRoute
  .get(
    '/',
    describeRoute({
      tags: ['Ingredients'],
      summary: 'List ingredients',
      description: 'Returns a paginated list of all ingredients.',
      responses: {
        200: {
          description: 'Paginated list of ingredients',
          content: {
            'application/json': { schema: resolver(IngredientPaginatedSchema) },
          },
        },
        500: errResponse('Database error'),
      },
    }),
    validator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await ctx.get('ingredients').list(page, pageSize)

      return result
        .andThen((data) => dto(IngredientPaginatedSchema, data))
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
      tags: ['Ingredients'],
      summary: 'Get ingredient by ID',
      description: 'Returns a single ingredient by its ID.',
      responses: {
        200: {
          description: 'Ingredient details',
          content: {
            'application/json': { schema: resolver(IngredientSchema) },
          },
        },
        404: errResponse('Ingredient not found'),
        500: errResponse('Database error'),
      },
    }),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const result = await ctx.get('ingredients').getById(id)

      return result
        .andThen((data) => dto(IngredientSchema, data))
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
      tags: ['Ingredients'],
      summary: 'Create ingredient',
      description: 'Creates a new ingredient with category, alcohol info, and optional image. Requires admin role.',
      responses: {
        201: {
          description: 'Created ingredient',
          content: {
            'application/json': { schema: resolver(IngredientSchema) },
          },
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
        category:
          "'spirit'|'liqueur'|'wine'|'beer'|'mixer'|'juice'|'syrup'|'bitter'|'garnish'|'dairy'|'other'",
        isAlcoholic: 'boolean?',
        alcoholTypeId: 'string?',
        imageUrl: 'string?',
      })
    ),
    async (ctx) => {
      const {
        name,
        description,
        category,
        isAlcoholic,
        alcoholTypeId,
        imageUrl,
      } = ctx.req.valid('json')

      const result = await ctx.get('ingredients').create({
        name,
        description,
        category,
        is_alcoholic: isAlcoholic,
        alcohol_type_id: alcoholTypeId,
        image_url: imageUrl,
      })

      return result
        .andThen((data) => dto(IngredientSchema, data))
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
      tags: ['Ingredients'],
      summary: 'Update ingredient',
      description: 'Updates an ingredient by its ID. Requires admin role.',
      responses: {
        200: {
          description: 'Updated ingredient',
          content: {
            'application/json': { schema: resolver(IngredientSchema) },
          },
        },
        401: errResponse('Missing or invalid session cookie, or insufficient role'),
        404: errResponse('Ingredient not found'),
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
        category:
          "('spirit'|'liqueur'|'wine'|'beer'|'mixer'|'juice'|'syrup'|'bitter'|'garnish'|'dairy'|'other')?",
        isAlcoholic: 'boolean?',
        alcoholTypeId: 'string?',
        imageUrl: 'string?',
      })
    ),
    async (ctx) => {
      const { id } = ctx.req.valid('param')
      const {
        name,
        description,
        category,
        isAlcoholic,
        alcoholTypeId,
        imageUrl,
      } = ctx.req.valid('json')

      const result = await ctx.get('ingredients').update(id, {
        name,
        description,
        category,
        is_alcoholic: isAlcoholic,
        alcohol_type_id: alcoholTypeId,
        image_url: imageUrl,
      })

      return result
        .andThen((data) => dto(IngredientSchema, data))
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
      tags: ['Ingredients'],
      summary: 'Delete ingredient',
      description: 'Deletes an ingredient by its ID. Requires admin role.',
      responses: {
        200: {
          description: 'Deleted ingredient',
          content: {
            'application/json': { schema: resolver(IngredientSchema) },
          },
        },
        401: errResponse('Missing or invalid session cookie, or insufficient role'),
        404: errResponse('Ingredient not found'),
        500: errResponse('Database error'),
      },
    }),
    isAuth('admin'),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const result = await ctx.get('ingredients').delete(id)

      return result
        .andThen((data) => dto(IngredientSchema, data))
        .match(
          (data) => ctx.json(data, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )

export default ingredientsRoute
