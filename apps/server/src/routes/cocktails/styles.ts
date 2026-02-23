import { sValidator } from '@hono/standard-validator'
import { type } from 'arktype'
import { env } from 'hono/adapter'
import { HonoVar } from 'src/shared/hono'
import { isAuth } from 'src/features/auth/middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import {
  listCocktailStyles,
  getCocktailStyleById,
  createCocktailStyle,
  updateCocktailStyle,
  deleteCocktailStyle,
} from 'src/features/cocktails/styles/service'

const stylesRoute = new HonoVar()

stylesRoute
  .get(
    '/',
    sValidator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await listCocktailStyles(db, page, pageSize)

      return result.match(
        (styleList) => ctx.json(styleList, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .get('/:id', sValidator('param', type({ id: 'string' })), async (ctx) => {
    const db = ctx.get('database')
    const { id } = ctx.req.valid('param')

    const result = await getCocktailStyleById(db, id)

    return result.match(
      (style) => ctx.json(style, 200),
      (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
    )
  })
  .post(
    '/create',
    isAuth('admin'),
    sValidator(
      'json',
      type({
        name: 'string >= 1',
        'description?': 'string',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { name, description } = ctx.req.valid('json')

      const result = await createCocktailStyle(db, { name, description })

      return result.match(
        (newStyle) => ctx.json(newStyle, 201),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .put(
    '/:id',
    isAuth('admin'),
    sValidator('param', type({ id: 'string' })),
    sValidator(
      'json',
      type({
        'name?': 'string >= 1',
        'description?': 'string',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')
      const { name, description } = ctx.req.valid('json')

      const result = await updateCocktailStyle(db, id, { name, description })

      return result.match(
        (updatedStyle) => ctx.json(updatedStyle, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .delete(
    '/:id',
    isAuth('admin'),
    sValidator('param', type({ id: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')

      const result = await deleteCocktailStyle(db, id)

      return result.match(
        (deletedStyle) => ctx.json(deletedStyle, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

export default stylesRoute
