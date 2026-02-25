import { sValidator } from '@hono/standard-validator'
import { type } from 'arktype'
import { env } from 'hono/adapter'
import { getSignedCookie } from 'hono/cookie'
import { HonoVar } from 'src/shared/hono'
import { isAuth } from 'src/features/auth/middleware'
import { validateSession } from 'src/features/auth/session-service'
import { errorToHttpStatus } from 'src/shared/errors'
import {
  listCollections,
  listPublicCollections,
  getCollectionById,
  createCollection,
  updateCollection,
  deleteCollection,
  listCollectionCocktails,
  addCocktailToCollection,
  removeCocktailFromCollection,
} from 'src/features/collections/service'

const collectionsRoute = new HonoVar().basePath('/collections')

collectionsRoute
  .get(
    '/',
    isAuth(),
    sValidator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)
      const payload = ctx.get('userPayload')

      const result = await listCollections(db, payload.sub.id, page, pageSize)

      return result.match(
        (collections) => ctx.json(collections, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .get(
    '/public',
    sValidator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await listPublicCollections(db, page, pageSize)

      return result.match(
        (collections) => ctx.json(collections, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .get('/:id', sValidator('param', type({ id: 'string' })), async (ctx) => {
    const db = ctx.get('database')
    const { id } = ctx.req.valid('param')
    const { COOKIE_SECRET } = env(ctx)
    const sessionId = await getSignedCookie(ctx, COOKIE_SECRET, 'session_id')
    let userId: string | undefined
    if (sessionId) {
      const session = await validateSession(db, sessionId)
      if (session.isOk()) userId = session.value.sub.id
    }

    const result = await getCollectionById(db, id, userId)

    return result.match(
      (collection) => ctx.json(collection, 200),
      (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
    )
  })
  .post(
    '/create',
    isAuth(),
    sValidator(
      'json',
      type({
        name: 'string >= 1',
        'description?': 'string',
        'isPublic?': 'boolean',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const payload = ctx.get('userPayload')
      const { name, description, isPublic } = ctx.req.valid('json')

      const result = await createCollection(db, {
        user_id: payload.sub.id,
        name,
        description,
        is_public: isPublic,
      })

      return result.match(
        (newCollection) => ctx.json(newCollection, 201),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .put(
    '/:id',
    isAuth(),
    sValidator('param', type({ id: 'string' })),
    sValidator(
      'json',
      type({
        'name?': 'string >= 1',
        'description?': 'string',
        'isPublic?': 'boolean',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')
      const { name, description, isPublic } = ctx.req.valid('json')

      const payload = ctx.get('userPayload')

      const result = await updateCollection(db, id, payload.sub.id, {
        name,
        description,
        is_public: isPublic,
      })

      return result.match(
        (updatedCollection) => ctx.json(updatedCollection, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .delete(
    '/:id',
    isAuth(),
    sValidator('param', type({ id: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')

      const payload = ctx.get('userPayload')

      const result = await deleteCollection(db, id, payload.sub.id)

      return result.match(
        (deletedCollection) => ctx.json(deletedCollection, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .get(
    '/:collectionId/cocktails',
    sValidator('param', type({ collectionId: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { collectionId } = ctx.req.valid('param')
      const { COOKIE_SECRET } = env(ctx)
      const sessionId = await getSignedCookie(ctx, COOKIE_SECRET, 'session_id')
      let userId: string | undefined
      if (sessionId) {
        const session = await validateSession(db, sessionId)
        if (session.isOk()) userId = session.value.sub.id
      }

      const result = await listCollectionCocktails(db, collectionId, userId)

      return result.match(
        (cocktails) => ctx.json(cocktails, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .post(
    '/:collectionId/cocktails',
    isAuth(),
    sValidator('param', type({ collectionId: 'string' })),
    sValidator(
      'json',
      type({
        cocktailId: 'string',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { collectionId } = ctx.req.valid('param')
      const { cocktailId } = ctx.req.valid('json')
      const payload = ctx.get('userPayload')

      const result = await addCocktailToCollection(db, {
        collection_id: collectionId,
        cocktail_id: cocktailId,
      }, payload.sub.id)

      return result.match(
        (added) => ctx.json(added, 201),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .delete(
    '/cocktails/:id',
    isAuth(),
    sValidator('param', type({ id: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')
      const payload = ctx.get('userPayload')

      const result = await removeCocktailFromCollection(db, id, payload.sub.id)

      return result.match(
        (removed) => ctx.json(removed, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

export default collectionsRoute
