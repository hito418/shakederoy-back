import type { Cocktail, CocktailInsert, CocktailUpdate } from '@repo/schemas/cocktails'
import type { CocktailIngredient } from '@repo/schemas/cocktail-ingredients'
import type { PreparationStep } from '@repo/schemas/preparation-steps'
import type { CocktailStyleJunction } from '@repo/schemas/cocktail-styles-junction'
import type { ResultAsync } from 'neverthrow'
import { DbService, type PaginatedResult } from 'src/shared/db-service'
import { AppError } from 'src/shared/errors'

export type CreateFullInput = {
  cocktail: CocktailInsert
  ingredients: { ingredient_id: string; quantity?: string; unit?: string }[]
  steps: string[]
  styleId?: string
}

export type CreateFullResult = {
  cocktail: Cocktail
  ingredients: CocktailIngredient[]
  steps: PreparationStep[]
  style: CocktailStyleJunction | null
}

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

  createFull(input: CreateFullInput): ResultAsync<CreateFullResult, AppError> {
    return this.db.transaction(async (trx) => {
      const cocktail = await trx
        .insertInto('cocktails')
        .values(input.cocktail)
        .returningAll()
        .executeTakeFirst()

      if (!cocktail) return AppError.databaseError('Failed to create cocktail')

      const ingredients =
        input.ingredients.length > 0
          ? await trx
              .insertInto('cocktail_ingredients')
              .values(
                input.ingredients.map((i) => ({
                  cocktail_id: cocktail.id,
                  ingredient_id: i.ingredient_id,
                  quantity: i.quantity,
                  unit: i.unit,
                }))
              )
              .returningAll()
              .execute()
          : []

      const steps =
        input.steps.length > 0
          ? await trx
              .insertInto('preparation_steps')
              .values(
                input.steps.map((instruction, idx) => ({
                  cocktail_id: cocktail.id,
                  step_number: idx + 1,
                  instruction,
                }))
              )
              .returningAll()
              .execute()
          : []

      const style = input.styleId
        ? (await trx
            .insertInto('cocktail_styles_junction')
            .values({
              cocktail_id: cocktail.id,
              style_id: input.styleId,
            })
            .returningAll()
            .executeTakeFirst()) ?? null
        : null

      return { cocktail, ingredients, steps, style }
    })
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
