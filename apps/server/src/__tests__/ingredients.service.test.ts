import { describe, it, expect, beforeEach, vi } from 'vitest'
import { okAsync, errAsync } from 'neverthrow'
import { IngredientsService } from 'src/features/cocktails/ingredients.service'
import { AppError } from 'src/shared/errors'
import { mockDbService } from './helpers'

const ingredient = {
  id: 'ing-1',
  name: 'Lime',
  description: 'Fresh lime',
  category: 'fruit',
  is_alcoholic: false,
  alcohol_type_id: null,
  image_url: null,
  created_at: new Date(),
  updated_at: new Date(),
}

describe('IngredientsService', () => {
  let db: ReturnType<typeof mockDbService>
  let service: IngredientsService

  beforeEach(() => {
    vi.clearAllMocks()
    db = mockDbService()
    service = new IngredientsService(db as never)
  })

  describe('list', () => {
    it('returns paginated ingredients', async () => {
      const paginated = {
        data: [ingredient],
        page: 1,
        size: 15,
        total: 1,
        totalPages: 1,
      }
      db.queryPaginated.mockReturnValue(okAsync(paginated))

      const result = await service.list(1, 15)

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap().data).toHaveLength(1)
      expect(result._unsafeUnwrap().data[0].name).toBe('Lime')
    })

    it('returns error on db failure', async () => {
      db.queryPaginated.mockReturnValue(errAsync(AppError.databaseError()))

      const result = await service.list(1, 15)

      expect(result.isErr()).toBe(true)
    })
  })

  describe('getById', () => {
    it('returns ingredient when found', async () => {
      db.queryFirst.mockReturnValue(okAsync(ingredient))

      const result = await service.getById('ing-1')

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap().name).toBe('Lime')
    })

    it('returns NOT_FOUND when ingredient does not exist', async () => {
      db.queryFirst.mockReturnValue(errAsync(AppError.notFound('Ingredient')))

      const result = await service.getById('nonexistent')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('NOT_FOUND')
      expect(result._unsafeUnwrapErr().message).toBe('Ingredient not found')
    })
  })

  describe('create', () => {
    it('creates and returns ingredient', async () => {
      db.insert.mockReturnValue(okAsync(ingredient))

      const result = await service.create({
        name: 'Lime',
        description: 'Fresh lime',
        category: 'garnish',
        is_alcoholic: false,
      })

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap().id).toBe('ing-1')
    })

    it('returns DATABASE_ERROR when insert fails', async () => {
      db.insert.mockReturnValue(errAsync(AppError.databaseError()))

      const result = await service.create({
        name: 'Lime',
        category: 'garnish',
        is_alcoholic: false,
      })

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('DATABASE_ERROR')
    })
  })

  describe('update', () => {
    it('updates and returns ingredient', async () => {
      const updated = { ...ingredient, name: 'Lemon' }
      db.update.mockReturnValue(okAsync(updated))

      const result = await service.update('ing-1', { name: 'Lemon' })

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap().name).toBe('Lemon')
    })

    it('returns NOT_FOUND when ingredient does not exist', async () => {
      db.update.mockReturnValue(errAsync(AppError.notFound('Ingredient')))

      const result = await service.update('nonexistent', { name: 'Lemon' })

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('NOT_FOUND')
    })
  })

  describe('delete', () => {
    it('deletes and returns ingredient', async () => {
      db.delete.mockReturnValue(okAsync(ingredient))

      const result = await service.delete('ing-1')

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap().id).toBe('ing-1')
    })

    it('returns NOT_FOUND when ingredient does not exist', async () => {
      db.delete.mockReturnValue(errAsync(AppError.notFound('Ingredient')))

      const result = await service.delete('nonexistent')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('NOT_FOUND')
    })
  })
})
