import { type } from 'arktype'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { Hono } from 'hono'
import { isAuth } from 'src/features/auth/auth.middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import { dto, errResponse } from 'src/shared/response-schemas'
import {
  CocktailIngredientSchema,
  CocktailIngredientListSchema,
  CocktailPhotoSchema,
  CocktailPhotoListSchema,
  PreparationStepSchema,
  PreparationStepListSchema,
  CocktailStyleJunctionSchema,
  CocktailStyleJunctionListSchema,
} from 'src/features/cocktails/cocktails.dto'
import { extrasService } from 'src/container'
import { provide } from 'src/shared/provide'

const extrasRoute = new Hono()
  .use(provide('extras', extrasService))

// --- Ingredients ---

extrasRoute
  .get(
    '/:cocktailId/ingredients',
    describeRoute({
      tags: ['Cocktail Ingredients'],
      summary: 'List cocktail ingredients',
      description: 'Returns all ingredients linked to a given cocktail.',
      responses: {
        200: {
          description: 'List of cocktail ingredients',
          content: { 'application/json': { schema: resolver(CocktailIngredientListSchema) } },
        },
        500: errResponse('Database error'),
      },
    }),
    validator('param', type({ cocktailId: 'string' })),
    async (ctx) => {
      const { cocktailId } = ctx.req.valid('param')

      const result = await ctx.get('extras').listIngredients(cocktailId)

      return result
        .andThen((data) => dto(CocktailIngredientListSchema, data))
        .match(
          (data) => ctx.json(data, 200),
          (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .post(
    '/:cocktailId/ingredients',
    describeRoute({
      tags: ['Cocktail Ingredients'],
      summary: 'Add ingredient to cocktail',
      description: 'Links an ingredient to a cocktail with optional quantity, unit, and notes. Requires authentication.',
      responses: {
        201: {
          description: 'Ingredient added to cocktail',
          content: { 'application/json': { schema: resolver(CocktailIngredientSchema) } },
        },
        401: errResponse('Missing or invalid session cookie'),
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator('param', type({ cocktailId: 'string' })),
    validator(
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
      const { cocktailId } = ctx.req.valid('param')
      const { ingredientId, ingredientName, quantity, unit, notes } = ctx.req.valid('json')

      if (!ingredientId) {
        return ctx.json({ message: 'ingredientId is required' }, 400)
      }

      const result = await ctx.get('extras').createIngredient({
        cocktail_id: cocktailId,
        ingredient_id: ingredientId,
        // ingredient_name: ingredientName,
        quantity,
        unit,
        notes,
      })

      return result
        .andThen((data) => dto(CocktailIngredientSchema, data))
        .match(
          (data) => ctx.json(data, 201),
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
      description: 'Updates the quantity, unit, or notes of a cocktail ingredient link. Requires authentication.',
      responses: {
        200: {
          description: 'Updated cocktail ingredient',
          content: { 'application/json': { schema: resolver(CocktailIngredientSchema) } },
        },
        401: errResponse('Missing or invalid session cookie'),
        404: errResponse('Cocktail ingredient not found'),
        500: errResponse('Database error'),
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
      const { id } = ctx.req.valid('param')
      const { quantity, unit, notes } = ctx.req.valid('json')

      const result = await ctx.get('extras').updateIngredient(id, { quantity, unit, notes })

      return result
        .andThen((data) => dto(CocktailIngredientSchema, data))
        .match(
          (data) => ctx.json(data, 200),
          (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .delete(
    '/ingredients/:id',
    describeRoute({
      tags: ['Cocktail Ingredients'],
      summary: 'Remove cocktail ingredient',
      description: 'Removes an ingredient from a cocktail. Requires authentication.',
      responses: {
        200: {
          description: 'Removed cocktail ingredient',
          content: { 'application/json': { schema: resolver(CocktailIngredientSchema) } },
        },
        401: errResponse('Missing or invalid session cookie'),
        404: errResponse('Cocktail ingredient not found'),
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const result = await ctx.get('extras').deleteIngredient(id)

      return result
        .andThen((data) => dto(CocktailIngredientSchema, data))
        .match(
          (data) => ctx.json(data, 200),
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
      description: 'Returns all photos associated with a given cocktail.',
      responses: {
        200: {
          description: 'List of cocktail photos',
          content: { 'application/json': { schema: resolver(CocktailPhotoListSchema) } },
        },
        500: errResponse('Database error'),
      },
    }),
    validator('param', type({ cocktailId: 'string' })),
    async (ctx) => {
      const { cocktailId } = ctx.req.valid('param')

      const result = await ctx.get('extras').listPhotos(cocktailId)

      return result
        .andThen((data) => dto(CocktailPhotoListSchema, data))
        .match(
          (data) => ctx.json(data, 200),
          (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .post(
    '/:cocktailId/photos',
    describeRoute({
      tags: ['Cocktail Photos'],
      summary: 'Add cocktail photo',
      description: 'Adds a photo to a cocktail with optional alt text and primary flag. Requires authentication.',
      responses: {
        201: {
          description: 'Cocktail photo added',
          content: { 'application/json': { schema: resolver(CocktailPhotoSchema) } },
        },
        401: errResponse('Missing or invalid session cookie'),
        500: errResponse('Database error'),
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
      const { cocktailId } = ctx.req.valid('param')
      const { url, altText, isPrimary } = ctx.req.valid('json')

      const result = await ctx.get('extras').createPhoto({
        cocktail_id: cocktailId,
        url,
        alt_text: altText,
        is_primary: isPrimary,
      })

      return result
        .andThen((data) => dto(CocktailPhotoSchema, data))
        .match(
          (data) => ctx.json(data, 201),
          (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .delete(
    '/photos/:id',
    describeRoute({
      tags: ['Cocktail Photos'],
      summary: 'Delete cocktail photo',
      description: 'Removes a photo from a cocktail. Requires authentication.',
      responses: {
        200: {
          description: 'Deleted cocktail photo',
          content: { 'application/json': { schema: resolver(CocktailPhotoSchema) } },
        },
        401: errResponse('Missing or invalid session cookie'),
        404: errResponse('Cocktail photo not found'),
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const result = await ctx.get('extras').deletePhoto(id)

      return result
        .andThen((data) => dto(CocktailPhotoSchema, data))
        .match(
          (data) => ctx.json(data, 200),
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
      description: 'Returns all preparation steps for a given cocktail, ordered by step number.',
      responses: {
        200: {
          description: 'List of preparation steps',
          content: { 'application/json': { schema: resolver(PreparationStepListSchema) } },
        },
        500: errResponse('Database error'),
      },
    }),
    validator('param', type({ cocktailId: 'string' })),
    async (ctx) => {
      const { cocktailId } = ctx.req.valid('param')

      const result = await ctx.get('extras').listSteps(cocktailId)

      return result
        .andThen((data) => dto(PreparationStepListSchema, data))
        .match(
          (data) => ctx.json(data, 200),
          (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .post(
    '/:cocktailId/steps',
    describeRoute({
      tags: ['Preparation Steps'],
      summary: 'Add preparation step',
      description: 'Adds a preparation step to a cocktail with step number, instruction, and optional image. Requires authentication.',
      responses: {
        201: {
          description: 'Preparation step added',
          content: { 'application/json': { schema: resolver(PreparationStepSchema) } },
        },
        401: errResponse('Missing or invalid session cookie'),
        500: errResponse('Database error'),
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
      const { cocktailId } = ctx.req.valid('param')
      const { stepNumber, instruction, imageUrl } = ctx.req.valid('json')

      const result = await ctx.get('extras').createStep({
        cocktail_id: cocktailId,
        step_number: stepNumber,
        instruction,
        image_url: imageUrl,
      })

      return result
        .andThen((data) => dto(PreparationStepSchema, data))
        .match(
          (data) => ctx.json(data, 201),
          (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .put(
    '/steps/:id',
    describeRoute({
      tags: ['Preparation Steps'],
      summary: 'Update preparation step',
      description: 'Updates a preparation step by its ID. Requires authentication.',
      responses: {
        200: {
          description: 'Updated preparation step',
          content: { 'application/json': { schema: resolver(PreparationStepSchema) } },
        },
        401: errResponse('Missing or invalid session cookie'),
        404: errResponse('Preparation step not found'),
        500: errResponse('Database error'),
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
      const { id } = ctx.req.valid('param')
      const { stepNumber, instruction, imageUrl } = ctx.req.valid('json')

      const result = await ctx.get('extras').updateStep(id, {
        step_number: stepNumber,
        instruction,
        image_url: imageUrl,
      })

      return result
        .andThen((data) => dto(PreparationStepSchema, data))
        .match(
          (data) => ctx.json(data, 200),
          (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .delete(
    '/steps/:id',
    describeRoute({
      tags: ['Preparation Steps'],
      summary: 'Delete preparation step',
      description: 'Deletes a preparation step by its ID. Requires authentication.',
      responses: {
        200: {
          description: 'Deleted preparation step',
          content: { 'application/json': { schema: resolver(PreparationStepSchema) } },
        },
        401: errResponse('Missing or invalid session cookie'),
        404: errResponse('Preparation step not found'),
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const result = await ctx.get('extras').deleteStep(id)

      return result
        .andThen((data) => dto(PreparationStepSchema, data))
        .match(
          (data) => ctx.json(data, 200),
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
      description: 'Returns all style links for a given cocktail.',
      responses: {
        200: {
          description: 'List of cocktail style links',
          content: { 'application/json': { schema: resolver(CocktailStyleJunctionListSchema) } },
        },
        500: errResponse('Database error'),
      },
    }),
    validator('param', type({ cocktailId: 'string' })),
    async (ctx) => {
      const { cocktailId } = ctx.req.valid('param')

      const result = await ctx.get('extras').listStyleLinks(cocktailId)

      return result
        .andThen((data) => dto(CocktailStyleJunctionListSchema, data))
        .match(
          (data) => ctx.json(data, 200),
          (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .post(
    '/:cocktailId/style-links',
    describeRoute({
      tags: ['Cocktail Style Links'],
      summary: 'Link style to cocktail',
      description: 'Associates a cocktail style with a cocktail. Requires authentication.',
      responses: {
        201: {
          description: 'Style linked to cocktail',
          content: { 'application/json': { schema: resolver(CocktailStyleJunctionSchema) } },
        },
        401: errResponse('Missing or invalid session cookie'),
        500: errResponse('Database error'),
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
      const { cocktailId } = ctx.req.valid('param')
      const { styleId } = ctx.req.valid('json')

      const result = await ctx.get('extras').addStyle({
        cocktail_id: cocktailId,
        style_id: styleId,
      })

      return result
        .andThen((data) => dto(CocktailStyleJunctionSchema, data))
        .match(
          (data) => ctx.json(data, 201),
          (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .delete(
    '/style-links/:id',
    describeRoute({
      tags: ['Cocktail Style Links'],
      summary: 'Unlink style from cocktail',
      description: 'Removes a style association from a cocktail. Requires authentication.',
      responses: {
        200: {
          description: 'Style unlinked from cocktail',
          content: { 'application/json': { schema: resolver(CocktailStyleJunctionSchema) } },
        },
        401: errResponse('Missing or invalid session cookie'),
        404: errResponse('Cocktail style link not found'),
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const result = await ctx.get('extras').removeStyle(id)

      return result
        .andThen((data) => dto(CocktailStyleJunctionSchema, data))
        .match(
          (data) => ctx.json(data, 200),
          (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )

export default extrasRoute
