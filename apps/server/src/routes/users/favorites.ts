import { sValidator } from '@hono/standard-validator'
import { type } from 'arktype'
import { env } from 'hono/adapter'
import { HonoVar } from 'src/shared/hono'
import { isAuth } from 'src/features/auth/auth.middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import { listUserFavorites, toggleFavorite } from 'src/features/users/favorites.service'

const favoritesRoute = new HonoVar()

favoritesRoute
  .get(
    '/favorites',
    isAuth(),
    sValidator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const db = ctx.get('database')
      const payload = ctx.get('userPayload')
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await listUserFavorites(db, payload.sub.id, page, pageSize)

      return result.match(
        (favorites) => ctx.json(favorites, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .post(
    '/favorites/toggle',
    isAuth(),
    sValidator('json', type({ cocktailId: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const payload = ctx.get('userPayload')
      const { cocktailId } = ctx.req.valid('json')

      const result = await toggleFavorite(db, payload.sub.id, cocktailId)

      return result.match(
        (data) => ctx.json(data, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

export default favoritesRoute
