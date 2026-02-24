import type { Database } from '@repo/schemas'
import type { Kysely } from 'kysely'
import { ResultAsync } from 'neverthrow'
import { dbInsert, fromPromise } from 'src/shared/db-helpers'
import { Errors, type AppError } from 'src/shared/errors'
import { getCocktailById, toCocktailListItem, type CocktailListItem } from 'src/features/cocktails/service'

type DB = Kysely<Database>

export interface FavoriteMutationResult {
  cocktailId: string
  isFavorite: boolean
}

export function listFavorites(db: DB, userId: string): ResultAsync<CocktailListItem[], AppError> {
  return fromPromise(
    (async () => {
      const favorites = await db
        .selectFrom('user_favorites as uf')
        .innerJoin('cocktails as c', 'c.id', 'uf.cocktail_id')
        .select('c.id')
        .where('uf.user_id', '=', userId)
        .where('c.deleted_at', 'is', null)
        .orderBy('uf.created_at', 'desc')
        .execute()

      if (favorites.length === 0) {
        return []
      }

      const cocktailRows = await db
        .selectFrom('cocktails')
        .selectAll()
        .where(
          'id',
          'in',
          favorites.map((favorite) => favorite.id)
        )
        .where('deleted_at', 'is', null)
        .execute()

      const cocktailMap = new Map(cocktailRows.map((cocktail) => [cocktail.id, cocktail]))

      const orderedRows = favorites
        .map((favorite) => cocktailMap.get(favorite.id))
        .filter((cocktail): cocktail is Database['cocktails'] => Boolean(cocktail))

      return Promise.all(orderedRows.map((cocktail) => toCocktailListItem(db, cocktail)))
    })(),
    () => Errors.databaseError('Failed to list favorites')
  )
}

export function isFavorite(
  db: DB,
  userId: string,
  cocktailId: string
): ResultAsync<boolean, AppError> {
  return fromPromise(
    db
      .selectFrom('user_favorites')
      .select('id')
      .where('user_id', '=', userId)
      .where('cocktail_id', '=', cocktailId)
      .executeTakeFirst()
      .then((row) => Boolean(row)),
    () => Errors.databaseError('Failed to check favorite')
  )
}

export function addFavorite(
  db: DB,
  userId: string,
  cocktailId: string
): ResultAsync<FavoriteMutationResult, AppError> {
  return getCocktailById(db, cocktailId).andThen(() =>
    isFavorite(db, userId, cocktailId).andThen((alreadyFavorite) => {
      if (alreadyFavorite) {
        return fromPromise(
          Promise.resolve({ cocktailId, isFavorite: true }),
          () => Errors.internalError()
        )
      }

      return dbInsert(
        () =>
          db
            .insertInto('user_favorites')
            .values({
              user_id: userId,
              cocktail_id: cocktailId,
            } as any)
            .returning('id')
            .executeTakeFirst(),
        'Failed to add favorite'
      ).map(() => ({ cocktailId, isFavorite: true }))
    })
  )
}

export function removeFavorite(
  db: DB,
  userId: string,
  cocktailId: string
): ResultAsync<FavoriteMutationResult, AppError> {
  return fromPromise(
    db
      .deleteFrom('user_favorites')
      .where('user_id', '=', userId)
      .where('cocktail_id', '=', cocktailId)
      .execute(),
    () => Errors.databaseError('Failed to remove favorite')
  ).map(() => ({ cocktailId, isFavorite: false }))
}

export function toggleFavorite(
  db: DB,
  userId: string,
  cocktailId: string
): ResultAsync<FavoriteMutationResult, AppError> {
  return isFavorite(db, userId, cocktailId).andThen((favorite) =>
    favorite ? removeFavorite(db, userId, cocktailId) : addFavorite(db, userId, cocktailId)
  )
}
