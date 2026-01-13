import { sValidator } from '@hono/standard-validator'
import { type } from 'arktype'
import { env } from 'hono/adapter'
import { HonoVar } from 'src/lib/hono'
import { isAuth } from 'src/middlewares/isAuth'

const cocktailsRoute = new HonoVar().basePath('/cocktails')

cocktailsRoute.get(
  '/',
  sValidator('query', type({ page: 'string.numeric.parse?' })),
  async (ctx) => {
    const db = ctx.get('database')
    const { page = 1 } = ctx.req.valid('query')

    const pageSize = Number(env(ctx).PAGE_SIZE)

    const cocktailList = await db
      .selectFrom('cocktails')
      .selectAll()
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .orderBy('updated_at', 'desc')
      .execute()

      return ctx.json(cocktailList, 200)
  }
).get('/:id', sValidator('param', type({ id: 'string' })), async (ctx) => {
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
}).post('/create', isAuth(), sValidator('json', type({
  name: 'string > 3',
  description: 'string > 5',
  ingredients: 'string',
  instructions: 'string',
})), async (ctx) => {
  const db = ctx.get('database')
  const { name, description, ingredients, instructions } = ctx.req.valid('json')
  
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
}).post('/:id', isAuth(), sValidator('param', type({ id: 'string' })), sValidator('json', type({
  name: 'string > 3?',
  description: 'string > 5?',
  ingredients: 'string?',
  instructions: 'string?',
})), async (ctx) => {
  const db = ctx.get('database')
  const { id } = ctx.req.param()
  const { name, description, ingredients, instructions } = ctx.req.valid('json')

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
}).delete('/:id', isAuth(), sValidator('param', type({ id: 'string' })), async (ctx) => {
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
})

export default cocktailsRoute
