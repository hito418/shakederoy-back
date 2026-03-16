import type { Glass, GlassInsert, GlassUpdate } from '@repo/schemas/glasses'
import type { ResultAsync } from 'neverthrow'
import { DbService, type PaginatedResult } from 'src/shared/db-service'
import { AppError } from 'src/shared/errors'

export class GlassesService {
  constructor(private db: DbService) {}

  list(
    page: number,
    pageSize: number
  ): ResultAsync<PaginatedResult<Glass>, AppError> {
    return this.db.queryPaginated(
      (trx) =>
        trx
          .selectFrom('glasses')
          .select((eb) => eb.fn.countAll().as('count'))
          .execute(),
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

  getById(id: string): ResultAsync<Glass, AppError> {
    return this.db.queryFirst(
      (db) =>
        db
          .selectFrom('glasses')
          .selectAll()
          .where('id', '=', id)
          .executeTakeFirst(),
      AppError.notFound('Glass')
    )
  }

  create(data: GlassInsert): ResultAsync<Glass, AppError> {
    return this.db.insert(
      (db) =>
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

  update(id: string, data: GlassUpdate): ResultAsync<Glass, AppError> {
    return this.db.update(
      (db) =>
        db
          .updateTable('glasses')
          .set(DbService.cleanUpdate(data))
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('Glass')
    )
  }

  delete(id: string): ResultAsync<Glass, AppError> {
    return this.db.delete(
      (db) =>
        db
          .deleteFrom('glasses')
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('Glass')
    )
  }
}
