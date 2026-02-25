import type { Database } from '@repo/schemas'
import type {
  Collection,
  CollectionInsert,
  CollectionUpdate,
  CollectionCocktail,
  CollectionCocktailInsert,
} from '@repo/schemas/collections'
import type { Kysely } from 'kysely'
import { ResultAsync } from 'neverthrow'
import { cleanUpdate, dbDelete, dbInsert, dbQueryFirst, dbQueryPaginated, dbUpdate, withTransaction, type PaginatedResult } from 'src/shared/db-helpers'
import { Errors, type AppError } from 'src/shared/errors'

type DB = Kysely<Database>

// ── Collections ──────────────────────────────────────────────

export function listCollections(
  db: DB,
  userId: string,
  page: number,
  pageSize: number
): ResultAsync<PaginatedResult<Collection>, AppError> {
  return dbQueryPaginated(
    db,
    (trx) =>
      trx
        .selectFrom('collections')
        .select((eb) => eb.fn.countAll().as('count'))
        .where('user_id', '=', userId)
        .execute(),
    (trx) =>
      trx
        .selectFrom('collections')
        .selectAll()
        .where('user_id', '=', userId)
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .orderBy('updated_at', 'desc')
        .execute(),
    page,
    pageSize
  )
}

export function listPublicCollections(
  db: DB,
  page: number,
  pageSize: number
): ResultAsync<PaginatedResult<Collection>, AppError> {
  return dbQueryPaginated(
    db,
    (trx) =>
      trx
        .selectFrom('collections')
        .select((eb) => eb.fn.countAll().as('count'))
        .where('is_public', '=', true)
        .execute(),
    (trx) =>
      trx
        .selectFrom('collections')
        .selectAll()
        .where('is_public', '=', true)
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .orderBy('updated_at', 'desc')
        .execute(),
    page,
    pageSize
  )
}

export function getCollectionById(
  db: DB,
  id: string,
  userId?: string
): ResultAsync<Collection, AppError> {
  return dbQueryFirst(
    () =>
      db
        .selectFrom('collections')
        .selectAll()
        .where('id', '=', id)
        .where((eb) =>
          eb.or([
            eb('is_public', '=', true),
            ...(userId ? [eb('user_id', '=', userId)] : []),
          ])
        )
        .executeTakeFirst(),
    Errors.notFound('Collection')
  )
}

export function createCollection(
  db: DB,
  data: CollectionInsert
): ResultAsync<Collection, AppError> {
  return dbInsert(
    () =>
      db
        .insertInto('collections')
        .values({
          user_id: data.user_id,
          name: data.name,
          description: data.description,
          is_public: data.is_public,
        })
        .returningAll()
        .executeTakeFirst(),
    'Failed to create collection'
  )
}

export function updateCollection(
  db: DB,
  id: string,
  userId: string,
  data: CollectionUpdate
): ResultAsync<Collection, AppError> {
  return dbUpdate(
    () =>
      db
        .updateTable('collections')
        .set(cleanUpdate(data))
        .where('id', '=', id)
        .where('user_id', '=', userId)
        .returningAll()
        .executeTakeFirst(),
    Errors.notFound('Collection')
  )
}

export function deleteCollection(db: DB, id: string, userId: string): ResultAsync<Collection, AppError> {
  return dbDelete(
    () =>
      db
        .deleteFrom('collections')
        .where('id', '=', id)
        .where('user_id', '=', userId)
        .returningAll()
        .executeTakeFirst(),
    Errors.notFound('Collection')
  )
}

// ── Collection Cocktails ─────────────────────────────────────

export function listCollectionCocktails(
  db: DB,
  collectionId: string,
  page: number,
  pageSize: number,
  userId?: string
): ResultAsync<PaginatedResult<CollectionCocktail>, AppError> {
  return dbQueryFirst(
    () =>
      db
        .selectFrom('collections')
        .select('id')
        .where('id', '=', collectionId)
        .where((eb) =>
          eb.or([
            eb('is_public', '=', true),
            ...(userId ? [eb('user_id', '=', userId)] : []),
          ])
        )
        .executeTakeFirst(),
    Errors.notFound('Collection')
  ).andThen(() =>
    dbQueryPaginated(
      db,
      (trx) =>
        trx
          .selectFrom('collection_cocktails')
          .select((eb) => eb.fn.countAll().as('count'))
          .where('collection_id', '=', collectionId)
          .execute(),
      (trx) =>
        trx
          .selectFrom('collection_cocktails')
          .selectAll()
          .where('collection_id', '=', collectionId)
          .limit(pageSize)
          .offset((page - 1) * pageSize)
          .execute(),
      page,
      pageSize
    )
  )
}

export function addCocktailToCollection(
  db: DB,
  data: CollectionCocktailInsert,
  userId: string
): ResultAsync<CollectionCocktail, AppError> {
  return withTransaction(db, async (trx) => {
    const collection = await trx
      .selectFrom('collections')
      .select('id')
      .where('id', '=', data.collection_id)
      .where('user_id', '=', userId)
      .executeTakeFirst()
    if (!collection) throw new Error('Collection not found')

    const added = await trx
      .insertInto('collection_cocktails')
      .values({
        collection_id: data.collection_id,
        cocktail_id: data.cocktail_id,
      })
      .returningAll()
      .executeTakeFirst()
    if (!added) throw new Error('Failed to add cocktail to collection')
    return added
  })
}

export function removeCocktailFromCollection(
  db: DB,
  id: string,
  userId: string
): ResultAsync<CollectionCocktail, AppError> {
  return dbDelete(
    () =>
      db
        .deleteFrom('collection_cocktails')
        .where('id', '=', id)
        .where(
          'collection_id',
          'in',
          db.selectFrom('collections').select('id').where('user_id', '=', userId)
        )
        .returningAll()
        .executeTakeFirst(),
    Errors.notFound('CollectionCocktail')
  )
}
