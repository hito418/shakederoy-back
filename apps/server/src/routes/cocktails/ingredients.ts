import { type } from 'arktype'
import { env } from 'hono/adapter'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { HonoVar } from 'src/shared/hono'
import { isAuth } from 'src/features/auth/auth.middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import { errorResponses } from 'src/shared/response-schemas'
import {
  IngredientSchema,
  IngredientPaginatedSchema,
} from 'src/features/cocktails/cocktails.dto'
import {
  listIngredients,
  getIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient,
} from 'src/features/cocktails/ingredients.service'

const ingredientsRoute = new HonoVar().basePath('/ingredients')

ingredientsRoute
  .get(
    '/',
    describeRoute({
      tags: ['Ingredients'],
      summary: 'List ingredients',
      responses: {
        200: {
          description: 'Paginated list of ingredients',
          content: {
            'application/json': { schema: resolver(IngredientPaginatedSchema) },
          },
        },
        ...errorResponses,
      },
    }),
    validator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await listIngredients(db, page, pageSize)

      return result.match(
        (ingredientList) => ctx.json(ingredientList, 200),
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
      responses: {
        200: {
          description: 'Ingredient details',
          content: {
            'application/json': { schema: resolver(IngredientSchema) },
          },
        },
        ...errorResponses,
      },
    }),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')

      const result = await getIngredientById(db, id)

      return result.match(
        (ingredient) => ctx.json(ingredient, 200),
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
      responses: {
        201: {
          description: 'Created ingredient',
          content: {
            'application/json': { schema: resolver(IngredientSchema) },
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
        description: 'string?',
        category:
          "'spirit'|'liqueur'|'wine'|'beer'|'mixer'|'juice'|'syrup'|'bitter'|'garnish'|'dairy'|'other'",
        isAlcoholic: 'boolean?',
        alcoholTypeId: 'string?',
        imageUrl: 'string?',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const {
        name,
        description,
        category,
        isAlcoholic,
        alcoholTypeId,
        imageUrl,
      } = ctx.req.valid('json')

      const result = await createIngredient(db, {
        name,
        description,
        category,
        is_alcoholic: isAlcoholic,
        alcohol_type_id: alcoholTypeId,
        image_url: imageUrl,
      })

      return result.match(
        (newIngredient) => ctx.json(newIngredient, 201),
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
      responses: {
        200: {
          description: 'Updated ingredient',
          content: {
            'application/json': { schema: resolver(IngredientSchema) },
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
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')
      const {
        name,
        description,
        category,
        isAlcoholic,
        alcoholTypeId,
        imageUrl,
      } = ctx.req.valid('json')

      const result = await updateIngredient(db, id, {
        name,
        description,
        category,
        is_alcoholic: isAlcoholic,
        alcohol_type_id: alcoholTypeId,
        image_url: imageUrl,
      })

      return result.match(
        (updatedIngredient) => ctx.json(updatedIngredient, 200),
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
      responses: {
        200: {
          description: 'Deleted ingredient',
          content: {
            'application/json': { schema: resolver(IngredientSchema) },
          },
        },
        ...errorResponses,
      },
    }),
    isAuth('admin'),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')

      const result = await deleteIngredient(db, id)

      return result.match(
        (deletedIngredient) => ctx.json(deletedIngredient, 200),
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

export default ingredientsRoute
