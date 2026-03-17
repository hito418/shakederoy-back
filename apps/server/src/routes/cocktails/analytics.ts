import { type } from 'arktype'
import { getSignedCookie } from 'hono/cookie'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { env } from 'hono/adapter'
import { Hono } from 'hono'
import { isAuth } from 'src/features/auth/auth.middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import { dto, errResponse } from 'src/shared/response-schemas'
import {
  CocktailVoteSchema,
  CocktailVotePaginatedSchema,
  CocktailVoteSummarySchema,
  CocktailViewSchema,
  CocktailViewPaginatedSchema,
  CocktailOfMonthSchema,
  CocktailOfMonthListSchema,
} from 'src/features/cocktails/cocktails.dto'
import { analyticsService } from 'src/container'
import { provide } from 'src/shared/provide'
import { env as appEnv } from 'src/shared/env'

const analyticsRoute = new Hono().use(provide('analytics', analyticsService))

// --- Votes ---

analyticsRoute
  .get(
    '/:cocktailId/votes/summary',
    describeRoute({
      tags: ['Cocktail Votes'],
      summary: 'Get cocktail vote summary',
      description:
        'Returns aggregated vote counts, net score, and the current user vote when a valid session cookie is present.',
      responses: {
        200: {
          description: 'Aggregated cocktail vote summary',
          content: {
            'application/json': { schema: resolver(CocktailVoteSummarySchema) },
          },
        },
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator('param', type({ cocktailId: 'string' })),
    async (ctx) => {
      const { cocktailId } = ctx.req.valid('param')
      const {
        sub: { id: userId },
      } = ctx.get('userPayload')

      const result = await ctx
        .get('analytics')
        .getVoteSummary(cocktailId, userId)

      return result
        .andThen((data) => dto(CocktailVoteSummarySchema, data))
        .match(
          (summary) => ctx.json(summary, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .get(
    '/:cocktailId/votes',
    describeRoute({
      tags: ['Cocktail Votes'],
      summary: 'List cocktail votes',
      description: 'Returns a paginated list of votes for a given cocktail.',
      responses: {
        200: {
          description: 'Paginated list of cocktail votes',
          content: {
            'application/json': {
              schema: resolver(CocktailVotePaginatedSchema),
            },
          },
        },
        500: errResponse('Database error'),
      },
    }),
    validator('param', type({ cocktailId: 'string' })),
    validator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const { cocktailId } = ctx.req.valid('param')
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await ctx
        .get('analytics')
        .listVotes(cocktailId, page, pageSize)

      return result
        .andThen((data) => dto(CocktailVotePaginatedSchema, data))
        .match(
          (votes) => ctx.json(votes, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .post(
    '/:cocktailId/votes',
    describeRoute({
      tags: ['Cocktail Votes'],
      summary: 'Vote on cocktail',
      description:
        'Records an upvote or downvote on a cocktail. Requires authentication.',
      responses: {
        200: {
          description: 'Cocktail vote recorded',
          content: {
            'application/json': { schema: resolver(CocktailVoteSchema) },
          },
        },
        401: errResponse('Missing or invalid session cookie'),
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator('param', type({ cocktailId: 'string' })),
    validator(
      'json',
      type({
        voteType: "'upvote'|'downvote'",
      })
    ),
    async (ctx) => {
      const { cocktailId } = ctx.req.valid('param')
      const { voteType } = ctx.req.valid('json')
      const payload = ctx.get('userPayload')

      const result = await ctx
        .get('analytics')
        .vote(cocktailId, payload.sub.id, voteType)

      return result
        .andThen((data) => dto(CocktailVoteSchema, data))
        .match(
          (vote) => ctx.json(vote, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .delete(
    '/votes/:id',
    describeRoute({
      tags: ['Cocktail Votes'],
      summary: 'Delete cocktail vote',
      description:
        'Removes a vote from a cocktail. Only the vote author can delete their vote.',
      responses: {
        200: {
          description: 'Deleted cocktail vote',
          content: {
            'application/json': { schema: resolver(CocktailVoteSchema) },
          },
        },
        401: errResponse('Missing or invalid session cookie'),
        404: errResponse('Vote not found'),
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')
      const payload = ctx.get('userPayload')

      const result = await ctx.get('analytics').deleteVote(id, payload.sub.id)

      return result
        .andThen((data) => dto(CocktailVoteSchema, data))
        .match(
          (vote) => ctx.json(vote, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )

// --- Views ---

analyticsRoute
  .get(
    '/:cocktailId/views',
    describeRoute({
      tags: ['Cocktail Views'],
      summary: 'List cocktail views',
      description:
        'Returns a paginated list of view records for a given cocktail. Requires admin role.',
      responses: {
        200: {
          description: 'Paginated list of cocktail views',
          content: {
            'application/json': {
              schema: resolver(CocktailViewPaginatedSchema),
            },
          },
        },
        401: errResponse(
          'Missing or invalid session cookie, or insufficient role'
        ),
        500: errResponse('Database error'),
      },
    }),
    isAuth('admin'),
    validator('param', type({ cocktailId: 'string' })),
    validator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const { cocktailId } = ctx.req.valid('param')
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await ctx
        .get('analytics')
        .listViews(cocktailId, page, pageSize)

      return result
        .andThen((data) => dto(CocktailViewPaginatedSchema, data))
        .match(
          (views) => ctx.json(views, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .post(
    '/:cocktailId/views',
    describeRoute({
      tags: ['Cocktail Views'],
      summary: 'Record cocktail view',
      description:
        'Records a view event for a cocktail, capturing IP address, user agent, and time metadata.',
      responses: {
        201: {
          description: 'Cocktail view recorded',
          content: {
            'application/json': { schema: resolver(CocktailViewSchema) },
          },
        },
        500: errResponse('Database error'),
      },
    }),
    validator('param', type({ cocktailId: 'string' })),
    async (ctx) => {
      const { cocktailId } = ctx.req.valid('param')

      const forwarded = ctx.req.header('x-forwarded-for')
      const ipAddress =
        forwarded?.split(',')[0]?.trim() ?? ctx.req.header('x-real-ip') ?? null
      const userAgent = ctx.req.header('user-agent') ?? null
      const now = new Date()
      const hourOfDay = now.getHours()
      const dayOfWeek = now.getDay()

      const result = await ctx.get('analytics').createView({
        cocktail_id: cocktailId,
        ip_address: ipAddress,
        user_agent: userAgent,
        hour_of_day: hourOfDay,
        day_of_week: dayOfWeek,
      })

      return result
        .andThen((data) => dto(CocktailViewSchema, data))
        .match(
          (view) => ctx.json(view, 201),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )

// --- Cocktail of Month ---

analyticsRoute
  .get(
    '/of-month',
    describeRoute({
      tags: ['Cocktail of the Month'],
      summary: 'List cocktails of the month',
      description:
        'Returns the list of featured cocktails for a given year and month.',
      responses: {
        200: {
          description: 'List of cocktails of the month',
          content: {
            'application/json': { schema: resolver(CocktailOfMonthListSchema) },
          },
        },
        500: errResponse('Database error'),
      },
    }),
    validator(
      'query',
      type({ year: 'string.numeric.parse', month: 'string.numeric.parse' })
    ),
    async (ctx) => {
      const { year, month } = ctx.req.valid('query')

      const result = await ctx.get('analytics').listOfMonth(year, month)

      return result
        .andThen((data) => dto(CocktailOfMonthListSchema, data))
        .match(
          (entries) => ctx.json(entries, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .get(
    '/of-month/:id',
    describeRoute({
      tags: ['Cocktail of the Month'],
      summary: 'Get cocktail of the month by ID',
      description: 'Returns a single cocktail of the month entry by its ID.',
      responses: {
        200: {
          description: 'Cocktail of the month entry',
          content: {
            'application/json': { schema: resolver(CocktailOfMonthSchema) },
          },
        },
        404: errResponse('Cocktail of the month entry not found'),
        500: errResponse('Database error'),
      },
    }),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const result = await ctx.get('analytics').getOfMonthById(id)

      return result
        .andThen((data) => dto(CocktailOfMonthSchema, data))
        .match(
          (entry) => ctx.json(entry, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .post(
    '/of-month',
    describeRoute({
      tags: ['Cocktail of the Month'],
      summary: 'Create cocktail of the month',
      description:
        'Features a cocktail for a given year and month with optional ranking. Requires admin role.',
      responses: {
        201: {
          description: 'Cocktail of the month created',
          content: {
            'application/json': { schema: resolver(CocktailOfMonthSchema) },
          },
        },
        401: errResponse(
          'Missing or invalid session cookie, or insufficient role'
        ),
        500: errResponse('Database error'),
      },
    }),
    isAuth('admin'),
    validator(
      'json',
      type({
        cocktailId: 'string',
        year: 'number >= 2000',
        month: '1 <= number <= 12',
        'rank?': 'number',
      })
    ),
    async (ctx) => {
      const { cocktailId, year, month, rank } = ctx.req.valid('json')

      const result = await ctx.get('analytics').createOfMonth({
        cocktail_id: cocktailId,
        year,
        month,
        rank,
      })

      return result
        .andThen((data) => dto(CocktailOfMonthSchema, data))
        .match(
          (entry) => ctx.json(entry, 201),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .put(
    '/of-month/:id',
    describeRoute({
      tags: ['Cocktail of the Month'],
      summary: 'Update cocktail of the month',
      description:
        'Updates a cocktail of the month entry. Requires admin role.',
      responses: {
        200: {
          description: 'Updated cocktail of the month',
          content: {
            'application/json': { schema: resolver(CocktailOfMonthSchema) },
          },
        },
        401: errResponse(
          'Missing or invalid session cookie, or insufficient role'
        ),
        404: errResponse('Cocktail of the month entry not found'),
        500: errResponse('Database error'),
      },
    }),
    isAuth('admin'),
    validator('param', type({ id: 'string' })),
    validator(
      'json',
      type({
        'cocktailId?': 'string',
        'year?': 'number >= 2000',
        'month?': '1 <= number <= 12',
        'rank?': 'number',
      })
    ),
    async (ctx) => {
      const { id } = ctx.req.valid('param')
      const { cocktailId, year, month, rank } = ctx.req.valid('json')

      const result = await ctx.get('analytics').updateOfMonth(id, {
        cocktail_id: cocktailId,
        year,
        month,
        rank,
      })

      return result
        .andThen((data) => dto(CocktailOfMonthSchema, data))
        .match(
          (entry) => ctx.json(entry, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .delete(
    '/of-month/:id',
    describeRoute({
      tags: ['Cocktail of the Month'],
      summary: 'Delete cocktail of the month',
      description:
        'Removes a cocktail of the month entry. Requires admin role.',
      responses: {
        200: {
          description: 'Deleted cocktail of the month',
          content: {
            'application/json': { schema: resolver(CocktailOfMonthSchema) },
          },
        },
        401: errResponse(
          'Missing or invalid session cookie, or insufficient role'
        ),
        404: errResponse('Cocktail of the month entry not found'),
        500: errResponse('Database error'),
      },
    }),
    isAuth('admin'),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const result = await ctx.get('analytics').deleteOfMonth(id)

      return result
        .andThen((data) => dto(CocktailOfMonthSchema, data))
        .match(
          (entry) => ctx.json(entry, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )

export default analyticsRoute
