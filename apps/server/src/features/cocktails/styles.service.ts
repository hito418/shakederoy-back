import type {
  CocktailStyle,
  CocktailStyleInsert,
  CocktailStyleUpdate,
} from '@repo/schemas/cocktail-styles'
import type { ResultAsync } from 'neverthrow'
import { DbService, type PaginatedResult } from 'src/shared/db-service'
import { AppError } from 'src/shared/errors'

export class StylesService {
  constructor(private db: DbService) {}

  list(
    page: number,
    pageSize: number
  ): ResultAsync<PaginatedResult<CocktailStyle>, AppError> {
    return this.db.queryPaginated(
      (trx) =>
        trx
          .selectFrom('cocktail_styles')
          .select((eb) => eb.fn.countAll().as('count'))
          .execute(),
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

  getById(id: string): ResultAsync<CocktailStyle, AppError> {
    return this.db.queryFirst(
      (db) =>
        db
          .selectFrom('cocktail_styles')
          .selectAll()
          .where('id', '=', id)
          .executeTakeFirst(),
      AppError.notFound('CocktailStyle')
    )
  }

  create(data: CocktailStyleInsert): ResultAsync<CocktailStyle, AppError> {
    return this.db.insert(
      (db) =>
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

  update(
    id: string,
    data: CocktailStyleUpdate
  ): ResultAsync<CocktailStyle, AppError> {
    return this.db.update(
      (db) =>
        db
          .updateTable('cocktail_styles')
          .set(DbService.cleanUpdate(data))
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('CocktailStyle')
    )
  }

  delete(id: string): ResultAsync<CocktailStyle, AppError> {
    return this.db.delete(
      (db) =>
        db
          .deleteFrom('cocktail_styles')
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('CocktailStyle')
    )
  }
}
