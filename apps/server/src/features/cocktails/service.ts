import type { Database } from '@repo/schemas'
import type { User } from '@repo/schemas/users'
import type { Kysely } from 'kysely'
import { ResultAsync } from 'neverthrow'
import { dbInsert, dbQueryFirst, dbUpdate, fromPromise } from 'src/shared/db-helpers'
import { Errors, type AppError } from 'src/shared/errors'

type DB = Kysely<Database>
type CocktailRow = Database['cocktails']

export type AlcoholFilter = 'all' | 'with' | 'without'

export interface CocktailIngredientInput {
  name: string
  amount?: string
  isAlcoholic?: boolean
}

export interface CocktailStepInput {
  description: string
  imageUrl?: string | null
}

export interface CocktailWriteInput {
  name?: string
  description?: string | null
  intensity?: number | string | null
  difficulty?: number | string | null
  prepTime?: number | string | null
  styles?: string[]
  ingredients?: CocktailIngredientInput[]
  steps?: CocktailStepInput[] | string[]
  imageUrl?: string | null
  variantOfId?: string | null
}

export interface ListCocktailsInput {
  page: number
  pageSize: number
  search?: string
  alcohol?: AlcoholFilter
}

export interface CocktailListItem {
  id: string
  name: string
  slug: string
  description: string
  difficulty: 'Facile' | 'Moyen' | 'Difficile'
  duration: string
  alcohol: boolean
  image: string | null
  tags: string[]
  variantOfId: string | null
}

export interface CocktailVariantSummary {
  id: string
  name: string
  slug: string
  image: string | null
}

export interface CocktailDetails extends CocktailListItem {
  intensity: number | null
  prepTime: number | null
  status: Database['cocktails']['status']
  createdById: string | null
  styles: string[]
  ingredients: Array<{
    id: string
    name: string
    amount: string
    isAlcoholic: boolean
  }>
  steps: string[]
  preparationSteps: Array<{
    id: string
    stepNumber: number
    description: string
    imageUrl: string | null
  }>
  photos: Array<{
    id: string
    url: string
    isPrimary: boolean
  }>
  variants: CocktailVariantSummary[]
}

function toDifficultyLabel(value: number | null): 'Facile' | 'Moyen' | 'Difficile' {
  if (value === null || value === undefined) {
    return 'Moyen'
  }

  if (value <= 1) {
    return 'Facile'
  }
  if (value >= 3) {
    return 'Difficile'
  }
  return 'Moyen'
}

function parseDifficulty(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  if (typeof value === 'number') {
    return Math.max(1, Math.min(3, Math.round(value)))
  }

  const normalized = value.trim().toLowerCase()
  if (normalized === 'facile' || normalized === 'easy') {
    return 1
  }
  if (normalized === 'difficile' || normalized === 'hard') {
    return 3
  }
  if (normalized === 'moyen' || normalized === 'medium') {
    return 2
  }

  const parsed = Number(normalized)
  if (Number.isNaN(parsed)) {
    return null
  }
  return Math.max(1, Math.min(3, Math.round(parsed)))
}

function parseNullableNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value
  }

  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

