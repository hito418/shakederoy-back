import type {
  Collection,
  CollectionInsert,
  CollectionUpdate,
  CollectionCocktail,
  CollectionCocktailInsert,
} from '@repo/schemas/collections'
import { ResultAsync } from 'neverthrow'
import { DbService, type PaginatedResult } from 'src/shared/db-service'
import { AppError } from 'src/shared/errors'

export class CollectionsService {
  constructor(private db: DbService) {}

  // ── Collections ──────────────────────────────────────────────

  list(
    userId: string,
    page: number,
    pageSize: number
  ): ResultAsync<PaginatedResult<Collection>, AppError> {
    return this.db.queryPaginated(
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

  listPublic(
    page: number,
    pageSize: number
  ): ResultAsync<PaginatedResult<Collection>, AppError> {
    return this.db.queryPaginated(
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

  getById(
    id: string,
    userId?: string
  ): ResultAsync<Collection, AppError> {
    return this.db.queryFirst(
      (db) =>
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
      AppError.notFound('Collection')
    )
  }

  create(data: CollectionInsert): ResultAsync<Collection, AppError> {
    return this.db.insert(
      (db) =>
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

  update(
    id: string,
    userId: string,
    data: CollectionUpdate
  ): ResultAsync<Collection, AppError> {
    return this.db.update(
      (db) =>
        db
          .updateTable('collections')
          .set(DbService.cleanUpdate(data))
          .where('id', '=', id)
          .where('user_id', '=', userId)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('Collection')
    )
  }

  delete(
    id: string,
    userId: string
  ): ResultAsync<Collection, AppError> {
    return this.db.delete(
      (db) =>
        db
          .deleteFrom('collections')
          .where('id', '=', id)
          .where('user_id', '=', userId)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('Collection')
    )
  }

  // ── Collection Cocktails ─────────────────────────────────────

  listCocktails(
    collectionId: string,
    page: number,
    pageSize: number,
    userId?: string
  ): ResultAsync<PaginatedResult<CollectionCocktail>, AppError> {
    return this.db
      .queryFirst(
        (db) =>
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
        AppError.notFound('Collection')
      )
      .andThen(() =>
        this.db.queryPaginated(
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

  addCocktail(
    data: CollectionCocktailInsert,
    userId: string
  ): ResultAsync<CollectionCocktail, AppError> {
    return this.db.transaction(async (trx) => {
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

  removeCocktail(
    id: string,
    userId: string
  ): ResultAsync<CollectionCocktail, AppError> {
    return this.db.delete(
      (db) =>
        db
          .deleteFrom('collection_cocktails')
          .where('id', '=', id)
          .where(
            'collection_id',
            'in',
            db
              .selectFrom('collections')
              .select('id')
              .where('user_id', '=', userId)
          )
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('CollectionCocktail')
    )
  }
}
