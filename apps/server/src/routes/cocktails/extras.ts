import { type } from 'arktype'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { HonoVar } from 'src/shared/hono'
import { isAuth } from 'src/features/auth/auth.middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import { errorResponses } from 'src/shared/response-schemas'
import {
  CocktailIngredientSchema,
  CocktailPhotoSchema,
  PreparationStepSchema,
  CocktailStyleJunctionSchema,
} from 'src/features/cocktails/cocktails.dto'
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
} from 'src/features/cocktails/extras.service'

const extrasRoute = new HonoVar()

// --- Ingredients ---

extrasRoute
  .get(
    '/:cocktailId/ingredients',
    describeRoute({
      tags: ['Cocktail Ingredients'],
      summary: 'List cocktail ingredients',
      responses: {
        200: {
          description: 'List of cocktail ingredients',
          content: { 'application/json': { schema: resolver(CocktailIngredientSchema.array()) } },
        },
        ...errorResponses,
      },
    }),
    validator('param', type({ cocktailId: 'string' })),
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
    describeRoute({
      tags: ['Cocktail Ingredients'],
      summary: 'Add ingredient to cocktail',
      responses: {
        201: {
          description: 'Ingredient added to cocktail',
          content: { 'application/json': { schema: resolver(CocktailIngredientSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ cocktailId: 'string' })),
    validator(
      'json',
      type({
        ingredientId: 'string',
        quantity: 'string?',
        unit: 'string?',
        notes: 'string?',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { cocktailId } = ctx.req.valid('param')
      const { ingredientId, quantity, unit, notes } = ctx.req.valid('json')

      const result = await createCocktailIngredient(db, {
        cocktail_id: cocktailId,
        ingredient_id: ingredientId,
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
    describeRoute({
      tags: ['Cocktail Ingredients'],
      summary: 'Update cocktail ingredient',
      responses: {
        200: {
          description: 'Updated cocktail ingredient',
          content: { 'application/json': { schema: resolver(CocktailIngredientSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    validator(
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
    describeRoute({
      tags: ['Cocktail Ingredients'],
      summary: 'Remove cocktail ingredient',
      responses: {
        200: {
          description: 'Removed cocktail ingredient',
          content: { 'application/json': { schema: resolver(CocktailIngredientSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
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
    describeRoute({
      tags: ['Cocktail Photos'],
      summary: 'List cocktail photos',
      responses: {
        200: {
          description: 'List of cocktail photos',
          content: { 'application/json': { schema: resolver(CocktailPhotoSchema.array()) } },
        },
        ...errorResponses,
      },
    }),
    validator('param', type({ cocktailId: 'string' })),
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
    describeRoute({
      tags: ['Cocktail Photos'],
      summary: 'Add cocktail photo',
      responses: {
        201: {
          description: 'Cocktail photo added',
          content: { 'application/json': { schema: resolver(CocktailPhotoSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ cocktailId: 'string' })),
    validator(
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
    describeRoute({
      tags: ['Cocktail Photos'],
      summary: 'Delete cocktail photo',
      responses: {
        200: {
          description: 'Deleted cocktail photo',
          content: { 'application/json': { schema: resolver(CocktailPhotoSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
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
    describeRoute({
      tags: ['Preparation Steps'],
      summary: 'List preparation steps',
      responses: {
        200: {
          description: 'List of preparation steps',
          content: { 'application/json': { schema: resolver(PreparationStepSchema.array()) } },
        },
        ...errorResponses,
      },
    }),
    validator('param', type({ cocktailId: 'string' })),
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
    describeRoute({
      tags: ['Preparation Steps'],
      summary: 'Add preparation step',
      responses: {
        201: {
          description: 'Preparation step added',
          content: { 'application/json': { schema: resolver(PreparationStepSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ cocktailId: 'string' })),
    validator(
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
    describeRoute({
      tags: ['Preparation Steps'],
      summary: 'Update preparation step',
      responses: {
        200: {
          description: 'Updated preparation step',
          content: { 'application/json': { schema: resolver(PreparationStepSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    validator(
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
    describeRoute({
      tags: ['Preparation Steps'],
      summary: 'Delete preparation step',
      responses: {
        200: {
          description: 'Deleted preparation step',
          content: { 'application/json': { schema: resolver(PreparationStepSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
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
    describeRoute({
      tags: ['Cocktail Style Links'],
      summary: 'List cocktail style links',
      responses: {
        200: {
          description: 'List of cocktail style links',
          content: { 'application/json': { schema: resolver(CocktailStyleJunctionSchema.array()) } },
        },
        ...errorResponses,
      },
    }),
    validator('param', type({ cocktailId: 'string' })),
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
    describeRoute({
      tags: ['Cocktail Style Links'],
      summary: 'Link style to cocktail',
      responses: {
        201: {
          description: 'Style linked to cocktail',
          content: { 'application/json': { schema: resolver(CocktailStyleJunctionSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ cocktailId: 'string' })),
    validator(
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
    describeRoute({
      tags: ['Cocktail Style Links'],
      summary: 'Unlink style from cocktail',
      responses: {
        200: {
          description: 'Style unlinked from cocktail',
          content: { 'application/json': { schema: resolver(CocktailStyleJunctionSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
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
