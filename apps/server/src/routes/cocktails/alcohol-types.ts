import { sValidator } from '@hono/standard-validator'
import { type } from 'arktype'
import { env } from 'hono/adapter'
import { HonoVar } from 'src/shared/hono'
import { isAuth } from 'src/features/auth/middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import {
  listAlcoholTypes,
  getAlcoholTypeById,
  createAlcoholType,
  updateAlcoholType,
  deleteAlcoholType,
} from 'src/features/cocktails/alcohol-types/service'

const alcoholTypesRoute = new HonoVar().basePath('/alcohol-types')

alcoholTypesRoute
  .get(
    '/',
    sValidator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await listAlcoholTypes(db, page, pageSize)

      return result.match(
        (alcoholTypeList) => ctx.json(alcoholTypeList, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error)),
      )
    }
  )
  .get('/:id', sValidator('param', type({ id: 'string' })), async (ctx) => {
    const db = ctx.get('database')
    const { id } = ctx.req.valid('param')

    const result = await getAlcoholTypeById(db, id)

    return result.match(
      (alcoholType) => ctx.json(alcoholType, 200),
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
        abvRangeMin: 'string.numeric?',
        abvRangeMax: 'string.numeric?',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { name, description, abvRangeMin, abvRangeMax } = ctx.req.valid('json')

      const result = await createAlcoholType(db, {
        name,
        description,
        abv_range_min: abvRangeMin,
        abv_range_max: abvRangeMax,
      })

      return result.match(
        (newAlcoholType) => ctx.json(newAlcoholType, 201),
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
        abvRangeMin: 'string.numeric?',
        abvRangeMax: 'string.numeric?',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')
      const { name, description, abvRangeMin, abvRangeMax } = ctx.req.valid('json')

      const result = await updateAlcoholType(db, id, {
        name,
        description,
        abv_range_min: abvRangeMin,
        abv_range_max: abvRangeMax,
      })

      return result.match(
        (updatedAlcoholType) => ctx.json(updatedAlcoholType, 200),
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

      const result = await deleteAlcoholType(db, id)

      return result.match(
        (deletedAlcoholType) => ctx.json(deletedAlcoholType, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

export default alcoholTypesRoute
