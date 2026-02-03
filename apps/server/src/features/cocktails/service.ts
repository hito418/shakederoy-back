import type { Database } from '@repo/schemas'
import { Cocktail, CocktailInsert, CocktailUpdate } from '@repo/schemas/cocktails'
import type { Kysely } from 'kysely'
import { ResultAsync } from 'neverthrow'
import { dbDelete, dbInsert, dbQueryFirst, dbQueryMany, dbUpdate } from 'src/shared/db-helpers'
import { Errors, type AppError } from 'src/shared/errors'

type DB = Kysely<Database>

export function listCocktails(
  db: DB,
  page: number,
  pageSize: number
): ResultAsync<Cocktail[], AppError> {
  return dbQueryMany(() =>
    db
      .selectFrom('cocktails')
      .selectAll()
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .orderBy('updated_at', 'desc')
      .execute()
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
    Errors.notFound('Cocktail')
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
        .values({
          name: data.name,
          description: data.description,
          ingredients: data.ingredients,
          instructions: data.instructions,
        })
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
        .set({
          ...(data.name ? { name: data.name } : {}),
          ...(data.description ? { description: data.description } : {}),
          ...(data.ingredients ? { ingredients: data.ingredients } : {}),
          ...(data.instructions ? { instructions: data.instructions } : {}),
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst(),
    Errors.notFound('Cocktail')
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
    Errors.notFound('Cocktail')
  )
}
