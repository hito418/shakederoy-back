import type {
  AlcoholType,
  AlcoholTypeInsert,
  AlcoholTypeUpdate,
} from '@repo/schemas/alcohol-types'
import type { ResultAsync } from 'neverthrow'
import { DbService, type PaginatedResult } from 'src/shared/db-service'
import { AppError } from 'src/shared/errors'

export class AlcoholTypesService {
  constructor(private db: DbService) {}

  list(
    page: number,
    pageSize: number
  ): ResultAsync<PaginatedResult<AlcoholType>, AppError> {
    return this.db.queryPaginated(
      (trx) =>
        trx
          .selectFrom('alcohol_types')
          .select((eb) => eb.fn.countAll().as('count'))
          .execute(),
      (trx) =>
        trx
          .selectFrom('alcohol_types')
          .selectAll()
          .limit(pageSize)
          .offset((page - 1) * pageSize)
          .orderBy('updated_at', 'desc')
          .execute(),
      page,
      pageSize
    )
  }

  getById(id: string): ResultAsync<AlcoholType, AppError> {
    return this.db.queryFirst(
      (db) =>
        db
          .selectFrom('alcohol_types')
          .selectAll()
          .where('id', '=', id)
          .executeTakeFirst(),
      AppError.notFound('AlcoholType')
    )
  }

  create(data: AlcoholTypeInsert): ResultAsync<AlcoholType, AppError> {
    return this.db.insert(
      (db) =>
        db
          .insertInto('alcohol_types')
          .values({
            name: data.name,
            description: data.description,
            abv_range_min: data.abv_range_min,
            abv_range_max: data.abv_range_max,
          })
          .returningAll()
          .executeTakeFirst(),
      'Failed to create alcohol type'
    )
  }

  update(
    id: string,
    data: AlcoholTypeUpdate
  ): ResultAsync<AlcoholType, AppError> {
    return this.db.update(
      (db) =>
        db
          .updateTable('alcohol_types')
          .set(DbService.cleanUpdate(data))
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('AlcoholType')
    )
  }

  delete(id: string): ResultAsync<AlcoholType, AppError> {
    return this.db.delete(
      (db) =>
        db
          .deleteFrom('alcohol_types')
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('AlcoholType')
    )
  }
}
