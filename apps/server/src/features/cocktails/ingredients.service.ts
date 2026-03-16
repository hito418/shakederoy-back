import type {
  Ingredient,
  IngredientInsert,
  IngredientUpdate,
} from '@repo/schemas/ingredients'
import type { ResultAsync } from 'neverthrow'
import { DbService, type PaginatedResult } from 'src/shared/db-service'
import { AppError } from 'src/shared/errors'

export class IngredientsService {
  constructor(private db: DbService) {}

  list(
    page: number,
    pageSize: number
  ): ResultAsync<PaginatedResult<Ingredient>, AppError> {
    return this.db.queryPaginated(
      (trx) =>
        trx
          .selectFrom('ingredients')
          .select((eb) => eb.fn.countAll().as('count'))
          .execute(),
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

  getById(id: string): ResultAsync<Ingredient, AppError> {
    return this.db.queryFirst(
      (db) =>
        db
          .selectFrom('ingredients')
          .selectAll()
          .where('id', '=', id)
          .executeTakeFirst(),
      AppError.notFound('Ingredient')
    )
  }

  create(data: IngredientInsert): ResultAsync<Ingredient, AppError> {
    return this.db.insert(
      (db) =>
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

  update(
    id: string,
    data: IngredientUpdate
  ): ResultAsync<Ingredient, AppError> {
    return this.db.update(
      (db) =>
        db
          .updateTable('ingredients')
          .set(DbService.cleanUpdate(data))
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('Ingredient')
    )
  }

  delete(id: string): ResultAsync<Ingredient, AppError> {
    return this.db.delete(
      (db) =>
        db
          .deleteFrom('ingredients')
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('Ingredient')
    )
  }
}
