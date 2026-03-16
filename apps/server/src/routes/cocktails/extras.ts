import { sValidator } from '@hono/standard-validator'
import { type } from 'arktype'
import { HonoVar } from 'src/shared/hono'
import { isAuth } from 'src/features/auth/middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import {
  listCocktailIngredients,
  createCocktailIngredient,
  updateCocktailIngredient,
  deleteCocktailIngredient,
  listCocktailPhotos,
  createCocktailPhoto,
  deleteCocktailPhoto,
  listPreparationSteps,
  createPreparationStep,
  updatePreparationStep,
  deletePreparationStep,
  listCocktailStyleLinks,
  addCocktailStyle,
  removeCocktailStyle,
} from 'src/features/cocktails/extras/service'

const extrasRoute = new HonoVar()

// --- Ingredients ---

extrasRoute
  .get(
    '/:cocktailId/ingredients',
    sValidator('param', type({ cocktailId: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { cocktailId } = ctx.req.valid('param')

      const result = await listCocktailIngredients(db, cocktailId)

      return result.match(
        (items) => ctx.json(items, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .post(
    '/:cocktailId/ingredients',
    isAuth(),
    sValidator('param', type({ cocktailId: 'string' })),
    sValidator(
      'json',
      type({
        'ingredientId?': 'string',
        'ingredientName?': 'string >= 1',
        quantity: 'string?',
        unit: 'string?',
        notes: 'string?',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { cocktailId } = ctx.req.valid('param')
      const { ingredientId, ingredientName, quantity, unit, notes } = ctx.req.valid('json')

      const result = await createCocktailIngredient(db, {
        cocktail_id: cocktailId,
        ingredient_id: ingredientId,
        ingredient_name: ingredientName,
        quantity,
        unit,
        notes,
      })

      return result.match(
        (item) => ctx.json(item, 201),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

extrasRoute
  .put(
    '/ingredients/:id',
    isAuth(),
    sValidator('param', type({ id: 'string' })),
    sValidator(
      'json',
      type({
        quantity: 'string?',
        unit: 'string?',
        notes: 'string?',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')
      const { quantity, unit, notes } = ctx.req.valid('json')

      const result = await updateCocktailIngredient(db, id, { quantity, unit, notes })

      return result.match(
        (item) => ctx.json(item, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .delete(
    '/ingredients/:id',
    isAuth(),
    sValidator('param', type({ id: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')

      const result = await deleteCocktailIngredient(db, id)

      return result.match(
        (item) => ctx.json(item, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

// --- Photos ---

  .get(
    '/:cocktailId/photos',
    sValidator('param', type({ cocktailId: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { cocktailId } = ctx.req.valid('param')

      const result = await listCocktailPhotos(db, cocktailId)

      return result.match(
        (items) => ctx.json(items, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .post(
    '/:cocktailId/photos',
    isAuth(),
    sValidator('param', type({ cocktailId: 'string' })),
    sValidator(
      'json',
      type({
        url: 'string.url',
        altText: 'string?',
        isPrimary: 'boolean?',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { cocktailId } = ctx.req.valid('param')
      const { url, altText, isPrimary } = ctx.req.valid('json')

      const result = await createCocktailPhoto(db, {
        cocktail_id: cocktailId,
        url,
        alt_text: altText,
        is_primary: isPrimary,
      })

      return result.match(
        (item) => ctx.json(item, 201),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .delete(
    '/photos/:id',
    isAuth(),
    sValidator('param', type({ id: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')

      const result = await deleteCocktailPhoto(db, id)

      return result.match(
        (item) => ctx.json(item, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

// --- Preparation Steps ---

  .get(
    '/:cocktailId/steps',
    sValidator('param', type({ cocktailId: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { cocktailId } = ctx.req.valid('param')

      const result = await listPreparationSteps(db, cocktailId)

      return result.match(
        (items) => ctx.json(items, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .post(
    '/:cocktailId/steps',
    isAuth(),
    sValidator('param', type({ cocktailId: 'string' })),
    sValidator(
      'json',
      type({
        stepNumber: 'number',
        instruction: 'string',
        imageUrl: 'string?',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { cocktailId } = ctx.req.valid('param')
      const { stepNumber, instruction, imageUrl } = ctx.req.valid('json')

      const result = await createPreparationStep(db, {
        cocktail_id: cocktailId,
        step_number: stepNumber,
        instruction,
        image_url: imageUrl,
      })

      return result.match(
        (item) => ctx.json(item, 201),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .put(
    '/steps/:id',
    isAuth(),
    sValidator('param', type({ id: 'string' })),
    sValidator(
      'json',
      type({
        stepNumber: 'number?',
        instruction: 'string?',
        imageUrl: 'string?',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')
      const { stepNumber, instruction, imageUrl } = ctx.req.valid('json')

      const result = await updatePreparationStep(db, id, {
        step_number: stepNumber,
        instruction,
        image_url: imageUrl,
      })

      return result.match(
        (item) => ctx.json(item, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .delete(
    '/steps/:id',
    isAuth(),
    sValidator('param', type({ id: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')

      const result = await deletePreparationStep(db, id)

      return result.match(
        (item) => ctx.json(item, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

// --- Style Links ---

  .get(
    '/:cocktailId/style-links',
    sValidator('param', type({ cocktailId: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { cocktailId } = ctx.req.valid('param')

      const result = await listCocktailStyleLinks(db, cocktailId)

      return result.match(
        (items) => ctx.json(items, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .post(
    '/:cocktailId/style-links',
    isAuth(),
    sValidator('param', type({ cocktailId: 'string' })),
    sValidator(
      'json',
      type({
        styleId: 'string',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { cocktailId } = ctx.req.valid('param')
      const { styleId } = ctx.req.valid('json')

      const result = await addCocktailStyle(db, {
        cocktail_id: cocktailId,
        style_id: styleId,
      })

      return result.match(
        (item) => ctx.json(item, 201),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .delete(
    '/style-links/:id',
    isAuth(),
    sValidator('param', type({ id: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')

      const result = await removeCocktailStyle(db, id)

      return result.match(
        (item) => ctx.json(item, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

export default extrasRoute
