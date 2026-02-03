import type { Kysely, Selectable } from 'kysely'
import type { Database } from '@repo/schemas'
import { ResultAsync } from 'neverthrow'
import { Errors, type AppError } from 'src/shared/errors'
import { dbQueryMany, dbQueryFirst, dbInsert, dbUpdate, dbDelete } from 'src/shared/db-helpers'

type DB = Kysely<Database>
type CocktailRow = Selectable<Database['cocktails']>

export type { CocktailRow }

export function listCocktails(
  db: DB,
  page: number,
  pageSize: number
): ResultAsync<CocktailRow[], AppError> {
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

export function getCocktailById(db: DB, id: string): ResultAsync<CocktailRow, AppError> {
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

export type CreateCocktailData = {
  name: string
  description: string
  ingredients: string
  instructions: string
}

export function createCocktail(
  db: DB,
  data: CreateCocktailData
): ResultAsync<CocktailRow, AppError> {
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

export type UpdateCocktailData = {
  name?: string
  description?: string
  ingredients?: string
  instructions?: string
}

export function updateCocktail(
  db: DB,
  id: string,
  data: UpdateCocktailData
): ResultAsync<CocktailRow, AppError> {
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

export function deleteCocktail(db: DB, id: string): ResultAsync<CocktailRow, AppError> {
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
