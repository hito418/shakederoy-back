import type { Cocktail, CocktailInsert, CocktailUpdate } from '@repo/schemas/cocktails'
import type { CocktailIngredient } from '@repo/schemas/cocktail-ingredients'
import type { PreparationStep } from '@repo/schemas/preparation-steps'
import type { CocktailStyleJunction } from '@repo/schemas/cocktail-styles-junction'
import type { ResultAsync } from 'neverthrow'
import type { Database } from '@repo/schemas'
import type { SelectQueryBuilder } from 'kysely'
import { sql } from 'kysely'
import { DbService, type PaginatedResult } from 'src/shared/db-service'
import { AppError } from 'src/shared/errors'

export type CocktailSortBy =
  | 'favorites_first'
  | 'name_asc'
  | 'name_desc'
  | 'prep_time_asc'
  | 'prep_time_desc'
  | 'newest'
  | 'most_popular'
  | 'most_viewed'
  | 'best_rated'

export type CocktailListFilters = {
  search?: string
  isAlcoholic?: boolean
  difficulty?: 'easy' | 'medium' | 'hard'
  alcoholTypeId?: string
  styleId?: string
  intensityMin?: number
  intensityMax?: number
  prepTimeMin?: number
  prepTimeMax?: number
  ingredientCountMin?: number
  ingredientCountMax?: number
  favoritesOnly?: boolean
  status?: 'draft' | 'pending' | 'approved' | 'rejected'
  community?: boolean
  sortBy?: CocktailSortBy
  userId?: string
}

