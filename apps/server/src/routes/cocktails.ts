import { env } from 'hono/adapter'
import { HonoVar } from 'src/shared/hono'
import { isAuth } from 'src/features/auth/middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import {
  createCocktail,
  deleteCocktail,
  getCocktailAccessData,
  getCocktailById,
  listCocktails,
  updateCocktail,
  type AlcoholFilter,
  type CocktailIngredientInput,
  type CocktailStepInput,
  type CocktailWriteInput,
} from 'src/features/cocktails/service'
import { saveUploadedFile } from 'src/shared/uploads'

interface ParsedCocktailPayload extends CocktailWriteInput {
  name?: string
}

function toStringArray(value: unknown): string[] {
  if (!value) {
    return []
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return []
    }
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean)
      }
    } catch {}

    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function parseIngredients(value: unknown): CocktailIngredientInput[] {
  const normalize = (input: unknown): CocktailIngredientInput[] => {
    if (!Array.isArray(input)) {
      return []
    }

    const output: CocktailIngredientInput[] = []
    for (const item of input) {
      if (typeof item !== 'object' || !item) {
        continue
      }

      const candidate = item as { name?: unknown; amount?: unknown; isAlcoholic?: unknown }
      if (typeof candidate.name !== 'string') {
        continue
      }

      output.push({
        name: candidate.name,
        amount: typeof candidate.amount === 'string' ? candidate.amount : undefined,
        isAlcoholic: typeof candidate.isAlcoholic === 'boolean' ? candidate.isAlcoholic : undefined,
      })
    }

    return output
  }

  if (!value) {
    return []
  }

  if (Array.isArray(value)) {
    return normalize(value)
  }

  if (typeof value === 'string') {
    try {
      return normalize(JSON.parse(value))
    } catch {
      return []
    }
  }

  return []
}

function parseSteps(value: unknown): CocktailStepInput[] {
  if (!value) {
    return []
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') {
          return { description: item }
        }
        if (typeof item !== 'object' || !item) {
          return null
        }
        const candidate = item as { description?: unknown; imageUrl?: unknown }
        if (typeof candidate.description !== 'string') {
          return null
        }
        return {
          description: candidate.description,
          imageUrl: typeof candidate.imageUrl === 'string' ? candidate.imageUrl : null,
        }
      })
      .filter((item): item is CocktailStepInput => Boolean(item))
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown
      return parseSteps(parsed)
    } catch {
      return value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((description) => ({ description }))
    }
  }

  return []
}

function asNullableString(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === null) {
    return null
  }
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function asNullableNumber(value: unknown): number | null | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === null || value === '') {
    return null
  }

  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? null : parsed
  }

  return undefined
}

async function parseCocktailPayload(ctx: any): Promise<ParsedCocktailPayload> {
  const contentType = ctx.req.header('content-type') || ''
  const { UPLOAD_DIR } = env(ctx)

  if (contentType.includes('multipart/form-data')) {
    const body = await ctx.req.parseBody({ all: true })
    const imageFile = body.image
    const imageUrlFromBody = asNullableString(body.imageUrl)

    let imageUrl = imageUrlFromBody
    if (imageFile instanceof File && imageFile.size > 0) {
      imageUrl = await saveUploadedFile(imageFile, UPLOAD_DIR)
    }

    return {
      name: typeof body.name === 'string' ? body.name.trim() : undefined,
      description: asNullableString(body.description),
      intensity: asNullableNumber(body.intensity),
      difficulty: typeof body.difficulty === 'string' ? body.difficulty : asNullableNumber(body.difficulty),
      prepTime: asNullableNumber(body.prepTime),
      variantOfId: asNullableString(body.variantOfId),
      styles: toStringArray(body.styles),
      ingredients: parseIngredients(body.ingredients),
      steps: parseSteps(body.steps),
      imageUrl,
    }
  }

  const json = (await ctx.req.json()) as Record<string, unknown>
  return {
    name: typeof json.name === 'string' ? json.name.trim() : undefined,
    description: asNullableString(json.description),
    intensity: asNullableNumber(json.intensity),
    difficulty: json.difficulty as string | number | null | undefined,
    prepTime: asNullableNumber(json.prepTime),
    variantOfId: asNullableString(json.variantOfId),
    styles: Array.isArray(json.styles) ? toStringArray(json.styles) : toStringArray(json.styles),
    ingredients: parseIngredients(json.ingredients),
    steps: parseSteps(json.steps),
    imageUrl: asNullableString(json.imageUrl),
  }
}

