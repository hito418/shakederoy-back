import { sValidator } from '@hono/standard-validator'
import { type } from 'arktype'
import { env } from 'hono/adapter'
import { HonoVar } from 'src/shared/hono'
import { isAuth } from 'src/features/auth/middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import {
  listGlasses,
  getGlassById,
  createGlass,
  updateGlass,
  deleteGlass,
} from 'src/features/cocktails/glasses/service'

const glassesRoute = new HonoVar().basePath('/glasses')

glassesRoute
  .get(
    '/',
    sValidator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await listGlasses(db, page, pageSize)

      return result.match(
        (glassList) => ctx.json(glassList, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .get('/:id', sValidator('param', type({ id: 'string' })), async (ctx) => {
    const db = ctx.get('database')
    const { id } = ctx.req.valid('param')

    const result = await getGlassById(db, id)

    return result.match(
      (glass) => ctx.json(glass, 200),
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
        description: 'string?',
        capacity: 'number?',
        imageUrl: 'string?',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { name, description, capacity, imageUrl } = ctx.req.valid('json')

      const result = await createGlass(db, {
        name,
        description,
        capacity,
        image_url: imageUrl,
      })

      return result.match(
        (newGlass) => ctx.json(newGlass, 201),
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
        name: 'string >= 1?',
        description: 'string?',
        capacity: 'number?',
        imageUrl: 'string?',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')
      const { name, description, capacity, imageUrl } = ctx.req.valid('json')

      const result = await updateGlass(db, id, {
        name,
        description,
        capacity,
        image_url: imageUrl,
      })

      return result.match(
        (updatedGlass) => ctx.json(updatedGlass, 200),
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

      const result = await deleteGlass(db, id)

      return result.match(
        (deletedGlass) => ctx.json(deletedGlass, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

export default glassesRoute
