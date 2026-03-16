import type { Cocktail, CocktailInsert, CocktailUpdate } from '@repo/schemas/cocktails'
import type { ResultAsync } from 'neverthrow'
import { DbService, type PaginatedResult } from 'src/shared/db-service'
import { AppError } from 'src/shared/errors'

export class CocktailsService {
  constructor(private db: DbService) {}

  list(
    page: number,
    pageSize: number
  ): ResultAsync<PaginatedResult<Cocktail>, AppError> {
    return this.db.queryPaginated(
      (trx) =>
        trx
          .selectFrom('cocktails')
          .select((eb) => eb.fn.countAll().as('count'))
          .execute(),
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

  getById(id: string): ResultAsync<Cocktail, AppError> {
    return this.db.queryFirst(
      (db) =>
        db
          .selectFrom('cocktails')
          .selectAll()
          .where('id', '=', id)
          .executeTakeFirst(),
      AppError.notFound('Cocktail')
    )
  }

  create(data: CocktailInsert): ResultAsync<Cocktail, AppError> {
    return this.db.insert(
      (db) =>
        db
          .insertInto('cocktails')
          .values(data)
          .returningAll()
          .executeTakeFirst(),
      'Failed to create cocktail'
    )
  }

  update(
    id: string,
    data: CocktailUpdate
  ): ResultAsync<Cocktail, AppError> {
    return this.db.update(
      (db) =>
        db
          .updateTable('cocktails')
          .set(DbService.cleanUpdate(data))
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('Cocktail')
    )
  }

  delete(id: string): ResultAsync<Cocktail, AppError> {
    return this.db.delete(
      (db) =>
        db
          .deleteFrom('cocktails')
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('Cocktail')
    )
  }
}
