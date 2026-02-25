import { sValidator } from '@hono/standard-validator'
import { type } from 'arktype'
import { env } from 'hono/adapter'
import { HonoVar } from 'src/shared/hono'
import { isAuth } from 'src/features/auth/middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import {
  listBars,
  getBarById,
  createBar,
  updateBar,
  deleteBar,
  listBarPhotos,
  createBarPhoto,
  deleteBarPhoto,
  listBarSignatureCocktails,
  createBarSignatureCocktail,
  deleteBarSignatureCocktail,
  listBarLikes,
  toggleBarLike,
} from 'src/features/bars/service'
import reviewsRoute from './reviews'

const barsRoute = new HonoVar().basePath('/bars')

// --- Bars CRUD ---

barsRoute
  .get(
    '/',
    sValidator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await listBars(db, page, pageSize)

      return result.match(
        (bars) => ctx.json(bars, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .get('/:id', sValidator('param', type({ id: 'string' })), async (ctx) => {
    const db = ctx.get('database')
    const { id } = ctx.req.valid('param')

    const result = await getBarById(db, id)

    return result.match(
      (bar) => ctx.json(bar, 200),
      (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
    )
  })
  .post(
    '/create',
    isAuth(),
    sValidator(
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
        'style?': "'classic' | 'speakeasy' | 'tiki' | 'rooftop' | 'dive' | 'wine_bar' | 'cocktail_lounge' | 'sports_bar' | 'brewpub' | 'other'",
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const payload = ctx.get('userPayload')
      const data = ctx.req.valid('json')

      const result = await createBar(db, {
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
      })

      return result.match(
        (bar) => ctx.json(bar, 201),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .put(
    '/:id',
    isAuth(),
    sValidator('param', type({ id: 'string' })),
    sValidator(
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
        'style?': "'classic' | 'speakeasy' | 'tiki' | 'rooftop' | 'dive' | 'wine_bar' | 'cocktail_lounge' | 'sports_bar' | 'brewpub' | 'other'",
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
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .delete(
    '/:id',
    isAuth(),
    sValidator('param', type({ id: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')
      const payload = ctx.get('userPayload')

      const result = await deleteBar(db, id, payload.sub.id)

      return result.match(
        (bar) => ctx.json(bar, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

// --- Bar Photos ---

barsRoute
  .get('/:barId/photos', sValidator('param', type({ barId: 'string' })), async (ctx) => {
    const db = ctx.get('database')
    const { barId } = ctx.req.valid('param')

    const result = await listBarPhotos(db, barId)

    return result.match(
      (photos) => ctx.json(photos, 200),
      (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
    )
  })
  .post(
    '/:barId/photos',
    isAuth(),
    sValidator('param', type({ barId: 'string' })),
    sValidator(
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

      const result = await createBarPhoto(db, {
        bar_id: barId,
        url: data.url,
        alt_text: data.altText,
        is_primary: data.isPrimary,
      }, payload.sub.id)

      return result.match(
        (photo) => ctx.json(photo, 201),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

barsRoute.delete(
  '/photos/:id',
  isAuth(),
  sValidator('param', type({ id: 'string' })),
  async (ctx) => {
    const db = ctx.get('database')
    const { id } = ctx.req.valid('param')
    const payload = ctx.get('userPayload')

    const result = await deleteBarPhoto(db, id, payload.sub.id)

    return result.match(
      (photo) => ctx.json(photo, 200),
      (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
    )
  }
)

// --- Bar Signature Cocktails ---

barsRoute
  .get('/:barId/signature-cocktails', sValidator('param', type({ barId: 'string' })), async (ctx) => {
    const db = ctx.get('database')
    const { barId } = ctx.req.valid('param')

    const result = await listBarSignatureCocktails(db, barId)

    return result.match(
      (cocktails) => ctx.json(cocktails, 200),
      (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
    )
  })
  .post(
    '/:barId/signature-cocktails',
    isAuth(),
    sValidator('param', type({ barId: 'string' })),
    sValidator(
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

      const result = await createBarSignatureCocktail(db, {
        bar_id: barId,
        cocktail_id: data.cocktailId,
        price: data.price,
        currency: data.currency,
        is_available: data.isAvailable,
      }, payload.sub.id)

      return result.match(
        (cocktail) => ctx.json(cocktail, 201),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

barsRoute.delete(
  '/signature-cocktails/:id',
  isAuth(),
  sValidator('param', type({ id: 'string' })),
  async (ctx) => {
    const db = ctx.get('database')
    const { id } = ctx.req.valid('param')
    const payload = ctx.get('userPayload')

    const result = await deleteBarSignatureCocktail(db, id, payload.sub.id)

    return result.match(
      (cocktail) => ctx.json(cocktail, 200),
      (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
    )
  }
)

// --- Bar Likes ---

barsRoute
  .get(
    '/:barId/likes',
    sValidator('param', type({ barId: 'string' })),
    sValidator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { barId } = ctx.req.valid('param')
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await listBarLikes(db, barId, page, pageSize)

      return result.match(
        (likes) => ctx.json(likes, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .post('/:barId/likes/toggle', isAuth(), sValidator('param', type({ barId: 'string' })), async (ctx) => {
    const db = ctx.get('database')
    const { barId } = ctx.req.valid('param')
    const payload = ctx.get('userPayload')

    const result = await toggleBarLike(db, barId, payload.sub.id)

    return result.match(
      (toggle) => ctx.json(toggle, 200),
      (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
    )
  })
  .route('/', reviewsRoute)

export default barsRoute
