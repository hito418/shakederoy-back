import { type } from 'arktype'
import { env } from 'hono/adapter'
import { getSignedCookie } from 'hono/cookie'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { HonoVar } from 'src/shared/hono'
import { isAuth } from 'src/features/auth/auth.middleware'
import { validateSession } from 'src/features/auth/session.service'
import { errorToHttpStatus } from 'src/shared/errors'
import { errorResponses } from 'src/shared/response-schemas'
import {
  CollectionSchema,
  CollectionPaginatedSchema,
  CollectionCocktailSchema,
  CollectionCocktailPaginatedSchema,
} from 'src/features/users/users.dto'
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
} from 'src/features/users/collections.service'

const collectionsRoute = new HonoVar().basePath('/collections')

collectionsRoute
  .get(
    '/',
    describeRoute({
      tags: ['Collections'],
      summary: 'List my collections',
      responses: {
        200: {
          description: 'Paginated list of collections',
          content: { 'application/json': { schema: resolver(CollectionPaginatedSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('query', type({ page: 'string.numeric.parse?' })),
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
    describeRoute({
      tags: ['Collections'],
      summary: 'List public collections',
      responses: {
        200: {
          description: 'Paginated list of public collections',
          content: { 'application/json': { schema: resolver(CollectionPaginatedSchema) } },
        },
        ...errorResponses,
      },
    }),
    validator('query', type({ page: 'string.numeric.parse?' })),
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
  .get(
    '/:id',
    describeRoute({
      tags: ['Collections'],
      summary: 'Get collection by ID',
      responses: {
        200: {
          description: 'Collection found',
          content: { 'application/json': { schema: resolver(CollectionSchema) } },
        },
        ...errorResponses,
      },
    }),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
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
    }
  )
  .post(
    '/create',
    describeRoute({
      tags: ['Collections'],
      summary: 'Create collection',
      responses: {
        201: {
          description: 'Collection created',
          content: { 'application/json': { schema: resolver(CollectionSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator(
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
    describeRoute({
      tags: ['Collections'],
      summary: 'Update collection',
      responses: {
        200: {
          description: 'Collection updated',
          content: { 'application/json': { schema: resolver(CollectionSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    validator(
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
    describeRoute({
      tags: ['Collections'],
      summary: 'Delete collection',
      responses: {
        200: {
          description: 'Collection deleted',
          content: { 'application/json': { schema: resolver(CollectionSchema) } },
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

      const result = await deleteCollection(db, id, payload.sub.id)

      return result.match(
        (deletedCollection) => ctx.json(deletedCollection, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .get(
    '/:collectionId/cocktails',
    describeRoute({
      tags: ['Collection Cocktails'],
      summary: 'List collection cocktails',
      responses: {
        200: {
          description: 'Paginated list of collection cocktails',
          content: { 'application/json': { schema: resolver(CollectionCocktailPaginatedSchema) } },
        },
        ...errorResponses,
      },
    }),
    validator('param', type({ collectionId: 'string' })),
    validator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { collectionId } = ctx.req.valid('param')
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)
      const { COOKIE_SECRET } = env(ctx)
      const sessionId = await getSignedCookie(ctx, COOKIE_SECRET, 'session_id')
      let userId: string | undefined
      if (sessionId) {
        const session = await validateSession(db, sessionId)
        if (session.isOk()) userId = session.value.sub.id
      }

      const result = await listCollectionCocktails(db, collectionId, page, pageSize, userId)

      return result.match(
        (cocktails) => ctx.json(cocktails, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .post(
    '/:collectionId/cocktails',
    describeRoute({
      tags: ['Collection Cocktails'],
      summary: 'Add cocktail to collection',
      responses: {
        201: {
          description: 'Cocktail added to collection',
          content: { 'application/json': { schema: resolver(CollectionCocktailSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ collectionId: 'string' })),
    validator(
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
    describeRoute({
      tags: ['Collection Cocktails'],
      summary: 'Remove cocktail from collection',
      responses: {
        200: {
          description: 'Cocktail removed from collection',
          content: { 'application/json': { schema: resolver(CollectionCocktailSchema) } },
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

      const result = await removeCocktailFromCollection(db, id, payload.sub.id)

      return result.match(
        (removed) => ctx.json(removed, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

export default collectionsRoute
