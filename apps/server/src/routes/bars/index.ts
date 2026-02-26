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
  BarSignatureCocktailSchema,
} from 'src/features/bars/bars.dto'
import {
  createBar,
  createBarPhoto,
  createBarSignatureCocktail,
  deleteBar,
  deleteBarPhoto,
  deleteBarSignatureCocktail,
  getBarByIdOrSlug,
  listBarLikes,
  listBarPhotos,
  listBars,
  listBarSignatureCocktails,
  toggleBarLike,
  updateBar,
} from 'src/features/bars/bars.service'
import { errorToHttpStatus } from 'src/shared/errors'
import { errorResponses } from 'src/shared/response-schemas'
import reviewsRoute from './reviews'

const barsRoute = new Hono().basePath('/bars')

// --- Bars CRUD ---

barsRoute
  .get(
    '/',
    describeRoute({
      tags: ['Bars'],
      summary: 'List bars',
      responses: {
        200: {
          description: 'Paginated list of bars',
          content: {
            'application/json': { schema: resolver(BarListPaginatedSchema) },
          },
        },
        ...errorResponses,
      },
    }),
    validator('query', BarListQuerySchema),
    async (ctx) => {
      const db = ctx.get('database')
      const { page = 1, city, style, search } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await listBars(db, page, pageSize, { city, style, search })

      return result.match(
        (bars) => ctx.json(bars, 200),
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .get(
    '/:idOrSlug',
    describeRoute({
      tags: ['Bars'],
      summary: 'Get bar by ID or slug',
      responses: {
        200: {
          description: 'Bar details',
          content: {
            'application/json': { schema: resolver(BarDetailSchema) },
          },
        },
        ...errorResponses,
      },
    }),
    optionalAuth(),
    validator('param', type({ idOrSlug: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { idOrSlug } = ctx.req.valid('param')
      const payload = ctx.get('userPayload')

      const result = await getBarByIdOrSlug(
        db,
        idOrSlug,
        payload?.sub.id ?? null
      )

      return result.match(
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
      responses: {
        201: {
          description: 'Created bar',
          content: {
            'application/json': { schema: resolver(BarDetailSchema) },
          },
        },
        ...errorResponses,
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
        'postalCode?': 'string',
        'country?': 'string',
        'latitude?': 'number',
        'longitude?': 'number',
        'phone?': 'string',
        'website?': 'string',
        'style?':
          "'classic' | 'speakeasy' | 'tiki' | 'rooftop' | 'dive' | 'wine_bar' | 'cocktail_lounge' | 'sports_bar' | 'brewpub' | 'other'",
        'photos?': type({
          url: 'string >= 1',
          'altText?': 'string',
          'isPrimary?': 'boolean',
        }).array(),
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const payload = ctx.get('userPayload')
      const data = ctx.req.valid('json')

      const result = await createBar(
        db,
        {
          name: data.name,
          slug: data.slug,
          description: data.description,
          address: data.address,
          city: data.city,
          postal_code: data.postalCode,
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

      return result.match(
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
      responses: {
        200: {
          description: 'Updated bar',
          content: {
            'application/json': { schema: resolver(BarDetailSchema) },
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
        'name?': 'string >= 1',
        'slug?': 'string >= 1',
        'description?': 'string',
        'address?': 'string',
        'city?': 'string',
        'postalCode?': 'string',
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
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')
      const payload = ctx.get('userPayload')
      const data = ctx.req.valid('json')

      const result = await updateBar(db, id, payload.sub.id, {
        name: data.name,
        slug: data.slug,
        description: data.description,
        address: data.address,
        city: data.city,
        postal_code: data.postalCode,
        country: data.country,
        latitude: data.latitude,
        longitude: data.longitude,
        phone: data.phone,
        website: data.website,
        style: data.style,
      })

      return result.match(
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
      responses: {
        200: {
          description: 'Soft-deleted bar',
          content: {
            'application/json': { schema: resolver(BarDetailSchema) },
          },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')
      const payload = ctx.get('userPayload')

      const result = await deleteBar(db, id, payload.sub.id)

      return result.match(
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
      responses: {
        200: {
          description: 'List of bar photos',
          content: {
            'application/json': { schema: resolver(BarPhotoSchema.array()) },
          },
        },
        ...errorResponses,
      },
    }),
    validator('param', type({ barId: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { barId } = ctx.req.valid('param')

      const result = await listBarPhotos(db, barId)

      return result.match(
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
      responses: {
        201: {
          description: 'Created bar photo',
          content: { 'application/json': { schema: resolver(BarPhotoSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ barId: 'string' })),
    validator(
      'json',
      type({
        url: 'string >= 1',
        'altText?': 'string',
        'isPrimary?': 'boolean',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { barId } = ctx.req.valid('param')
      const data = ctx.req.valid('json')

      const payload = ctx.get('userPayload')

      const result = await createBarPhoto(
        db,
        {
          bar_id: barId,
          url: data.url,
          alt_text: data.altText,
          is_primary: data.isPrimary,
        },
        payload.sub.id
      )

      return result.match(
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
      responses: {
        200: {
          description: 'Deleted bar photo',
          content: { 'application/json': { schema: resolver(BarPhotoSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ barId: 'string', id: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { barId, id } = ctx.req.valid('param')
      const payload = ctx.get('userPayload')

      const result = await deleteBarPhoto(db, barId, id, payload.sub.id)

      return result.match(
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
      responses: {
        200: {
          description: 'List of bar signature cocktails',
          content: {
            'application/json': {
              schema: resolver(BarSignatureCocktailSchema.array()),
            },
          },
        },
        ...errorResponses,
      },
    }),
    validator('param', type({ barId: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { barId } = ctx.req.valid('param')

      const result = await listBarSignatureCocktails(db, barId)

      return result.match(
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
      responses: {
        201: {
          description: 'Created bar signature cocktail',
          content: {
            'application/json': {
              schema: resolver(BarSignatureCocktailSchema),
            },
          },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ barId: 'string' })),
    validator(
      'json',
      type({
        cocktailId: 'string >= 1',
        'price?': 'string',
        'currency?': 'string',
        'isAvailable?': 'boolean',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { barId } = ctx.req.valid('param')
      const data = ctx.req.valid('json')

      const payload = ctx.get('userPayload')

      const result = await createBarSignatureCocktail(
        db,
        {
          bar_id: barId,
          cocktail_id: data.cocktailId,
          price: data.price,
          currency: data.currency,
          is_available: data.isAvailable,
        },
        payload.sub.id
      )

      return result.match(
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
      responses: {
        200: {
          description: 'Removed bar signature cocktail',
          content: {
            'application/json': {
              schema: resolver(BarSignatureCocktailSchema),
            },
          },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ barId: 'string', id: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { barId, id } = ctx.req.valid('param')
      const payload = ctx.get('userPayload')

      const result = await deleteBarSignatureCocktail(
        db,
        barId,
        id,
        payload.sub.id
      )

      return result.match(
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
      responses: {
        200: {
          description: 'Paginated list of bar likes',
          content: {
            'application/json': { schema: resolver(BarLikePaginatedSchema) },
          },
        },
        ...errorResponses,
      },
    }),
    validator('param', type({ barId: 'string' })),
    validator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { barId } = ctx.req.valid('param')
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await listBarLikes(db, barId, page, pageSize)

      return result.match(
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
      responses: {
        200: {
          description: 'Like toggle result',
          content: {
            'application/json': { schema: resolver(BarLikeToggleSchema) },
          },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ barId: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { barId } = ctx.req.valid('param')
      const payload = ctx.get('userPayload')

      const result = await toggleBarLike(db, barId, payload.sub.id)

      return result.match(
        (toggle) => ctx.json(toggle, 200),
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .route('/', reviewsRoute)

export default barsRoute
