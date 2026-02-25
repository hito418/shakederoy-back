import { type } from 'arktype'
import { env } from 'hono/adapter'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { HonoVar } from 'src/shared/hono'
import { isAuth } from 'src/features/auth/auth.middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import { errorResponses } from 'src/shared/response-schemas'
import {
  BarReviewSchema,
  BarReviewPaginatedSchema,
} from 'src/features/bars/bars.dto'
import {
  listBarReviews,
  getBarReviewById,
  createBarReview,
  updateBarReview,
  deleteBarReview,
} from 'src/features/bars/reviews.service'

const reviewsRoute = new HonoVar()

reviewsRoute
  .get(
    '/:barId/reviews',
    describeRoute({
      tags: ['Bar Reviews'],
      summary: 'List bar reviews',
      responses: {
        200: {
          description: 'Paginated list of bar reviews',
          content: { 'application/json': { schema: resolver(BarReviewPaginatedSchema) } },
        },
        ...errorResponses,
      },
    }),
    validator('param', type({ barId: 'string' })),
    validator('query', type({ page: 'string.numeric.parse?' })),
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
    describeRoute({
      tags: ['Bar Reviews'],
      summary: 'Create bar review',
      responses: {
        201: {
          description: 'Created bar review',
          content: { 'application/json': { schema: resolver(BarReviewSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ barId: 'string' })),
    validator(
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
  .get(
    '/reviews/:id',
    describeRoute({
      tags: ['Bar Reviews'],
      summary: 'Get bar review by ID',
      responses: {
        200: {
          description: 'Bar review details',
          content: { 'application/json': { schema: resolver(BarReviewSchema) } },
        },
        ...errorResponses,
      },
    }),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')

      const result = await getBarReviewById(db, id)

      return result.match(
        (review) => ctx.json(review, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .put(
    '/reviews/:id',
    describeRoute({
      tags: ['Bar Reviews'],
      summary: 'Update bar review',
      responses: {
        200: {
          description: 'Updated bar review',
          content: { 'application/json': { schema: resolver(BarReviewSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    validator(
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
    describeRoute({
      tags: ['Bar Reviews'],
      summary: 'Delete bar review',
      responses: {
        200: {
          description: 'Deleted bar review',
          content: { 'application/json': { schema: resolver(BarReviewSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
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
