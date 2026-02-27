import type { Database } from '@repo/schemas'
import type { CocktailIngredient, CocktailIngredientInsert, CocktailIngredientUpdate } from '@repo/schemas/cocktail-ingredients'
import type { CocktailPhoto, CocktailPhotoInsert } from '@repo/schemas/cocktail-photos'
import type { PreparationStep, PreparationStepInsert, PreparationStepUpdate } from '@repo/schemas/preparation-steps'
import type { CocktailStyleJunction, CocktailStyleJunctionInsert } from '@repo/schemas/cocktail-styles-junction'
import type { Kysely } from 'kysely'
import type { ResultAsync } from 'neverthrow'
import { cleanUpdate, dbDelete, dbInsert, dbQueryMany, dbUpdate } from 'src/shared/db-helpers'
import { AppError } from 'src/shared/errors'

type DB = Kysely<Database>

// --- Cocktail Ingredients ---

export function listCocktailIngredients(
  db: DB,
  cocktailId: string
): ResultAsync<CocktailIngredient[], AppError> {
  return dbQueryMany(() =>
    db
      .selectFrom('cocktail_ingredients')
      .selectAll()
      .where('cocktail_id', '=', cocktailId)
      .orderBy('created_at', 'asc')
      .execute()
  )
}

export function createCocktailIngredient(
  db: DB,
  data: CocktailIngredientInsert
): ResultAsync<CocktailIngredient, AppError> {
  return dbInsert(
    () =>
      db
        .insertInto('cocktail_ingredients')
        .values({
          cocktail_id: data.cocktail_id,
          ingredient_id: data.ingredient_id,
          quantity: data.quantity,
          unit: data.unit,
          notes: data.notes,
        })
        .returningAll()
        .executeTakeFirst(),
    'Failed to create cocktail ingredient'
  )
}

export function updateCocktailIngredient(
  db: DB,
  id: string,
  data: CocktailIngredientUpdate
): ResultAsync<CocktailIngredient, AppError> {
  return dbUpdate(
    () =>
      db
        .updateTable('cocktail_ingredients')
        .set(cleanUpdate(data))
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst(),
    AppError.notFound('CocktailIngredient')
  )
}

export function deleteCocktailIngredient(
  db: DB,
  id: string
): ResultAsync<CocktailIngredient, AppError> {
  return dbDelete(
    () =>
      db
        .deleteFrom('cocktail_ingredients')
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst(),
    AppError.notFound('CocktailIngredient')
  )
}

// --- Cocktail Photos ---

export function listCocktailPhotos(
  db: DB,
  cocktailId: string
): ResultAsync<CocktailPhoto[], AppError> {
  return dbQueryMany(() =>
    db
      .selectFrom('cocktail_photos')
      .selectAll()
      .where('cocktail_id', '=', cocktailId)
      .orderBy('created_at', 'asc')
      .execute()
  )
}

export function createCocktailPhoto(
  db: DB,
  data: CocktailPhotoInsert
): ResultAsync<CocktailPhoto, AppError> {
  return dbInsert(
    () =>
      db
        .insertInto('cocktail_photos')
        .values({
          cocktail_id: data.cocktail_id,
          url: data.url,
          alt_text: data.alt_text,
          is_primary: data.is_primary,
        })
        .returningAll()
        .executeTakeFirst(),
    'Failed to create cocktail photo'
  )
}

export function deleteCocktailPhoto(
  db: DB,
  id: string
): ResultAsync<CocktailPhoto, AppError> {
  return dbDelete(
    () =>
      db
        .deleteFrom('cocktail_photos')
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst(),
    AppError.notFound('CocktailPhoto')
  )
}

// --- Preparation Steps ---

export function listPreparationSteps(
  db: DB,
  cocktailId: string
): ResultAsync<PreparationStep[], AppError> {
  return dbQueryMany(() =>
    db
      .selectFrom('preparation_steps')
      .selectAll()
      .where('cocktail_id', '=', cocktailId)
      .orderBy('step_number', 'asc')
      .execute()
  )
}

export function createPreparationStep(
  db: DB,
  data: PreparationStepInsert
): ResultAsync<PreparationStep, AppError> {
  return dbInsert(
    () =>
      db
        .insertInto('preparation_steps')
        .values({
          cocktail_id: data.cocktail_id,
          step_number: data.step_number,
          instruction: data.instruction,
          image_url: data.image_url,
        })
        .returningAll()
        .executeTakeFirst(),
    'Failed to create preparation step'
  )
}

export function updatePreparationStep(
  db: DB,
  id: string,
  data: PreparationStepUpdate
): ResultAsync<PreparationStep, AppError> {
  return dbUpdate(
    () =>
      db
        .updateTable('preparation_steps')
        .set(cleanUpdate(data))
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst(),
    AppError.notFound('PreparationStep')
  )
}

export function deletePreparationStep(
  db: DB,
  id: string
): ResultAsync<PreparationStep, AppError> {
  return dbDelete(
    () =>
      db
        .deleteFrom('preparation_steps')
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst(),
    AppError.notFound('PreparationStep')
  )
}

// --- Cocktail Styles Junction ---

export function listCocktailStyleLinks(
  db: DB,
  cocktailId: string
): ResultAsync<CocktailStyleJunction[], AppError> {
  return dbQueryMany(() =>
    db
      .selectFrom('cocktail_styles_junction')
      .selectAll()
      .where('cocktail_id', '=', cocktailId)
      .execute()
  )
}

export function addCocktailStyle(
  db: DB,
  data: CocktailStyleJunctionInsert
): ResultAsync<CocktailStyleJunction, AppError> {
  return dbInsert(
    () =>
      db
        .insertInto('cocktail_styles_junction')
        .values({
          cocktail_id: data.cocktail_id,
          style_id: data.style_id,
        })
        .returningAll()
        .executeTakeFirst(),
    'Failed to add cocktail style'
  )
}

export function removeCocktailStyle(
  db: DB,
  id: string
): ResultAsync<CocktailStyleJunction, AppError> {
  return dbDelete(
    () =>
      db
        .deleteFrom('cocktail_styles_junction')
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst(),
    AppError.notFound('CocktailStyleJunction')
  )
}