function normalizeString(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function generateUniqueSlug(db: DB, name: string, excludeId?: string): Promise<string> {
  const base = normalizeString(name) || 'cocktail'
  let candidate = base
  let index = 1

  while (true) {
    let query = db
      .selectFrom('cocktails')
      .select('id')
      .where('slug', '=', candidate)
      .where('deleted_at', 'is', null)

    if (excludeId) {
      query = query.where('id', '!=', excludeId)
    }

    const existing = await query.executeTakeFirst()
    if (!existing) {
      return candidate
    }

    index += 1
    candidate = `${base}-${index}`
  }
}

async function resolveStyleIds(db: DB, styleList: string[]): Promise<string[]> {
  const styleIds: string[] = []

  for (const rawStyle of styleList) {
    const name = rawStyle.trim()
    if (!name) {
      continue
    }

    const existing = await db
      .selectFrom('cocktail_styles')
      .select('id')
      .where('name', 'ilike', name)
      .executeTakeFirst()

    if (existing) {
      styleIds.push(existing.id)
      continue
    }

    const inserted = await db
      .insertInto('cocktail_styles')
      .values({ name, description: null } as any)
      .returning('id')
      .executeTakeFirstOrThrow()

    styleIds.push(inserted.id)
  }

  return styleIds
}

async function resolveIngredientId(
  db: DB,
  name: string,
  isAlcoholic = false
): Promise<string> {
  const normalizedName = name.trim()
  const existing = await db
    .selectFrom('ingredients')
    .select('id')
    .where('name', 'ilike', normalizedName)
    .executeTakeFirst()

  if (existing) {
    return existing.id
  }

  const inserted = await db
    .insertInto('ingredients')
    .values({
      name: normalizedName,
      category: 'other',
      is_alcoholic: isAlcoholic,
      description: null,
      alcohol_type_id: null,
      image_url: null,
      deleted_at: null,
    } as any)
    .returning('id')
    .executeTakeFirstOrThrow()

  return inserted.id
}

function normalizeSteps(input: CocktailWriteInput['steps']): CocktailStepInput[] {
  if (!input || input.length === 0) {
    return []
  }

  return input
    .map((step) => {
      if (typeof step === 'string') {
        return { description: step, imageUrl: null }
      }

      return {
        description: step.description,
        imageUrl: step.imageUrl ?? null,
      }
    })
    .filter((step) => step.description.trim().length > 0)
}

async function replaceCocktailRelations(
  db: DB,
  cocktailId: string,
  data: CocktailWriteInput
): Promise<void> {
  if (data.styles !== undefined) {
    await db.deleteFrom('cocktail_styles_junction').where('cocktail_id', '=', cocktailId).execute()

    const styleIds = await resolveStyleIds(db, data.styles)
    if (styleIds.length > 0) {
      await db
        .insertInto('cocktail_styles_junction')
        .values(styleIds.map((styleId) => ({ cocktail_id: cocktailId, style_id: styleId })) as any)
        .execute()
    }
  }

  if (data.ingredients !== undefined) {
    await db.deleteFrom('cocktail_ingredients').where('cocktail_id', '=', cocktailId).execute()

    if (data.ingredients.length > 0) {
      const payload = []
      for (const ingredient of data.ingredients) {
        const ingredientName = ingredient.name.trim()
        if (!ingredientName) {
          continue
        }
        const ingredientId = await resolveIngredientId(db, ingredientName, ingredient.isAlcoholic ?? false)
        payload.push({
          cocktail_id: cocktailId,
          ingredient_id: ingredientId,
          quantity: ingredient.amount?.trim() || null,
          unit: null,
          notes: null,
        })
      }

      if (payload.length > 0) {
        await db.insertInto('cocktail_ingredients').values(payload as any).execute()
      }
    }
  }

  if (data.steps !== undefined) {
    await db.deleteFrom('preparation_steps').where('cocktail_id', '=', cocktailId).execute()

    const steps = normalizeSteps(data.steps)
    if (steps.length > 0) {
      await db
        .insertInto('preparation_steps')
        .values(
          steps.map((step, index) => ({
            cocktail_id: cocktailId,
            step_number: index + 1,
            instruction: step.description,
            image_url: step.imageUrl ?? null,
          })) as any
        )
        .execute()
    }
  }

  if (data.imageUrl !== undefined) {
    await db.deleteFrom('cocktail_photos').where('cocktail_id', '=', cocktailId).execute()

    if (data.imageUrl && data.imageUrl.trim().length > 0) {
      await db
        .insertInto('cocktail_photos')
        .values({
          cocktail_id: cocktailId,
          url: data.imageUrl.trim(),
          alt_text: null,
          is_primary: true,
        } as any)
        .execute()
    }
  }
}

export async function toCocktailListItem(db: DB, cocktail: CocktailRow): Promise<CocktailListItem> {
  const [styles, primaryPhoto, alcoholicIngredient] = await Promise.all([
    db
      .selectFrom('cocktail_styles_junction as csj')
      .innerJoin('cocktail_styles as cs', 'cs.id', 'csj.style_id')
      .select('cs.name')
      .where('csj.cocktail_id', '=', cocktail.id)
      .orderBy('cs.name')
      .execute(),
    db
      .selectFrom('cocktail_photos')
      .select('url')
      .where('cocktail_id', '=', cocktail.id)
      .orderBy('is_primary', 'desc')
      .orderBy('created_at', 'asc')
      .executeTakeFirst(),
    db
      .selectFrom('cocktail_ingredients as ci')
      .innerJoin('ingredients as i', 'i.id', 'ci.ingredient_id')
      .select('ci.id')
      .where('ci.cocktail_id', '=', cocktail.id)
      .where('i.is_alcoholic', '=', true)
      .limit(1)
      .executeTakeFirst(),
  ])

  return {
    id: cocktail.id,
    name: cocktail.name,
    slug: cocktail.slug,
    description: cocktail.description ?? '',
    difficulty: toDifficultyLabel(cocktail.difficulty),
    duration: cocktail.prep_time ? `${cocktail.prep_time} min` : 'N/A',
    alcohol: Boolean(alcoholicIngredient),
    image: primaryPhoto?.url ?? null,
    tags: styles.map((style) => style.name),
    variantOfId: cocktail.variant_of_id ?? null,
  }
}

async function toCocktailDetails(db: DB, cocktail: CocktailRow): Promise<CocktailDetails> {
  const [base, ingredients, steps, styles, photos, variants] = await Promise.all([
    toCocktailListItem(db, cocktail),
    db
      .selectFrom('cocktail_ingredients as ci')
      .innerJoin('ingredients as i', 'i.id', 'ci.ingredient_id')
      .select([
        'ci.id as row_id',
        'i.id as ingredient_id',
        'i.name as ingredient_name',
        'i.is_alcoholic as is_alcoholic',
        'ci.quantity as quantity',
        'ci.unit as unit',
      ])
      .where('ci.cocktail_id', '=', cocktail.id)
      .orderBy('ci.created_at', 'asc')
      .execute(),
    db
      .selectFrom('preparation_steps')
      .select(['id', 'step_number', 'instruction', 'image_url'])
      .where('cocktail_id', '=', cocktail.id)
      .orderBy('step_number', 'asc')
      .execute(),
    db
      .selectFrom('cocktail_styles_junction as csj')
      .innerJoin('cocktail_styles as cs', 'cs.id', 'csj.style_id')
      .select('cs.name')
      .where('csj.cocktail_id', '=', cocktail.id)
      .orderBy('cs.name')
      .execute(),
    db
      .selectFrom('cocktail_photos')
      .select(['id', 'url', 'is_primary'])
      .where('cocktail_id', '=', cocktail.id)
      .orderBy('is_primary', 'desc')
      .orderBy('created_at', 'asc')
      .execute(),
    db
      .selectFrom('cocktails')
      .select(['id', 'name', 'slug'])
      .where('variant_of_id', '=', cocktail.id)
      .where('deleted_at', 'is', null)
      .orderBy('updated_at', 'desc')
      .execute(),
  ])

  const mappedIngredients = ingredients.map((ingredient) => ({
    id: ingredient.ingredient_id,
    name: ingredient.ingredient_name,
    amount: [ingredient.quantity, ingredient.unit].filter(Boolean).join(' ').trim(),
    isAlcoholic: ingredient.is_alcoholic,
  }))

  const mappedSteps = steps.map((step) => ({
    id: step.id,
    stepNumber: step.step_number,
    description: step.instruction,
    imageUrl: step.image_url,
  }))

  const variantSummaries: CocktailVariantSummary[] = await Promise.all(
    variants.map(async (variant) => {
      const image = await db
        .selectFrom('cocktail_photos')
        .select('url')
        .where('cocktail_id', '=', variant.id)
        .orderBy('is_primary', 'desc')
        .orderBy('created_at', 'asc')
        .executeTakeFirst()

      return {
        id: variant.id,
        name: variant.name,
        slug: variant.slug,
        image: image?.url ?? null,
      }
    })
  )

  return {
    ...base,
    intensity: cocktail.intensity,
    prepTime: cocktail.prep_time,
    status: cocktail.status,
    createdById: cocktail.created_by_id,
    styles: styles.map((style) => style.name),
    ingredients: mappedIngredients,
    steps: mappedSteps.map((step) => step.description),
    preparationSteps: mappedSteps,
    photos: photos.map((photo) => ({
      id: photo.id,
      url: photo.url,
      isPrimary: photo.is_primary,
    })),
    variants: variantSummaries,
  }
}

export function listCocktails(
  db: DB,
  input: ListCocktailsInput
): ResultAsync<CocktailListItem[], AppError> {
  return fromPromise(
    (async () => {
      const { page, pageSize, search, alcohol = 'all' } = input

      let query = db
        .selectFrom('cocktails')
        .selectAll()
        .where('deleted_at', 'is', null)

      if (search && search.trim().length > 0) {
        const term = `%${search.trim()}%`
        query = query.where((eb) =>
          eb.or([eb('name', 'ilike', term), eb('description', 'ilike', term)])
        )
      }

      if (alcohol === 'with') {
        query = query.where((eb) =>
          eb.exists(
            eb
              .selectFrom('cocktail_ingredients as ci')
              .innerJoin('ingredients as i', 'i.id', 'ci.ingredient_id')
              .select('ci.id')
              .whereRef('ci.cocktail_id', '=', 'cocktails.id')
              .where('i.is_alcoholic', '=', true)
          )
        )
      }

      if (alcohol === 'without') {
        query = query.where((eb) =>
          eb.not(
            eb.exists(
              eb
                .selectFrom('cocktail_ingredients as ci')
                .innerJoin('ingredients as i', 'i.id', 'ci.ingredient_id')
                .select('ci.id')
                .whereRef('ci.cocktail_id', '=', 'cocktails.id')
                .where('i.is_alcoholic', '=', true)
            )
          )
        )
      }

      const cocktailRows = await query
        .orderBy('updated_at', 'desc')
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .execute()

      return Promise.all(cocktailRows.map((cocktail) => toCocktailListItem(db, cocktail)))
    })(),
    () => Errors.databaseError('Failed to list cocktails')
  )
}

export function getCocktailById(db: DB, id: string): ResultAsync<CocktailDetails, AppError> {
  return dbQueryFirst(
    () =>
      db
        .selectFrom('cocktails')
        .selectAll()
        .where('id', '=', id)
        .where('deleted_at', 'is', null)
        .executeTakeFirst(),
    Errors.notFound('Cocktail')
  ).andThen((cocktail) =>
    fromPromise(toCocktailDetails(db, cocktail), () =>
      Errors.databaseError('Failed to build cocktail details')
    )
  )
}

export function getCocktailAccessData(
  db: DB,
  id: string
): ResultAsync<{ id: string; createdById: string | null }, AppError> {
  return dbQueryFirst(
    () =>
      db
        .selectFrom('cocktails')
        .select(['id', 'created_by_id'])
        .where('id', '=', id)
        .where('deleted_at', 'is', null)
        .executeTakeFirst(),
    Errors.notFound('Cocktail')
  ).map((cocktail) => ({ id: cocktail.id, createdById: cocktail.created_by_id }))
}

export function createCocktail(
  db: DB,
  data: Required<Pick<CocktailWriteInput, 'name'>> & CocktailWriteInput,
  creator: { id: string; role: User['role'] }
): ResultAsync<CocktailDetails, AppError> {
  return fromPromise(generateUniqueSlug(db, data.name), () =>
    Errors.internalError('Failed to generate slug')
  ).andThen((slug) =>
    dbInsert(
      () =>
        db
          .insertInto('cocktails')
          .values({
            name: data.name.trim(),
            slug,
            description: data.description ?? null,
            intensity: parseNullableNumber(data.intensity),
            difficulty: parseDifficulty(data.difficulty),
            prep_time: parseNullableNumber(data.prepTime),
            status: creator.role === 'admin' ? 'approved' : 'pending',
            created_by_id: creator.id,
            variant_of_id: data.variantOfId ?? null,
          } as any)
          .returningAll()
          .executeTakeFirst(),
      'Failed to create cocktail'
    )
  )
    .andThen((createdCocktail) =>
      fromPromise(
        replaceCocktailRelations(db, createdCocktail.id, data).then(() => createdCocktail),
        () => Errors.databaseError('Failed to save cocktail relations')
      )
    )
    .andThen((createdCocktail) => getCocktailById(db, createdCocktail.id))
}

export function updateCocktail(
  db: DB,
  id: string,
  data: CocktailWriteInput
): ResultAsync<CocktailDetails, AppError> {
  return dbQueryFirst(
    () =>
      db
        .selectFrom('cocktails')
        .selectAll()
        .where('id', '=', id)
        .where('deleted_at', 'is', null)
        .executeTakeFirst(),
    Errors.notFound('Cocktail')
  )
    .andThen((existing) =>
      fromPromise(
        (async () => {
          const nextName = data.name?.trim()
          const slug =
            nextName && nextName !== existing.name
              ? await generateUniqueSlug(db, nextName, existing.id)
              : existing.slug

          const updatedCocktail = await db
            .updateTable('cocktails')
            .set({
              ...(nextName ? { name: nextName } : {}),
              ...(data.description !== undefined ? { description: data.description } : {}),
              ...(data.intensity !== undefined ? { intensity: parseNullableNumber(data.intensity) } : {}),
              ...(data.difficulty !== undefined ? { difficulty: parseDifficulty(data.difficulty) } : {}),
              ...(data.prepTime !== undefined ? { prep_time: parseNullableNumber(data.prepTime) } : {}),
              ...(data.variantOfId !== undefined ? { variant_of_id: data.variantOfId } : {}),
              slug,
              updated_at: new Date(),
            })
            .where('id', '=', id)
            .returningAll()
            .executeTakeFirst()

          if (!updatedCocktail) {
            throw new Error('Cocktail not found after update')
          }

          await replaceCocktailRelations(db, updatedCocktail.id, data)
          return updatedCocktail
        })(),
        () => Errors.databaseError('Failed to update cocktail')
      )
    )
    .andThen((updatedCocktail) => getCocktailById(db, updatedCocktail.id))
}

export function deleteCocktail(db: DB, id: string): ResultAsync<{ id: string }, AppError> {
  return dbUpdate(
    () =>
      db
        .updateTable('cocktails')
        .set({
          deleted_at: new Date(),
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .where('deleted_at', 'is', null)
        .returning('id')
        .executeTakeFirst(),
    Errors.notFound('Cocktail')
  )
}
