import { sValidator } from '@hono/standard-validator'
import { type } from 'arktype'
import { env } from 'hono/adapter'
import { HonoVar } from 'src/shared/hono'
import { isAuth } from 'src/features/auth/auth.middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import {
  listCocktailVotes,
  voteCocktail,
  deleteCocktailVote,
  listCocktailViews,
  createCocktailView,
  listCocktailOfMonth,
  getCocktailOfMonthById,
  createCocktailOfMonth,
  updateCocktailOfMonth,
  deleteCocktailOfMonth,
} from 'src/features/cocktails/analytics.service'

const analyticsRoute = new HonoVar()

// --- Votes ---

analyticsRoute
  .get(
    '/:cocktailId/votes',
    sValidator('param', type({ cocktailId: 'string' })),
    sValidator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { cocktailId } = ctx.req.valid('param')
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await listCocktailVotes(db, cocktailId, page, pageSize)

      return result.match(
        (votes) => ctx.json(votes, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .post(
    '/:cocktailId/votes',
    isAuth(),
    sValidator('param', type({ cocktailId: 'string' })),
    sValidator(
      'json',
      type({
        voteType: "'upvote'|'downvote'",
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { cocktailId } = ctx.req.valid('param')
      const { voteType } = ctx.req.valid('json')
      const payload = ctx.get('userPayload')

      const result = await voteCocktail(db, cocktailId, payload.sub.id, voteType)

      return result.match(
        (vote) => ctx.json(vote, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .delete('/votes/:id', isAuth(), sValidator('param', type({ id: 'string' })), async (ctx) => {
    const db = ctx.get('database')
    const { id } = ctx.req.valid('param')
    const payload = ctx.get('userPayload')

    const result = await deleteCocktailVote(db, id, payload.sub.id)

    return result.match(
      (vote) => ctx.json(vote, 200),
      (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
    )
  })

// --- Views ---

analyticsRoute
  .get(
    '/:cocktailId/views',
    isAuth('admin'),
    sValidator('param', type({ cocktailId: 'string' })),
    sValidator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { cocktailId } = ctx.req.valid('param')
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await listCocktailViews(db, cocktailId, page, pageSize)

      return result.match(
        (views) => ctx.json(views, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .post(
    '/:cocktailId/views',
    sValidator('param', type({ cocktailId: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { cocktailId } = ctx.req.valid('param')

      const forwarded = ctx.req.header('x-forwarded-for')
      const ipAddress = forwarded?.split(',')[0]?.trim() ?? ctx.req.header('x-real-ip') ?? null
      const userAgent = ctx.req.header('user-agent') ?? null
      const now = new Date()
      const hourOfDay = now.getHours()
      const dayOfWeek = now.getDay()

      const result = await createCocktailView(db, {
        cocktail_id: cocktailId,
        ip_address: ipAddress,
        user_agent: userAgent,
        hour_of_day: hourOfDay,
        day_of_week: dayOfWeek,
      })

      return result.match(
        (view) => ctx.json(view, 201),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

// --- Cocktail of Month ---

analyticsRoute
  .get(
    '/of-month',
    sValidator(
      'query',
      type({ year: 'string.numeric.parse', month: 'string.numeric.parse' })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { year, month } = ctx.req.valid('query')

      const result = await listCocktailOfMonth(db, year, month)

      return result.match(
        (entries) => ctx.json(entries, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .get('/of-month/:id', sValidator('param', type({ id: 'string' })), async (ctx) => {
    const db = ctx.get('database')
    const { id } = ctx.req.valid('param')

    const result = await getCocktailOfMonthById(db, id)

    return result.match(
      (entry) => ctx.json(entry, 200),
      (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
    )
  })
  .post(
    '/of-month',
    isAuth('admin'),
    sValidator(
      'json',
      type({
        cocktailId: 'string',
        year: 'number >= 2000',
        month: '1 <= number <= 12',
        'rank?': 'number',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { cocktailId, year, month, rank } = ctx.req.valid('json')

      const result = await createCocktailOfMonth(db, {
        cocktail_id: cocktailId,
        year,
        month,
        rank,
      })

      return result.match(
        (entry) => ctx.json(entry, 201),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .put(
    '/of-month/:id',
    isAuth('admin'),
    sValidator('param', type({ id: 'string' })),
    sValidator(
      'json',
      type({
        'cocktailId?': 'string',
        'year?': 'number >= 2000',
        'month?': '1 <= number <= 12',
        'rank?': 'number',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')
      const { cocktailId, year, month, rank } = ctx.req.valid('json')

      const result = await updateCocktailOfMonth(db, id, {
        cocktail_id: cocktailId,
        year,
        month,
        rank,
      })

      return result.match(
        (entry) => ctx.json(entry, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .delete('/of-month/:id', isAuth('admin'), sValidator('param', type({ id: 'string' })), async (ctx) => {
    const db = ctx.get('database')
    const { id } = ctx.req.valid('param')

    const result = await deleteCocktailOfMonth(db, id)

    return result.match(
      (entry) => ctx.json(entry, 200),
      (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
    )
  })

export default analyticsRoute
