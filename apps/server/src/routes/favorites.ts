import { sValidator } from '@hono/standard-validator'
import { type } from 'arktype'
import { env } from 'hono/adapter'
import { HonoVar } from 'src/lib/hono'
import { isAuth } from 'src/middlewares/isAuth'

const favoritesRoute = new HonoVar()
  .basePath('/favorites')
  .use(isAuth())

favoritesRoute
  .get(
    '/',
    sValidator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { sub } = ctx.get('userPayload')
      const { page = 1 } = ctx.req.valid('query')

      const pageSize = Number(env(ctx).PAGE_SIZE)

      const favoritesList = await db
        .selectFrom('favorites')
        .innerJoin('cocktails', 'cocktails.id', 'favorites.cocktail_id')
        .selectAll('cocktails')
        .select('favorites.created_at as favorited_at')
        .where('favorites.user_id', '=', sub.id)
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .orderBy('favorites.created_at', 'desc')
        .execute()

      return ctx.json(favoritesList, 200)
    }
  )
  .post(
    '/:cocktailId',
    sValidator('param', type({ cocktailId: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { sub } = ctx.get('userPayload')
      const { cocktailId } = ctx.req.valid('param')

      const existing = await db
        .selectFrom('favorites')
        .selectAll()
        .where('user_id', '=', sub.id)
        .where('cocktail_id', '=', cocktailId)
        .executeTakeFirst()

      if (existing) {
        return ctx.json({ message: 'Already in favorites' }, 409)
      }

      const favorite = await db
        .insertInto('favorites')
        .values({ user_id: sub.id, cocktail_id: cocktailId })
        .returningAll()
        .executeTakeFirst()

      return ctx.json(favorite, 201)
    }
  )
  .delete(
    '/:cocktailId',
    sValidator('param', type({ cocktailId: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { sub } = ctx.get('userPayload')
      const { cocktailId } = ctx.req.valid('param')

      const deleted = await db
        .deleteFrom('favorites')
        .where('user_id', '=', sub.id)
        .where('cocktail_id', '=', cocktailId)
        .returningAll()
        .executeTakeFirst()

      if (!deleted) {
        return ctx.json({ message: 'Favorite not found' }, 404)
      }

      return ctx.json(deleted, 200)
    }
  )

export default favoritesRoute
