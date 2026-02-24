import { HonoVar } from 'src/shared/hono'
import { isAuth } from 'src/features/auth/middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import {
  addFavorite,
  isFavorite,
  listFavorites,
  removeFavorite,
  toggleFavorite,
} from 'src/features/favorites/service'

const favoritesRoute = new HonoVar().basePath('/favorites')

favoritesRoute.get('/', isAuth(), async (ctx) => {
  const db = ctx.get('database')
  const payload = ctx.get('userPayload')

  const result = await listFavorites(db, payload.sub.id)
  return result.match(
    (favorites) => ctx.json(favorites, 200),
    (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
  )
})

favoritesRoute.get('/:cocktailId/status', isAuth(), async (ctx) => {
  const db = ctx.get('database')
  const payload = ctx.get('userPayload')
  const { cocktailId } = ctx.req.param()

  const result = await isFavorite(db, payload.sub.id, cocktailId)
  return result.match(
    (favorite) => ctx.json({ cocktailId, isFavorite: favorite }, 200),
    (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
  )
})

favoritesRoute.post('/:cocktailId', isAuth(), async (ctx) => {
  const db = ctx.get('database')
  const payload = ctx.get('userPayload')
  const { cocktailId } = ctx.req.param()

  const result = await addFavorite(db, payload.sub.id, cocktailId)
  return result.match(
    (favorite) => ctx.json(favorite, 201),
    (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
  )
})

favoritesRoute.delete('/:cocktailId', isAuth(), async (ctx) => {
  const db = ctx.get('database')
  const payload = ctx.get('userPayload')
  const { cocktailId } = ctx.req.param()

  const result = await removeFavorite(db, payload.sub.id, cocktailId)
  return result.match(
    (favorite) => ctx.json(favorite, 200),
    (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
  )
})

favoritesRoute.post('/:cocktailId/toggle', isAuth(), async (ctx) => {
  const db = ctx.get('database')
  const payload = ctx.get('userPayload')
  const { cocktailId } = ctx.req.param()

  const result = await toggleFavorite(db, payload.sub.id, cocktailId)
  return result.match(
    (favorite) => ctx.json(favorite, 200),
    (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
  )
})

export default favoritesRoute
