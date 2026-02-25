import type { Database } from '@repo/schemas'
import type { CocktailStyle, CocktailStyleInsert, CocktailStyleUpdate } from '@repo/schemas/cocktail-styles'
import type { Kysely } from 'kysely'
import { ResultAsync } from 'neverthrow'
import { cleanUpdate, dbDelete, dbInsert, dbQueryFirst, dbQueryPaginated, dbUpdate, type PaginatedResult } from 'src/shared/db-helpers'
import { Errors, type AppError } from 'src/shared/errors'

type DB = Kysely<Database>

export function listCocktailStyles(
  db: DB,
  page: number,
  pageSize: number
): ResultAsync<PaginatedResult<CocktailStyle>, AppError> {
  return dbQueryPaginated(
    db,
    (trx) => trx.selectFrom('cocktail_styles').select((eb) => eb.fn.countAll().as('count')).execute(),
    (trx) =>
      trx
        .selectFrom('cocktail_styles')
        .selectAll()
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .orderBy('updated_at', 'desc')
        .execute(),
    page,
    pageSize
  )
}

export function getCocktailStyleById(db: DB, id: string): ResultAsync<CocktailStyle, AppError> {
  return dbQueryFirst(
    () =>
      db
        .selectFrom('cocktail_styles')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst(),
    Errors.notFound('CocktailStyle')
  )
}

export function createCocktailStyle(
  db: DB,
  data: CocktailStyleInsert
): ResultAsync<CocktailStyle, AppError> {
  return dbInsert(
    () =>
      db
        .insertInto('cocktail_styles')
        .values({
          name: data.name,
          description: data.description,
        })
        .returningAll()
        .executeTakeFirst(),
    'Failed to create cocktail style'
  )
}

export function updateCocktailStyle(
  db: DB,
  id: string,
  data: CocktailStyleUpdate
): ResultAsync<CocktailStyle, AppError> {
  return dbUpdate(
    () =>
      db
        .updateTable('cocktail_styles')
        .set(cleanUpdate(data))
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst(),
    Errors.notFound('CocktailStyle')
  )
}

export function deleteCocktailStyle(db: DB, id: string): ResultAsync<CocktailStyle, AppError> {
  return dbDelete(
    () =>
      db
        .deleteFrom('cocktail_styles')
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst(),
    Errors.notFound('CocktailStyle')
  )
}
