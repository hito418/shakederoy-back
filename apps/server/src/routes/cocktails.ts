import { sValidator } from '@hono/standard-validator'
import { sql } from 'kysely'
import { type } from 'arktype'
import { env } from 'hono/adapter'
import { HonoVar } from 'src/lib/hono'
import { isAuth } from 'src/middlewares/isAuth'

const cocktailsRoute = new HonoVar().basePath('/cocktails')

cocktailsRoute
  .get(
    '/',
    sValidator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { page = 1 } = ctx.req.valid('query')

      const pageSize = Number(env(ctx).PAGE_SIZE)

      const [cocktailList, countResult] = await Promise.all([
        db
          .selectFrom('cocktails')
          .selectAll()
          .limit(pageSize)
          .offset((page - 1) * pageSize)
          .orderBy('updated_at', 'desc')
          .execute(),
        db
          .selectFrom('cocktails')
          .select(sql<number>`count(*)`.as('total'))
          .executeTakeFirstOrThrow(),
      ])

      const total = Number(countResult.total)

      return ctx.json(
        {
          data: cocktailList,
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
        200
      )
    }
  )
  .get(
    '/favorites',
    isAuth(),
    sValidator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { sub } = ctx.get('userPayload')
      const { page = 1 } = ctx.req.valid('query')

      const pageSize = Number(env(ctx).PAGE_SIZE)

      const [favoritesList, countResult] = await Promise.all([
        db
          .selectFrom('favorites')
          .innerJoin('cocktails', 'cocktails.id', 'favorites.cocktail_id')
          .selectAll('cocktails')
          .select('favorites.created_at as favorited_at')
          .where('favorites.user_id', '=', sub.id)
          .limit(pageSize)
          .offset((page - 1) * pageSize)
          .orderBy('favorites.created_at', 'desc')
          .execute(),
        db
          .selectFrom('favorites')
          .select(sql<number>`count(*)`.as('total'))
          .where('favorites.user_id', '=', sub.id)
          .executeTakeFirstOrThrow(),
      ])

      const total = Number(countResult.total)

      return ctx.json(
        {
          data: favoritesList,
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
        200
      )
    }
  )
  .get('/:id', sValidator('param', type({ id: 'string' })), async (ctx) => {
    const db = ctx.get('database')
    const { id } = ctx.req.param()

    const cocktail = await db
      .selectFrom('cocktails')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    if (!cocktail) {
      return ctx.json({ message: 'Cocktail not found' }, 404)
    }

    return ctx.json(cocktail, 200)
  })
  .post(
    '/create',
    isAuth(),
    sValidator(
      'json',
      type({
        name: 'string > 3',
        description: 'string > 5',
        ingredients: 'string',
        instructions: 'string',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { name, description, ingredients, instructions } =
        ctx.req.valid('json')

      const newCocktail = await db
        .insertInto('cocktails')
        .values({
          name,
          description,
          ingredients,
          instructions,
        })
        .returningAll()
        .executeTakeFirst()

      return ctx.json(newCocktail, 201)
    }
  )
  .post(
    '/:id',
    isAuth(),
    sValidator('param', type({ id: 'string' })),
    sValidator(
      'json',
      type({
        name: 'string > 3?',
        description: 'string > 5?',
        ingredients: 'string?',
        instructions: 'string?',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.param()
      const { name, description, ingredients, instructions } =
        ctx.req.valid('json')

      const updatedCocktail = await db
        .updateTable('cocktails')
        .set({
          ...(name ? { name } : {}),
          ...(description ? { description } : {}),
          ...(ingredients ? { ingredients } : {}),
          ...(instructions ? { instructions } : {}),
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst()

      if (!updatedCocktail) {
        return ctx.json({ message: 'Cocktail not found' }, 404)
      }

      return ctx.json(updatedCocktail, 200)
    }
  )
  .delete(
    '/:id',
    isAuth(),
    sValidator('param', type({ id: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.param()

      const deletedCocktail = await db
        .deleteFrom('cocktails')
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst()

      if (!deletedCocktail) {
        return ctx.json({ message: 'Cocktail not found' }, 404)
      }

      return ctx.json(deletedCocktail, 200)
    }
  )
  .post(
    '/:cocktailId/favorite',
    isAuth(),
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
    '/:cocktailId/favorite',
    isAuth(),
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

export default cocktailsRoute
