import { describe, it, expect } from 'vitest'
import { AppError, isAppError, errorToHttpStatus } from 'src/shared/errors'

describe('AppError', () => {
  describe('static factories', () => {
    it('notFound creates NOT_FOUND error', () => {
      const error = AppError.notFound('Cocktail')
      expect(error.type).toBe('NOT_FOUND')
      expect(error.message).toBe('Cocktail not found')
      expect(error.name).toBe('AppError')
    })

    it('alreadyExists creates ALREADY_EXISTS error', () => {
      const error = AppError.alreadyExists('User')
      expect(error.type).toBe('ALREADY_EXISTS')
      expect(error.message).toBe('User already exists')
    })

    it('unauthorized creates UNAUTHORIZED error with default message', () => {
      const error = AppError.unauthorized()
      expect(error.type).toBe('UNAUTHORIZED')
      expect(error.message).toBe('Unauthorized')
    })

    it('unauthorized creates UNAUTHORIZED error with custom message', () => {
      const error = AppError.unauthorized('Session expired')
      expect(error.message).toBe('Session expired')
    })

    it('invalidCredentials creates INVALID_CREDENTIALS error', () => {
      const error = AppError.invalidCredentials()
      expect(error.type).toBe('INVALID_CREDENTIALS')
      expect(error.message).toBe('Invalid credentials')
    })

    it('databaseError creates DATABASE_ERROR with default message', () => {
      const error = AppError.databaseError()
      expect(error.type).toBe('DATABASE_ERROR')
      expect(error.message).toBe('Database operation failed')
    })

    it('internalError creates INTERNAL_ERROR with default message', () => {
      const error = AppError.internalError()
      expect(error.type).toBe('INTERNAL_ERROR')
      expect(error.message).toBe('Internal server error')
    })
  })

  describe('isAppError', () => {
    it('returns true for AppError instances', () => {
      expect(isAppError(AppError.notFound('x'))).toBe(true)
    })

    it('returns false for plain Error', () => {
      expect(isAppError(new Error('oops'))).toBe(false)
    })

    it('returns false for non-errors', () => {
      expect(isAppError('string')).toBe(false)
      expect(isAppError(null)).toBe(false)
      expect(isAppError(undefined)).toBe(false)
    })
  })

  describe('errorToHttpStatus', () => {
    it('maps NOT_FOUND to 404', () => {
      expect(errorToHttpStatus(AppError.notFound('x'))).toBe(404)
    })

    it('maps ALREADY_EXISTS to 409', () => {
      expect(errorToHttpStatus(AppError.alreadyExists('x'))).toBe(409)
    })

    it('maps UNAUTHORIZED to 401', () => {
      expect(errorToHttpStatus(AppError.unauthorized())).toBe(401)
    })

    it('maps INVALID_CREDENTIALS to 401', () => {
      expect(errorToHttpStatus(AppError.invalidCredentials())).toBe(401)
    })

    it('maps DATABASE_ERROR to 500', () => {
      expect(errorToHttpStatus(AppError.databaseError())).toBe(500)
    })

    it('maps INTERNAL_ERROR to 500', () => {
      expect(errorToHttpStatus(AppError.internalError())).toBe(500)
    })
  })
})
