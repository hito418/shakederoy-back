import { sValidator } from '@hono/standard-validator'
import { type } from 'arktype'
import { env } from 'hono/adapter'
import { HonoVar } from 'src/shared/hono'
import { isAuth } from 'src/features/auth/middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import {
  listBarReviews,
  getBarReviewById,
  createBarReview,
  updateBarReview,
  deleteBarReview,
} from 'src/features/bars/reviews/service'

const reviewsRoute = new HonoVar()

reviewsRoute
  .get(
    '/:barId/reviews',
    sValidator('param', type({ barId: 'string' })),
    sValidator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { barId } = ctx.req.valid('param')
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await listBarReviews(db, barId, page, pageSize)

      return result.match(
        (reviews) => ctx.json(reviews, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .post(
    '/:barId/reviews',
    isAuth(),
    sValidator('param', type({ barId: 'string' })),
    sValidator(
      'json',
      type({
        rating: '1 <= number.integer <= 5',
        'comment?': 'string',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const payload = ctx.get('userPayload')
      const { barId } = ctx.req.valid('param')
      const { rating, comment } = ctx.req.valid('json')

      const result = await createBarReview(db, {
        bar_id: barId,
        user_id: payload.sub.id,
        rating,
        comment,
      })

      return result.match(
        (newReview) => ctx.json(newReview, 201),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

reviewsRoute
  .get('/reviews/:id', sValidator('param', type({ id: 'string' })), async (ctx) => {
    const db = ctx.get('database')
    const { id } = ctx.req.valid('param')

    const result = await getBarReviewById(db, id)

    return result.match(
      (review) => ctx.json(review, 200),
      (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
    )
  })
  .put(
    '/reviews/:id',
    isAuth(),
    sValidator('param', type({ id: 'string' })),
    sValidator(
      'json',
      type({
        'rating?': '1 <= number.integer <= 5',
        'comment?': 'string',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')
      const { rating, comment } = ctx.req.valid('json')
      const payload = ctx.get('userPayload')

      const result = await updateBarReview(db, id, payload.sub.id, { rating, comment })

      return result.match(
        (updatedReview) => ctx.json(updatedReview, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .delete(
    '/reviews/:id',
    isAuth(),
    sValidator('param', type({ id: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')
      const payload = ctx.get('userPayload')

      const result = await deleteBarReview(db, id, payload.sub.id)

      return result.match(
        (deletedReview) => ctx.json(deletedReview, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

export default reviewsRoute
