import { sValidator } from '@hono/standard-validator'
import { type } from 'arktype'
import { env } from 'hono/adapter'
import { HonoVar } from 'src/shared/hono'
import { isAuth } from 'src/features/auth/auth.middleware'
import { errorToHttpStatus } from 'src/shared/errors'
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
    sValidator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await listIngredients(db, page, pageSize)

      return result.match(
        (ingredientList) => ctx.json(ingredientList, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .get('/:id', sValidator('param', type({ id: 'string' })), async (ctx) => {
    const db = ctx.get('database')
    const { id } = ctx.req.valid('param')

    const result = await getIngredientById(db, id)

    return result.match(
      (ingredient) => ctx.json(ingredient, 200),
      (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
    )
  })
  .post(
    '/create',
    isAuth('admin'),
    sValidator(
      'json',
      type({
        name: 'string >= 1',
        description: 'string?',
        category: "'spirit'|'liqueur'|'wine'|'beer'|'mixer'|'juice'|'syrup'|'bitter'|'garnish'|'dairy'|'other'",
        isAlcoholic: 'boolean?',
        alcoholTypeId: 'string?',
        imageUrl: 'string?',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { name, description, category, isAlcoholic, alcoholTypeId, imageUrl } = ctx.req.valid('json')

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
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .put(
    '/:id',
    isAuth('admin'),
    sValidator('param', type({ id: 'string' })),
    sValidator(
      'json',
      type({
        name: 'string >= 1?',
        description: 'string?',
        category: "('spirit'|'liqueur'|'wine'|'beer'|'mixer'|'juice'|'syrup'|'bitter'|'garnish'|'dairy'|'other')?",
        isAlcoholic: 'boolean?',
        alcoholTypeId: 'string?',
        imageUrl: 'string?',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')
      const { name, description, category, isAlcoholic, alcoholTypeId, imageUrl } = ctx.req.valid('json')

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
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .delete(
    '/:id',
    isAuth('admin'),
    sValidator('param', type({ id: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')

      const result = await deleteIngredient(db, id)

      return result.match(
        (deletedIngredient) => ctx.json(deletedIngredient, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

export default ingredientsRoute