const cocktailsRoute = new HonoVar().basePath('/cocktails')

cocktailsRoute.get('/', async (ctx) => {
  const db = ctx.get('database')
  const page = Number(ctx.req.query('page') || '1')
  const limit = Number(ctx.req.query('limit') || env(ctx).PAGE_SIZE || '15')
  const search = ctx.req.query('search') || undefined
  const alcoholRaw = ctx.req.query('alcohol') || 'all'
  const alcohol = (['all', 'with', 'without'].includes(alcoholRaw) ? alcoholRaw : 'all') as AlcoholFilter

  const result = await listCocktails(db, {
    page: Number.isNaN(page) || page < 1 ? 1 : page,
    pageSize: Number.isNaN(limit) || limit < 1 ? Number(env(ctx).PAGE_SIZE) : Math.min(limit, 100),
    search,
    alcohol,
  })

  return result.match(
    (cocktailList) => ctx.json(cocktailList, 200),
    (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
  )
})

cocktailsRoute.get('/:id', async (ctx) => {
  const db = ctx.get('database')
  const { id } = ctx.req.param()

  const result = await getCocktailById(db, id)

  return result.match(
    (cocktail) => ctx.json(cocktail, 200),
    (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
  )
})

cocktailsRoute.post('/create', isAuth(), async (ctx) => {
  const db = ctx.get('database')
  const payload = ctx.get('userPayload')
  const cocktailPayload = await parseCocktailPayload(ctx)

  if (!cocktailPayload.name || cocktailPayload.name.length < 3) {
    return ctx.json({ message: 'Cocktail name must contain at least 3 characters' }, 400)
  }

  const result = await createCocktail(
    db,
    {
      ...cocktailPayload,
      name: cocktailPayload.name,
      description: cocktailPayload.description ?? null,
      ingredients: cocktailPayload.ingredients ?? [],
      steps: cocktailPayload.steps ?? [],
      styles: cocktailPayload.styles ?? [],
    },
    { id: payload.sub.id, role: payload.role }
  )

  return result.match(
    (newCocktail) => ctx.json(newCocktail, 201),
    (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
  )
})

cocktailsRoute.post('/:id', isAuth(), async (ctx) => {
  const db = ctx.get('database')
  const payload = ctx.get('userPayload')
  const { id } = ctx.req.param()

  const access = await getCocktailAccessData(db, id)
  if (access.isErr()) {
    return ctx.json({ message: access.error.message }, errorToHttpStatus(access.error))
  }

  if (payload.role !== 'admin' && access.value.createdById !== payload.sub.id) {
    return ctx.json({ message: 'Forbidden' }, 403)
  }

  const cocktailPayload = await parseCocktailPayload(ctx)
  const result = await updateCocktail(db, id, cocktailPayload)

  return result.match(
    (updatedCocktail) => ctx.json(updatedCocktail, 200),
    (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
  )
})

cocktailsRoute.delete('/:id', isAuth(), async (ctx) => {
  const db = ctx.get('database')
  const payload = ctx.get('userPayload')
  const { id } = ctx.req.param()

  const access = await getCocktailAccessData(db, id)
  if (access.isErr()) {
    return ctx.json({ message: access.error.message }, errorToHttpStatus(access.error))
  }

  if (payload.role !== 'admin' && access.value.createdById !== payload.sub.id) {
    return ctx.json({ message: 'Forbidden' }, 403)
  }

  const result = await deleteCocktail(db, id)

  return result.match(
    (deletedCocktail) => ctx.json(deletedCocktail, 200),
    (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
  )
})

export default cocktailsRoute
