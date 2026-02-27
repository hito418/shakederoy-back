import type { Database } from '@repo/schemas'
import { Glass, GlassInsert, GlassUpdate } from '@repo/schemas/glasses'
import type { Kysely } from 'kysely'
import { ResultAsync } from 'neverthrow'
import { cleanUpdate, dbDelete, dbInsert, dbQueryFirst, dbQueryPaginated, dbUpdate, type PaginatedResult } from 'src/shared/db-helpers'
import { AppError } from 'src/shared/errors'

type DB = Kysely<Database>

export function listGlasses(
  db: DB,
  page: number,
  pageSize: number
): ResultAsync<PaginatedResult<Glass>, AppError> {
  return dbQueryPaginated(
    db,
    (trx) => trx.selectFrom('glasses').select((eb) => eb.fn.countAll().as('count')).execute(),
    (trx) =>
      trx
        .selectFrom('glasses')
        .selectAll()
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .orderBy('updated_at', 'desc')
        .execute(),
    page,
    pageSize
  )
}

export function getGlassById(db: DB, id: string): ResultAsync<Glass, AppError> {
  return dbQueryFirst(
    () =>
      db
        .selectFrom('glasses')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst(),
    AppError.notFound('Glass')
  )
}

export function createGlass(
  db: DB,
  data: GlassInsert
): ResultAsync<Glass, AppError> {
  return dbInsert(
    () =>
      db
        .insertInto('glasses')
        .values({
          name: data.name,
          description: data.description,
          capacity: data.capacity,
          image_url: data.image_url,
        })
        .returningAll()
        .executeTakeFirst(),
    'Failed to create glass'
  )
}

export function updateGlass(
  db: DB,
  id: string,
  data: GlassUpdate
): ResultAsync<Glass, AppError> {
  return dbUpdate(
    () =>
      db
        .updateTable('glasses')
        .set(cleanUpdate(data))
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst(),
    AppError.notFound('Glass')
  )
}

export function deleteGlass(db: DB, id: string): ResultAsync<Glass, AppError> {
  return dbDelete(
    () =>
      db
        .deleteFrom('glasses')
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst(),
    AppError.notFound('Glass')
  )
}
