import type { Database } from '@repo/schemas'
import type { Ingredient, IngredientInsert, IngredientUpdate } from '@repo/schemas/ingredients'
import type { Kysely } from 'kysely'
import { ResultAsync } from 'neverthrow'
import { cleanUpdate, dbDelete, dbInsert, dbQueryFirst, dbQueryPaginated, dbUpdate, type PaginatedResult } from 'src/shared/db-helpers'
import { AppError } from 'src/shared/errors'

type DB = Kysely<Database>

export function listIngredients(
  db: DB,
  page: number,
  pageSize: number
): ResultAsync<PaginatedResult<Ingredient>, AppError> {
  return dbQueryPaginated(
    db,
    (trx) => trx.selectFrom('ingredients').select((eb) => eb.fn.countAll().as('count')).execute(),
    (trx) =>
      trx
        .selectFrom('ingredients')
        .selectAll()
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .orderBy('updated_at', 'desc')
        .execute(),
    page,
    pageSize
  )
}

export function getIngredientById(db: DB, id: string): ResultAsync<Ingredient, AppError> {
  return dbQueryFirst(
    () =>
      db
        .selectFrom('ingredients')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst(),
    AppError.notFound('Ingredient')
  )
}

export function createIngredient(
  db: DB,
  data: IngredientInsert
): ResultAsync<Ingredient, AppError> {
  return dbInsert(
    () =>
      db
        .insertInto('ingredients')
        .values({
          name: data.name,
          description: data.description,
          category: data.category,
          is_alcoholic: data.is_alcoholic,
          alcohol_type_id: data.alcohol_type_id,
          image_url: data.image_url,
        })
        .returningAll()
        .executeTakeFirst(),
    'Failed to create ingredient'
  )
}

export function updateIngredient(
  db: DB,
  id: string,
  data: IngredientUpdate
): ResultAsync<Ingredient, AppError> {
  return dbUpdate(
    () =>
      db
        .updateTable('ingredients')
        .set(cleanUpdate(data))
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst(),
    AppError.notFound('Ingredient')
  )
}

export function deleteIngredient(db: DB, id: string): ResultAsync<Ingredient, AppError> {
  return dbDelete(
    () =>
      db
        .deleteFrom('ingredients')
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst(),
    AppError.notFound('Ingredient')
  )
}
