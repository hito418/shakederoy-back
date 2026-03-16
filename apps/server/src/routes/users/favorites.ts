import { type } from 'arktype'
import { env } from 'hono/adapter'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { Hono } from 'hono'
import { isAuth } from 'src/features/auth/auth.middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import { dto, errResponse } from 'src/shared/response-schemas'
import { UserFavoritePaginatedSchema, FavoriteToggleSchema } from 'src/features/users/users.dto'
import { favoritesService } from 'src/container'
import { provide } from 'src/shared/provide'

const favoritesRoute = new Hono()
  .use(provide('favorites', favoritesService))

favoritesRoute
  .get(
    '/favorites',
    describeRoute({
      tags: ['User Favorites'],
      summary: 'List user favorites',
      description: 'Returns a paginated list of the authenticated user\'s favorite cocktails.',
      responses: {
        200: {
          description: 'Paginated list of user favorites',
          content: { 'application/json': { schema: resolver(UserFavoritePaginatedSchema) } },
        },
        401: errResponse('Missing or invalid session cookie'),
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const payload = ctx.get('userPayload')
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await ctx.get('favorites').list(payload.sub.id, page, pageSize)

      return result
        .andThen((favorites) => dto(UserFavoritePaginatedSchema, favorites))
        .match(
          (favorites) => ctx.json(favorites, 200),
          (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .post(
    '/favorites/toggle',
    describeRoute({
      tags: ['User Favorites'],
      summary: 'Toggle cocktail favorite',
      description: 'Adds or removes a cocktail from the authenticated user\'s favorites.',
      responses: {
        200: {
          description: 'Favorite toggled',
          content: { 'application/json': { schema: resolver(FavoriteToggleSchema) } },
        },
        401: errResponse('Missing or invalid session cookie'),
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator('json', type({ cocktailId: 'string' })),
    async (ctx) => {
      const payload = ctx.get('userPayload')
      const { cocktailId } = ctx.req.valid('json')

      const result = await ctx.get('favorites').toggle(payload.sub.id, cocktailId)

      return result
        .andThen((data) => dto(FavoriteToggleSchema, data))
        .match(
          (data) => ctx.json(data, 200),
          (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )

export default favoritesRoute
