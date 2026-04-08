import { type } from 'arktype'
import { Hono } from 'hono'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { env } from 'hono/adapter'
import { isAuth, optionalAuth } from 'src/features/auth/auth.middleware'
import {
  BarDetailSchema,
  BarLikePaginatedSchema,
  BarLikeToggleSchema,
  BarListPaginatedSchema,
  BarListQuerySchema,
  BarPhotoSchema,
  BarPhotoListSchema,
  BarSignatureCocktailSchema,
  BarSignatureCocktailListSchema,
} from 'src/features/bars/bars.dto'
import { errorToHttpStatus } from 'src/shared/errors'
import { dto, errResponse } from 'src/shared/response-schemas'
import { barsService } from 'src/container'
import { provide } from 'src/shared/provide'
import reviewsRoute from './reviews'
import { usersService } from 'src/container'

const barsRoute = new Hono()
  .basePath('/bars')
  .use(provide('bars', barsService))

async function requireBarOwnerAccount(userId: string) {
  const userResult = await usersService.getById(userId)
  if (userResult.isErr() || !userResult.value.is_bar_owner) {
    return false
  }
  return true
}

// --- Bars CRUD ---

barsRoute
  .get(
    '/',
    describeRoute({
      tags: ['Bars'],
      summary: 'List bars',
      description: 'Returns a paginated list of bars with optional filters by city, style, or search term.',
      responses: {
        200: {
          description: 'Paginated list of bars',
          content: {
            'application/json': { schema: resolver(BarListPaginatedSchema) },
          },
        },
        500: errResponse('Database error'),
      },
    }),
    validator('query', BarListQuerySchema),
    async (ctx) => {
      const { page = 1, city, style, search, owner_id } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await ctx.get('bars').list(page, pageSize, { city, style, search, ownerId: owner_id })

      return result
        .andThen((bars) => dto(BarListPaginatedSchema, bars))
        .match(
          (bars) => ctx.json(bars, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .get(
    '/:id',
    describeRoute({
      tags: ['Bars'],
      summary: 'Get bar by ID',
      description: 'Returns full bar details including photos, reviews, and like status for the authenticated user.',
      responses: {
        200: {
          description: 'Bar details',
          content: {
            'application/json': { schema: resolver(BarDetailSchema) },
          },
        },
        404: errResponse('Bar not found'),
        500: errResponse('Database error'),
      },
    }),
    optionalAuth(),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')
      const payload = ctx.get('userPayload')

      const result = await ctx.get('bars').getById(
        id,
        payload?.sub.id ?? null
      )

      return result
        .andThen((bar) => dto(BarDetailSchema, bar))
        .match(
          (bar) => ctx.json(bar, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .post(
    '/',
    describeRoute({
      tags: ['Bars'],
      summary: 'Create bar',
      description: 'Creates a new bar with optional photos. The authenticated user becomes the owner.',
      responses: {
        201: {
          description: 'Created bar',
          content: {
            'application/json': { schema: resolver(BarDetailSchema) },
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
        name: 'string >= 1',
        slug: 'string >= 1',
        'description?': 'string',
        'address?': 'string',
        'city?': 'string',
        'postal_code?': 'string',
        'country?': 'string',
        'latitude?': 'number',
        'longitude?': 'number',
        'phone?': 'string',
        'website?': 'string',
        'style?':
          "'classic' | 'speakeasy' | 'tiki' | 'rooftop' | 'dive' | 'wine_bar' | 'cocktail_lounge' | 'sports_bar' | 'brewpub' | 'other'",
        'photos?': type({
          url: 'string >= 1',
          'alt_text?': 'string',
          'is_primary?': 'boolean',
        }).array(),
      })
    ),
    async (ctx) => {
      const payload = ctx.get('userPayload')
      const data = ctx.req.valid('json')

      if (!(await requireBarOwnerAccount(payload.sub.id))) {
        return ctx.json(
          { message: 'Compte bar requis pour creer un bar.' },
          403
        )
      }

      const result = await ctx.get('bars').create(
        {
          name: data.name,
          slug: data.slug,
          description: data.description,
          address: data.address,
          city: data.city,
          postal_code: data.postal_code,
          country: data.country,
          latitude: data.latitude,
          longitude: data.longitude,
          phone: data.phone,
          website: data.website,
          style: data.style,
          owner_id: payload.sub.id,
        },
        data.photos
      )

      return result
        .andThen((bar) => dto(BarDetailSchema, bar))
        .match(
          (bar) => ctx.json(bar, 201),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .put(
    '/:id',
    describeRoute({
      tags: ['Bars'],
      summary: 'Update bar',
      description: 'Updates bar details. Only the bar owner can perform this action.',
      responses: {
        200: {
          description: 'Updated bar',
          content: {
            'application/json': { schema: resolver(BarDetailSchema) },
          },
        },
        401: errResponse('Missing or invalid session cookie'),
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    validator(
      'json',
      type({
        'name?': 'string >= 1',
        'slug?': 'string >= 1',
        'description?': 'string',
        'address?': 'string',
        'city?': 'string',
        'postal_code?': 'string',
        'country?': 'string',
        'latitude?': 'number',
        'longitude?': 'number',
        'phone?': 'string',
        'website?': 'string',
        'style?':
          "'classic' | 'speakeasy' | 'tiki' | 'rooftop' | 'dive' | 'wine_bar' | 'cocktail_lounge' | 'sports_bar' | 'brewpub' | 'other'",
      })
    ),
    async (ctx) => {
      const { id } = ctx.req.valid('param')
      const payload = ctx.get('userPayload')
      const data = ctx.req.valid('json')

      if (!(await requireBarOwnerAccount(payload.sub.id))) {
        return ctx.json(
          { message: 'Compte bar requis pour modifier un bar.' },
          403
        )
      }

      const result = await ctx.get('bars').update(id, payload.sub.id, data)

      return result
        .andThen((bar) => dto(BarDetailSchema, bar))
        .match(
          (bar) => ctx.json(bar, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .delete(
    '/:id',
    describeRoute({
      tags: ['Bars'],
      summary: 'Delete bar (soft)',
      description: 'Soft-deletes a bar by marking it as deleted. Only the bar owner can perform this action.',
      responses: {
        200: {
          description: 'Soft-deleted bar',
          content: {
            'application/json': { schema: resolver(BarDetailSchema) },
          },
        },
        401: errResponse('Missing or invalid session cookie'),
        404: errResponse('Bar not found'),
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')
      const payload = ctx.get('userPayload')

      const result = await ctx.get('bars').delete(id, payload.sub.id)

      return result
        .andThen((bar) => dto(BarDetailSchema, bar))
        .match(
          (bar) => ctx.json(bar, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )

// --- Bar Photos ---

barsRoute
  .get(
    '/:barId/photos',
    describeRoute({
      tags: ['Bar Photos'],
      summary: 'List bar photos',
      description: 'Returns all photos associated with a given bar.',
      responses: {
        200: {
          description: 'List of bar photos',
          content: {
            'application/json': { schema: resolver(BarPhotoListSchema) },
          },
        },
        500: errResponse('Database error'),
      },
    }),
    validator('param', type({ barId: 'string' })),
    async (ctx) => {
      const { barId } = ctx.req.valid('param')

      const result = await ctx.get('bars').listPhotos(barId)

      return result
        .andThen((photos) => dto(BarPhotoListSchema, photos))
        .match(
          (photos) => ctx.json(photos, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .post(
    '/:barId/photos',
    describeRoute({
      tags: ['Bar Photos'],
      summary: 'Add bar photo',
      description: 'Uploads a photo to a bar. Requires authentication and bar ownership.',
      responses: {
        201: {
          description: 'Created bar photo',
          content: { 'application/json': { schema: resolver(BarPhotoSchema) } },
        },
        401: errResponse('Missing or invalid session cookie'),
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator('param', type({ barId: 'string' })),
    validator(
      'json',
      type({
        url: 'string >= 1',
        'alt_text?': 'string',
        'is_primary?': 'boolean',
      })
    ),
    async (ctx) => {
      const { barId } = ctx.req.valid('param')
      const data = ctx.req.valid('json')

      const payload = ctx.get('userPayload')

      if (!(await requireBarOwnerAccount(payload.sub.id))) {
        return ctx.json(
          { message: 'Compte bar requis pour gerer les photos du bar.' },
          403
        )
      }

      const result = await ctx.get('bars').createPhoto(
        {
          bar_id: barId,
          url: data.url,
          alt_text: data.alt_text,
          is_primary: data.is_primary,
        },
        payload.sub.id
      )

      return result
        .andThen((photo) => dto(BarPhotoSchema, photo))
        .match(
          (photo) => ctx.json(photo, 201),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .delete(
    '/:barId/photos/:id',
    describeRoute({
      tags: ['Bar Photos'],
      summary: 'Delete bar photo',
      description: 'Removes a photo from a bar. Requires authentication and bar ownership.',
      responses: {
        200: {
          description: 'Deleted bar photo',
          content: { 'application/json': { schema: resolver(BarPhotoSchema) } },
        },
        401: errResponse('Missing or invalid session cookie'),
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator('param', type({ barId: 'string', id: 'string' })),
    async (ctx) => {
      const { barId, id } = ctx.req.valid('param')
      const payload = ctx.get('userPayload')

      const result = await ctx.get('bars').deletePhoto(barId, id, payload.sub.id)

      return result
        .andThen((photo) => dto(BarPhotoSchema, photo))
        .match(
          (photo) => ctx.json(photo, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )

// --- Bar Signature Cocktails ---

barsRoute
  .get(
    '/:barId/signature-cocktails',
    describeRoute({
      tags: ['Bar Signature Cocktails'],
      summary: 'List bar signature cocktails',
      description: 'Returns the list of signature cocktails for a given bar.',
      responses: {
        200: {
          description: 'List of bar signature cocktails',
          content: {
            'application/json': {
              schema: resolver(BarSignatureCocktailListSchema),
            },
          },
        },
        500: errResponse('Database error'),
      },
    }),
    validator('param', type({ barId: 'string' })),
    async (ctx) => {
      const { barId } = ctx.req.valid('param')

      const result = await ctx.get('bars').listSignatureCocktails(barId)

      return result
        .andThen((cocktails) => dto(BarSignatureCocktailListSchema, cocktails))
        .match(
          (cocktails) => ctx.json(cocktails, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .post(
    '/:barId/signature-cocktails',
    describeRoute({
      tags: ['Bar Signature Cocktails'],
      summary: 'Add bar signature cocktail',
      description: 'Links a cocktail as a signature item for a bar with optional price and availability. Requires authentication and bar ownership.',
      responses: {
        201: {
          description: 'Created bar signature cocktail',
          content: {
            'application/json': {
              schema: resolver(BarSignatureCocktailSchema),
            },
          },
        },
        401: errResponse('Missing or invalid session cookie'),
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator('param', type({ barId: 'string' })),
    validator(
      'json',
      type({
        cocktail_id: 'string >= 1',
        'price?': 'string',
        'currency?': 'string',
        'is_available?': 'boolean',
      })
    ),
    async (ctx) => {
      const { barId } = ctx.req.valid('param')
      const data = ctx.req.valid('json')

      const payload = ctx.get('userPayload')

      if (!(await requireBarOwnerAccount(payload.sub.id))) {
        return ctx.json(
          {
            message:
              'Compte bar requis pour gerer les cocktails signature du bar.',
          },
          403
        )
      }

      const result = await ctx.get('bars').createSignatureCocktail(
        {
          bar_id: barId,
          cocktail_id: data.cocktail_id,
          price: data.price,
          currency: data.currency,
          is_available: data.is_available,
        },
        payload.sub.id
      )

      return result
        .andThen((cocktail) => dto(BarSignatureCocktailSchema, cocktail))
        .match(
          (cocktail) => ctx.json(cocktail, 201),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .delete(
    '/:barId/signature-cocktails/:id',
    describeRoute({
      tags: ['Bar Signature Cocktails'],
      summary: 'Remove bar signature cocktail',
      description: 'Removes a cocktail from a bar\'s signature list. Requires authentication and bar ownership.',
      responses: {
        200: {
          description: 'Removed bar signature cocktail',
          content: {
            'application/json': {
              schema: resolver(BarSignatureCocktailSchema),
            },
          },
        },
        401: errResponse('Missing or invalid session cookie'),
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator('param', type({ barId: 'string', id: 'string' })),
    async (ctx) => {
      const { barId, id } = ctx.req.valid('param')
      const payload = ctx.get('userPayload')

      const result = await ctx.get('bars').deleteSignatureCocktail(
        barId,
        id,
        payload.sub.id
      )

      return result
        .andThen((cocktail) => dto(BarSignatureCocktailSchema, cocktail))
        .match(
          (cocktail) => ctx.json(cocktail, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )

// --- Bar Likes ---

barsRoute
  .get(
    '/:barId/likes',
    describeRoute({
      tags: ['Bar Likes'],
      summary: 'List bar likes',
      description: 'Returns a paginated list of likes for a given bar.',
      responses: {
        200: {
          description: 'Paginated list of bar likes',
          content: {
            'application/json': { schema: resolver(BarLikePaginatedSchema) },
          },
        },
        500: errResponse('Database error'),
      },
    }),
    validator('param', type({ barId: 'string' })),
    validator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const { barId } = ctx.req.valid('param')
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await ctx.get('bars').listLikes(barId, page, pageSize)

      return result
        .andThen((likes) => dto(BarLikePaginatedSchema, likes))
        .match(
          (likes) => ctx.json(likes, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .post(
    '/:barId/likes/toggle',
    describeRoute({
      tags: ['Bar Likes'],
      summary: 'Toggle bar like',
      description: 'Toggles the like status for the authenticated user on a bar. Adds a like if not present, removes it otherwise.',
      responses: {
        200: {
          description: 'Like toggle result',
          content: {
            'application/json': { schema: resolver(BarLikeToggleSchema) },
          },
        },
        401: errResponse('Missing or invalid session cookie'),
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator('param', type({ barId: 'string' })),
    async (ctx) => {
      const { barId } = ctx.req.valid('param')
      const payload = ctx.get('userPayload')

      const result = await ctx.get('bars').toggleLike(barId, payload.sub.id)

      return result
        .andThen((toggle) => dto(BarLikeToggleSchema, toggle))
        .match(
          (toggle) => ctx.json(toggle, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .route('/', reviewsRoute)

export default barsRoute
