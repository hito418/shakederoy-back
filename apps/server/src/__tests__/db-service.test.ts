import { describe, it, expect, vi } from 'vitest'
import { DbService } from 'src/shared/db-service'
import { AppError } from 'src/shared/errors'

describe('DbService', () => {
  describe('cleanUpdate', () => {
    it('strips undefined values and adds updated_at', () => {
      const result = DbService.cleanUpdate({
        name: 'Mojito',
        description: undefined,
        slug: 'mojito',
      })

      expect(result).toHaveProperty('name', 'Mojito')
      expect(result).toHaveProperty('slug', 'mojito')
      expect(result).not.toHaveProperty('description')
      expect(result.updated_at).toBeInstanceOf(Date)
    })

    it('handles empty object', () => {
      const result = DbService.cleanUpdate({})
      expect(result.updated_at).toBeInstanceOf(Date)
      expect(Object.keys(result)).toEqual(['updated_at'])
    })

    it('keeps null values (only strips undefined)', () => {
      const result = DbService.cleanUpdate({
        name: 'Mojito',
        description: null,
      })

      expect(result).toHaveProperty('description', null)
    })

    it('keeps falsy values like 0 and empty string', () => {
      const result = DbService.cleanUpdate({
        count: 0,
        label: '',
        active: false,
      })

      expect(result).toHaveProperty('count', 0)
      expect(result).toHaveProperty('label', '')
      expect(result).toHaveProperty('active', false)
    })
  })

  describe('guard', () => {
    it('returns Ok for defined value', () => {
      const guard = DbService.guard()
      const result = guard({ id: '1', name: 'Test' })

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual({ id: '1', name: 'Test' })
    })

    it('returns Err for undefined value with default error', () => {
      const guard = DbService.guard()
      const result = guard(undefined)

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('NOT_FOUND')
    })

    it('returns Err for undefined value with custom error', () => {
      const guard = DbService.guard(AppError.notFound('Cocktail'))
      const result = guard(undefined)

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().message).toBe('Cocktail not found')
    })
  })
})
