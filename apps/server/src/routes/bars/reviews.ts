import { type } from 'arktype'
import { env } from 'hono/adapter'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { Hono } from 'hono'
import { isAuth } from 'src/features/auth/auth.middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import { dto, errResponse } from 'src/shared/response-schemas'
import {
  BarReviewSchema,
  BarReviewPaginatedSchema,
} from 'src/features/bars/bars.dto'
import { reviewsService } from 'src/container'
import { provide } from 'src/shared/provide'

const reviewsRoute = new Hono()
  .use(provide('reviews', reviewsService))

reviewsRoute
  .get(
    '/:barId/reviews',
    describeRoute({
      tags: ['Bar Reviews'],
      summary: 'List bar reviews',
      description: 'Returns a paginated list of reviews for a given bar.',
      responses: {
        200: {
          description: 'Paginated list of bar reviews',
          content: { 'application/json': { schema: resolver(BarReviewPaginatedSchema) } },
        },
        500: errResponse('Database error'),
      },
    }),
    validator('param', type({ barId: 'string' })),
    validator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const { barId } = ctx.req.valid('param')
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await ctx.get('reviews').list(barId, page, pageSize)

      return result
        .andThen((reviews) => dto(BarReviewPaginatedSchema, reviews))
        .match(
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
      description: 'Creates a review for a bar with a rating (1-5) and optional comment. Requires authentication.',
      responses: {
        201: {
          description: 'Created bar review',
          content: { 'application/json': { schema: resolver(BarReviewSchema) } },
        },
        401: errResponse('Missing or invalid session cookie'),
        500: errResponse('Database error'),
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
      const payload = ctx.get('userPayload')
      const { barId } = ctx.req.valid('param')
      const { rating, comment } = ctx.req.valid('json')

      const result = await ctx.get('reviews').create({
        bar_id: barId,
        user_id: payload.sub.id,
        rating,
        comment,
      })

      return result
        .andThen((newReview) => dto(BarReviewSchema, newReview))
        .match(
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
      description: 'Returns a single bar review by its ID.',
      responses: {
        200: {
          description: 'Bar review details',
          content: { 'application/json': { schema: resolver(BarReviewSchema) } },
        },
        500: errResponse('Database error'),
      },
    }),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const result = await ctx.get('reviews').getById(id)

      return result
        .andThen((review) => dto(BarReviewSchema, review))
        .match(
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
      description: 'Updates a bar review. Only the review author can update their review.',
      responses: {
        200: {
          description: 'Updated bar review',
          content: { 'application/json': { schema: resolver(BarReviewSchema) } },
        },
        401: errResponse('Missing or invalid session cookie'),
        500: errResponse('Database error'),
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
      const { id } = ctx.req.valid('param')
      const { rating, comment } = ctx.req.valid('json')
      const payload = ctx.get('userPayload')

      const result = await ctx.get('reviews').update(id, payload.sub.id, { rating, comment })

      return result
        .andThen((updatedReview) => dto(BarReviewSchema, updatedReview))
        .match(
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
      description: 'Deletes a bar review. Only the review author can delete their review.',
      responses: {
        200: {
          description: 'Deleted bar review',
          content: { 'application/json': { schema: resolver(BarReviewSchema) } },
        },
        401: errResponse('Missing or invalid session cookie'),
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')
      const payload = ctx.get('userPayload')

      const result = await ctx.get('reviews').delete(id, payload.sub.id)

      return result
        .andThen((deletedReview) => dto(BarReviewSchema, deletedReview))
        .match(
          (deletedReview) => ctx.json(deletedReview, 200),
          (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )

export default reviewsRoute
