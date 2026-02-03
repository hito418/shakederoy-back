import { sValidator } from '@hono/standard-validator'
import { type } from 'arktype'
import { env } from 'hono/adapter'
import { HonoVar } from 'src/shared/hono'
import { isAuth } from 'src/features/auth/middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import {
  listCocktails,
  getCocktailById,
  createCocktail,
  updateCocktail,
  deleteCocktail,
} from 'src/features/cocktails/service'

const cocktailsRoute = new HonoVar().basePath('/cocktails')

cocktailsRoute
  .get(
    '/',
    sValidator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await listCocktails(db, page, pageSize)

      return result.match(
        (cocktailList) => ctx.json(cocktailList, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .get('/:id', sValidator('param', type({ id: 'string' })), async (ctx) => {
    const db = ctx.get('database')
    const { id } = ctx.req.param()

    const result = await getCocktailById(db, id)

    return result.match(
      (cocktail) => ctx.json(cocktail, 200),
      (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
    )
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
      const { name, description, ingredients, instructions } = ctx.req.valid('json')

      const result = await createCocktail(db, { name, description, ingredients, instructions })

      return result.match(
        (newCocktail) => ctx.json(newCocktail, 201),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
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
      const { name, description, ingredients, instructions } = ctx.req.valid('json')

      const result = await updateCocktail(db, id, { name, description, ingredients, instructions })

      return result.match(
        (updatedCocktail) => ctx.json(updatedCocktail, 200),
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
      const { id } = ctx.req.param()

      const result = await deleteCocktail(db, id)

      return result.match(
        (deletedCocktail) => ctx.json(deletedCocktail, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

export default cocktailsRoute
