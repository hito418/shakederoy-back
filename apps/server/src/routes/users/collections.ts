import { type } from 'arktype'
import { env } from 'src/shared/env'
import { getSignedCookie } from 'hono/cookie'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { Hono } from 'hono'
import { isAuth } from 'src/features/auth/auth.middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import { dto, errResponse } from 'src/shared/response-schemas'
import {
  CollectionSchema,
  CollectionPaginatedSchema,
  CollectionCocktailSchema,
  CollectionCocktailPaginatedSchema,
} from 'src/features/users/users.dto'
import { collectionsService } from 'src/container'
import { provide } from 'src/shared/provide'

const collectionsRoute = new Hono()
  .basePath('/collections')
  .use(provide('collections', collectionsService))

collectionsRoute
  .get(
    '/',
    describeRoute({
      tags: ['Collections'],
      summary: 'List my collections',
      description: 'Returns a paginated list of the authenticated user\'s collections.',
      responses: {
        200: {
          description: 'Paginated list of collections',
          content: { 'application/json': { schema: resolver(CollectionPaginatedSchema) } },
        },
        401: errResponse('Missing or invalid session cookie'),
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = env.PAGE_SIZE
      const payload = ctx.get('userPayload')

      const result = await ctx.get('collections').list(payload.sub.id, page, pageSize)

      return result
        .andThen((collections) => dto(CollectionPaginatedSchema, collections))
        .match(
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
      description: 'Returns a paginated list of all publicly shared collections.',
      responses: {
        200: {
          description: 'Paginated list of public collections',
          content: { 'application/json': { schema: resolver(CollectionPaginatedSchema) } },
        },
        500: errResponse('Database error'),
      },
    }),
    validator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = env.PAGE_SIZE

      const result = await ctx.get('collections').listPublic(page, pageSize)

      return result
        .andThen((collections) => dto(CollectionPaginatedSchema, collections))
        .match(
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
      description: 'Returns a single collection by its ID. Private collections are only visible to their owner.',
      responses: {
        200: {
          description: 'Collection found',
          content: { 'application/json': { schema: resolver(CollectionSchema) } },
        },
        404: errResponse('Collection not found or not accessible'),
        500: errResponse('Database error'),
      },
    }),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')
      const COOKIE_SECRET = env.COOKIE_SECRET
      const sessionId = await getSignedCookie(ctx, COOKIE_SECRET, 'session_id')
      let userId: string | undefined
      if (sessionId) {
        const session = await ctx.get('sessionService').validate(sessionId)
        if (session.isOk()) userId = session.value.sub.id
      }

      const result = await ctx.get('collections').getById(id, userId)

      return result
        .andThen((collection) => dto(CollectionSchema, collection))
        .match(
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
      description: 'Creates a new collection with optional description and visibility. Requires authentication.',
      responses: {
        201: {
          description: 'Collection created',
          content: { 'application/json': { schema: resolver(CollectionSchema) } },
        },
        401: errResponse('Missing or invalid session cookie'),
        500: errResponse('Database error'),
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
      const payload = ctx.get('userPayload')
      const { name, description, isPublic } = ctx.req.valid('json')

      const result = await ctx.get('collections').create({
        user_id: payload.sub.id,
        name,
        description,
        is_public: isPublic,
      })

      return result
        .andThen((newCollection) => dto(CollectionSchema, newCollection))
        .match(
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
      description: 'Updates a collection. Only the collection owner can perform this action.',
      responses: {
        200: {
          description: 'Collection updated',
          content: { 'application/json': { schema: resolver(CollectionSchema) } },
        },
        401: errResponse('Missing or invalid session cookie'),
        404: errResponse('Collection not found or not owned by current user'),
        500: errResponse('Database error'),
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
      const { id } = ctx.req.valid('param')
      const { name, description, isPublic } = ctx.req.valid('json')

      const payload = ctx.get('userPayload')

      const result = await ctx.get('collections').update(id, payload.sub.id, {
        name,
        description,
        is_public: isPublic,
      })

      return result
        .andThen((updatedCollection) => dto(CollectionSchema, updatedCollection))
        .match(
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
      description: 'Deletes a collection. Only the collection owner can perform this action.',
      responses: {
        200: {
          description: 'Collection deleted',
          content: { 'application/json': { schema: resolver(CollectionSchema) } },
        },
        401: errResponse('Missing or invalid session cookie'),
        404: errResponse('Collection not found or not owned by current user'),
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const payload = ctx.get('userPayload')

      const result = await ctx.get('collections').delete(id, payload.sub.id)

      return result
        .andThen((deletedCollection) => dto(CollectionSchema, deletedCollection))
        .match(
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
      description: 'Returns a paginated list of cocktails in a collection. Private collections are only accessible to their owner.',
      responses: {
        200: {
          description: 'Paginated list of collection cocktails',
          content: { 'application/json': { schema: resolver(CollectionCocktailPaginatedSchema) } },
        },
        404: errResponse('Collection not found or not accessible'),
        500: errResponse('Database error'),
      },
    }),
    validator('param', type({ collectionId: 'string' })),
    validator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const { collectionId } = ctx.req.valid('param')
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = env.PAGE_SIZE
      const COOKIE_SECRET = env.COOKIE_SECRET
      const sessionId = await getSignedCookie(ctx, COOKIE_SECRET, 'session_id')
      let userId: string | undefined
      if (sessionId) {
        const session = await ctx.get('sessionService').validate(sessionId)
        if (session.isOk()) userId = session.value.sub.id
      }

      const result = await ctx.get('collections').listCocktails(collectionId, page, pageSize, userId)

      return result
        .andThen((cocktails) => dto(CollectionCocktailPaginatedSchema, cocktails))
        .match(
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
      description: 'Adds a cocktail to a collection. Only the collection owner can add cocktails.',
      responses: {
        201: {
          description: 'Cocktail added to collection',
          content: { 'application/json': { schema: resolver(CollectionCocktailSchema) } },
        },
        401: errResponse('Missing or invalid session cookie'),
        500: errResponse('Collection not found or not owned, or database error'),
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
      const { collectionId } = ctx.req.valid('param')
      const { cocktailId } = ctx.req.valid('json')
      const payload = ctx.get('userPayload')

      const result = await ctx.get('collections').addCocktail({
        collection_id: collectionId,
        cocktail_id: cocktailId,
      }, payload.sub.id)

      return result
        .andThen((added) => dto(CollectionCocktailSchema, added))
        .match(
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
      description: 'Removes a cocktail from a collection. Only the collection owner can remove cocktails.',
      responses: {
        200: {
          description: 'Cocktail removed from collection',
          content: { 'application/json': { schema: resolver(CollectionCocktailSchema) } },
        },
        401: errResponse('Missing or invalid session cookie'),
        404: errResponse('Collection cocktail not found or not owned by current user'),
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')
      const payload = ctx.get('userPayload')

      const result = await ctx.get('collections').removeCocktail(id, payload.sub.id)

      return result
        .andThen((removed) => dto(CollectionCocktailSchema, removed))
        .match(
          (removed) => ctx.json(removed, 200),
          (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )

export default collectionsRoute
