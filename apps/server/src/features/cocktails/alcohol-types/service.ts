import type { Database } from '@repo/schemas'
import { AlcoholType, AlcoholTypeInsert, AlcoholTypeUpdate } from '@repo/schemas/alcohol-types'
import type { Kysely } from 'kysely'
import { ResultAsync } from 'neverthrow'
import { cleanUpdate, dbDelete, dbInsert, dbQueryFirst, dbQueryPaginated, dbUpdate, type PaginatedResult } from 'src/shared/db-helpers'
import { Errors, type AppError } from 'src/shared/errors'

type DB = Kysely<Database>

export function listAlcoholTypes(db: DB, page: number, pageSize: number): ResultAsync<PaginatedResult<AlcoholType>, AppError> {
  return dbQueryPaginated(
    db,
    (trx) => trx.selectFrom('alcohol_types').select((eb) => eb.fn.countAll().as('count')).execute(),
    (trx) => trx.selectFrom('alcohol_types').selectAll().limit(pageSize).offset((page - 1) * pageSize).orderBy('updated_at', 'desc').execute(),
    page,
    pageSize
  )
}

export function getAlcoholTypeById(db: DB, id: string): ResultAsync<AlcoholType, AppError> {
  return dbQueryFirst(
    () => db.selectFrom('alcohol_types').selectAll().where('id', '=', id).executeTakeFirst(),
    Errors.notFound('AlcoholType')
  )
}

export function createAlcoholType(db: DB, data: AlcoholTypeInsert): ResultAsync<AlcoholType, AppError> {
  return dbInsert(
    () =>
      db.insertInto('alcohol_types')
        .values({ name: data.name, description: data.description, abv_range_min: data.abv_range_min, abv_range_max: data.abv_range_max })
        .returningAll().executeTakeFirst(),
    'Failed to create alcohol type'
  )
}

export function updateAlcoholType(db: DB, id: string, data: AlcoholTypeUpdate): ResultAsync<AlcoholType, AppError> {
  return dbUpdate(
    () =>
      db.updateTable('alcohol_types')
        .set(cleanUpdate(data))
        .where('id', '=', id).returningAll().executeTakeFirst(),
    Errors.notFound('AlcoholType')
  )
}

export function deleteAlcoholType(db: DB, id: string): ResultAsync<AlcoholType, AppError> {
  return dbDelete(
    () => db.deleteFrom('alcohol_types').where('id', '=', id).returningAll().executeTakeFirst(),
    Errors.notFound('AlcoholType')
  )
}