export type CreateFullInput = {
  cocktail: CocktailInsert
  ingredients: {
    ingredient_id?: string
    ingredient_name?: string
    quantity?: string
    unit?: string
  }[]
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
    pageSize: number,
    filters: CocktailListFilters = {}
  ): ResultAsync<PaginatedResult<Cocktail>, AppError> {
    const applyFilters = <O>(qb: SelectQueryBuilder<Database, 'cocktails', O>) => {
      let q = qb
      if (filters.search) {
        const escaped = filters.search.replace(/%/g, '\\%').replace(/_/g, '\\_')
        q = q.where('cocktails.name', 'ilike', `%${escaped}%`)
      }
      if (filters.isAlcoholic !== undefined)
        q = q.where('cocktails.is_alcoholic', '=', filters.isAlcoholic)
      if (filters.difficulty)
        q = q.where('cocktails.difficulty', '=', filters.difficulty)
      if (filters.alcoholTypeId)
        q = q.where('cocktails.main_alcohol_id', '=', filters.alcoholTypeId)
      if (filters.styleId)
        q = q.where(
          sql<boolean>`cocktails.id IN (SELECT cocktail_id FROM cocktail_styles_junction WHERE style_id = ${filters.styleId})`
        )
      if (filters.intensityMin !== undefined)
        q = q.where('cocktails.intensity', '>=', filters.intensityMin)
      if (filters.intensityMax !== undefined)
        q = q.where('cocktails.intensity', '<=', filters.intensityMax)
      if (filters.prepTimeMin !== undefined)
        q = q.where('cocktails.prep_time', '>=', filters.prepTimeMin)
      if (filters.prepTimeMax !== undefined)
        q = q.where('cocktails.prep_time', '<=', filters.prepTimeMax)
      if (filters.ingredientCountMin !== undefined)
        q = q.where(
          sql<boolean>`(SELECT COUNT(*) FROM cocktail_ingredients WHERE cocktail_id = cocktails.id) >= ${filters.ingredientCountMin}`
        )
      if (filters.ingredientCountMax !== undefined)
        q = q.where(
          sql<boolean>`(SELECT COUNT(*) FROM cocktail_ingredients WHERE cocktail_id = cocktails.id) <= ${filters.ingredientCountMax}`
        )
      if (filters.favoritesOnly && filters.userId)
        q = q.where(
          sql<boolean>`cocktails.id IN (SELECT cocktail_id FROM user_favorites WHERE user_id = ${filters.userId})`
        )
      if (filters.status)
        q = q.where('cocktails.status', '=', filters.status)
      if (filters.community === true)
        q = q.where('cocktails.created_by_id', 'is not', null)
      else if (filters.community === false)
        q = q.where('cocktails.created_by_id', 'is', null)
      return q
    }

    const applySort = <O>(qb: SelectQueryBuilder<Database, 'cocktails', O>) => {
      switch (filters.sortBy) {
        case 'name_asc':
          return qb.orderBy('cocktails.name', 'asc')
        case 'name_desc':
          return qb.orderBy('cocktails.name', 'desc')
        case 'prep_time_asc':
          return qb.orderBy('cocktails.prep_time', 'asc')
        case 'prep_time_desc':
          return qb.orderBy('cocktails.prep_time', 'desc')
        case 'newest':
          return qb.orderBy('cocktails.created_at', 'desc')
        case 'most_popular':
          return qb.orderBy(
            sql`(SELECT COUNT(*) FROM cocktail_votes WHERE cocktail_id = cocktails.id)`,
            'desc'
          )
        case 'most_viewed':
          return qb.orderBy(
            sql`(SELECT COUNT(*) FROM cocktail_views WHERE cocktail_id = cocktails.id)`,
            'desc'
          )
        case 'best_rated':
          return qb.orderBy(
            sql`COALESCE((SELECT SUM(CASE WHEN vote_type = 'upvote' THEN 1 ELSE -1 END) FROM cocktail_votes WHERE cocktail_id = cocktails.id), 0)`,
            'desc'
          )
        case 'favorites_first':
          if (filters.userId) {
            return qb
              .orderBy(
                sql`EXISTS (SELECT 1 FROM user_favorites WHERE cocktail_id = cocktails.id AND user_id = ${filters.userId})`,
                'desc'
              )
              .orderBy('cocktails.updated_at', 'desc')
          }
          return qb.orderBy('cocktails.updated_at', 'desc')
        default:
          return qb.orderBy('cocktails.updated_at', 'desc')
      }
    }

    return this.db.queryPaginated(
      (trx) =>
        trx
          .selectFrom('cocktails')
          .$call(applyFilters)
          .select((eb) => eb.fn.countAll().as('count'))
          .execute(),
      (trx) =>
        trx
          .selectFrom('cocktails')
          .$call(applyFilters)
          .$call(applySort)
          .selectAll()
          .limit(pageSize)
          .offset((page - 1) * pageSize)
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

      const resolvedIngredients =
        input.ingredients.length > 0
          ? await Promise.all(
              input.ingredients.map(async (ingredient) => {
                if (ingredient.ingredient_id) {
                  return {
                    ingredient_id: ingredient.ingredient_id,
                    quantity: ingredient.quantity,
                    unit: ingredient.unit,
                  }
                }

                const ingredientName = ingredient.ingredient_name?.trim()
                if (!ingredientName) {
                  throw AppError.internalError('Ingredient name or id is required')
                }

                const existingIngredient = await trx
                  .selectFrom('ingredients')
                  .select(['id'])
                  .where(sql<boolean>`LOWER(name) = ${ingredientName.toLowerCase()}`)
                  .executeTakeFirst()

                if (existingIngredient) {
                  return {
                    ingredient_id: existingIngredient.id,
                    quantity: ingredient.quantity,
                    unit: ingredient.unit,
                  }
                }

                const createdIngredient = await trx
                  .insertInto('ingredients')
                  .values({
                    name: ingredientName,
                    category: 'other',
                    is_alcoholic: false,
                  })
                  .returning(['id'])
                  .executeTakeFirst()

                if (!createdIngredient) {
                  throw AppError.databaseError('Failed to create ingredient')
                }

                return {
                  ingredient_id: createdIngredient.id,
                  quantity: ingredient.quantity,
                  unit: ingredient.unit,
                }
              })
            )
          : []

      const ingredients =
        resolvedIngredients.length > 0
          ? await trx
              .insertInto('cocktail_ingredients')
              .values(
                resolvedIngredients.map((i) => ({
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
