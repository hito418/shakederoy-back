import type {
  CocktailIngredient,
  CocktailIngredientInsert,
  CocktailIngredientUpdate,
} from '@repo/schemas/cocktail-ingredients'
import type {
  CocktailPhoto,
  CocktailPhotoInsert,
} from '@repo/schemas/cocktail-photos'
import type {
  PreparationStep,
  PreparationStepInsert,
  PreparationStepUpdate,
} from '@repo/schemas/preparation-steps'
import type {
  CocktailStyleJunction,
  CocktailStyleJunctionInsert,
} from '@repo/schemas/cocktail-styles-junction'
import type { ResultAsync } from 'neverthrow'
import { DbService } from 'src/shared/db-service'
import { AppError } from 'src/shared/errors'

export class ExtrasService {
  constructor(private db: DbService) {}

  // --- Cocktail Ingredients ---

  listIngredients(
    cocktailId: string
  ): ResultAsync<CocktailIngredient[], AppError> {
    return this.db.queryMany((db) =>
      db
        .selectFrom('cocktail_ingredients')
        .innerJoin('ingredients', 'ingredients.id', 'cocktail_ingredients.ingredient_id')
        .select([
          'cocktail_ingredients.id',
          'cocktail_ingredients.cocktail_id',
          'cocktail_ingredients.ingredient_id',
          'cocktail_ingredients.quantity',
          'cocktail_ingredients.unit',
          'cocktail_ingredients.notes',
          'cocktail_ingredients.created_at',
          'cocktail_ingredients.updated_at',
          'ingredients.name as ingredient_name',
        ])
        .where('cocktail_ingredients.cocktail_id', '=', cocktailId)
        .orderBy('cocktail_ingredients.created_at', 'asc')
        .execute()
    )
  }

  createIngredient(
    data: CocktailIngredientInsert
  ): ResultAsync<CocktailIngredient, AppError> {
    return this.db.insert(
      (db) =>
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

  updateIngredient(
    id: string,
    data: CocktailIngredientUpdate
  ): ResultAsync<CocktailIngredient, AppError> {
    return this.db.update(
      (db) =>
        db
          .updateTable('cocktail_ingredients')
          .set(DbService.cleanUpdate(data))
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('CocktailIngredient')
    )
  }

  deleteIngredient(
    id: string
  ): ResultAsync<CocktailIngredient, AppError> {
    return this.db.delete(
      (db) =>
        db
          .deleteFrom('cocktail_ingredients')
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('CocktailIngredient')
    )
  }

  // --- Cocktail Photos ---

  listPhotos(cocktailId: string): ResultAsync<CocktailPhoto[], AppError> {
    return this.db.queryMany((db) =>
      db
        .selectFrom('cocktail_photos')
        .selectAll()
        .where('cocktail_id', '=', cocktailId)
        .orderBy('created_at', 'asc')
        .execute()
    )
  }

  createPhoto(data: CocktailPhotoInsert): ResultAsync<CocktailPhoto, AppError> {
    return this.db.insert(
      (db) =>
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

  deletePhoto(id: string): ResultAsync<CocktailPhoto, AppError> {
    return this.db.delete(
      (db) =>
        db
          .deleteFrom('cocktail_photos')
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('CocktailPhoto')
    )
  }

  // --- Preparation Steps ---

  listSteps(cocktailId: string): ResultAsync<PreparationStep[], AppError> {
    return this.db.queryMany((db) =>
      db
        .selectFrom('preparation_steps')
        .selectAll()
        .where('cocktail_id', '=', cocktailId)
        .orderBy('step_number', 'asc')
        .execute()
    )
  }

  createStep(
    data: PreparationStepInsert
  ): ResultAsync<PreparationStep, AppError> {
    return this.db.insert(
      (db) =>
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

  updateStep(
    id: string,
    data: PreparationStepUpdate
  ): ResultAsync<PreparationStep, AppError> {
    return this.db.update(
      (db) =>
        db
          .updateTable('preparation_steps')
          .set(DbService.cleanUpdate(data))
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('PreparationStep')
    )
  }

  deleteStep(id: string): ResultAsync<PreparationStep, AppError> {
    return this.db.delete(
      (db) =>
        db
          .deleteFrom('preparation_steps')
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('PreparationStep')
    )
  }

  // --- Cocktail Styles Junction ---

  listStyleLinks(
    cocktailId: string
  ): ResultAsync<CocktailStyleJunction[], AppError> {
    return this.db.queryMany((db) =>
      db
        .selectFrom('cocktail_styles_junction')
        .selectAll()
        .where('cocktail_id', '=', cocktailId)
        .execute()
    )
  }

  addStyle(
    data: CocktailStyleJunctionInsert
  ): ResultAsync<CocktailStyleJunction, AppError> {
    return this.db.insert(
      (db) =>
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

  removeStyle(id: string): ResultAsync<CocktailStyleJunction, AppError> {
    return this.db.delete(
      (db) =>
        db
          .deleteFrom('cocktail_styles_junction')
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('CocktailStyleJunction')
    )
  }
}
