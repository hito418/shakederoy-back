import type { Database } from '@repo/schemas'
import { Cocktail, CocktailInsert, CocktailUpdate } from '@repo/schemas/cocktails'
import type { Kysely } from 'kysely'
import { ResultAsync } from 'neverthrow'
import { cleanUpdate, dbDelete, dbInsert, dbQueryFirst, dbQueryPaginated, dbUpdate, type PaginatedResult } from 'src/shared/db-helpers'
import { AppError } from 'src/shared/errors'

type DB = Kysely<Database>

export function listCocktails(
  db: DB,
  page: number,
  pageSize: number
): ResultAsync<PaginatedResult<Cocktail>, AppError> {
  return dbQueryPaginated(
    db,
    (trx) => trx.selectFrom('cocktails').select((eb) => eb.fn.countAll().as('count')).execute(),
    (trx) =>
      trx
        .selectFrom('cocktails')
        .selectAll()
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .orderBy('updated_at', 'desc')
        .execute(),
    page,
    pageSize
  )
}

export function getCocktailById(db: DB, id: string): ResultAsync<Cocktail, AppError> {
  return dbQueryFirst(
    () =>
      db
        .selectFrom('cocktails')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst(),
    AppError.notFound('Cocktail')
  )
}

export function createCocktail(
  db: DB,
  data: CocktailInsert
): ResultAsync<Cocktail, AppError> {
  return dbInsert(
    () =>
      db
        .insertInto('cocktails')
        .values(data)
        .returningAll()
        .executeTakeFirst(),
    'Failed to create cocktail'
  )
}

export function updateCocktail(
  db: DB,
  id: string,
  data: CocktailUpdate
): ResultAsync<Cocktail, AppError> {
  return dbUpdate(
    () =>
      db
        .updateTable('cocktails')
        .set(cleanUpdate(data))
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst(),
    AppError.notFound('Cocktail')
  )
}

export function deleteCocktail(db: DB, id: string): ResultAsync<Cocktail, AppError> {
  return dbDelete(
    () =>
      db
        .deleteFrom('cocktails')
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst(),
    AppError.notFound('Cocktail')
  )
}
