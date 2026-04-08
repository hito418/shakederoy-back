import { vi, describe, it, expect, beforeEach } from 'vitest'
import { okAsync, errAsync } from 'neverthrow'
import { AppError } from 'src/shared/errors'
import { mockDbService } from './helpers'

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn(),
  },
}))

import bcrypt from 'bcrypt'
import { AuthService } from 'src/features/auth/auth.service'

describe('AuthService', () => {
  let db: ReturnType<typeof mockDbService>
  let service: AuthService

  beforeEach(() => {
    vi.clearAllMocks()
    db = mockDbService()
    service = new AuthService(db as never)
  })

  describe('initAdmin', () => {
    it('creates admin when no users exist', async () => {
      const now = new Date()
      db.query
        .mockReturnValueOnce(okAsync([]))
        .mockReturnValueOnce(
          okAsync({
            id: 'admin-1',
            username: 'admin',
            email: 'admin@test.com',
            role: 'admin',
            password: 'hashed-password',
            profile_pic: null,
            is_bar_owner: false,
            created_at: now,
            updated_at: now,
          })
        )

      const result = await service.initAdmin(
        'admin',
        'admin@test.com',
        'pass123'
      )

      expect(result.isOk()).toBe(true)
      const value = result._unsafeUnwrap()
      expect(value.username).toBe('admin')
      expect(value.role).toBe('admin')
      expect(value).not.toHaveProperty('password')
    })

    it('returns ALREADY_EXISTS when users exist', async () => {
      db.query.mockReturnValueOnce(okAsync([{ id: 'existing-1' }]))

      const result = await service.initAdmin(
        'admin',
        'admin@test.com',
        'pass123'
      )

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('ALREADY_EXISTS')
    })

    it('hashes password with bcrypt', async () => {
      db.query
        .mockReturnValueOnce(okAsync([]))
        .mockReturnValueOnce(
          okAsync({
            id: 'admin-1',
            username: 'admin',
            email: 'admin@test.com',
            role: 'admin',
            password: 'hashed-password',
          })
        )

      await service.initAdmin('admin', 'admin@test.com', 'mysecret')

      expect(bcrypt.hash).toHaveBeenCalledWith('mysecret', 10)
    })

    it('returns DATABASE_ERROR when insert fails', async () => {
      db.query
        .mockReturnValueOnce(okAsync([]))
        .mockReturnValueOnce(
          errAsync(AppError.databaseError('Failed to create admin user'))
        )

      const result = await service.initAdmin(
        'admin',
        'admin@test.com',
        'pass123'
      )

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('DATABASE_ERROR')
    })

    it('returns error when insert returns undefined', async () => {
      db.query
        .mockReturnValueOnce(okAsync([]))
        .mockReturnValueOnce(okAsync(undefined))

      const result = await service.initAdmin(
        'admin',
        'admin@test.com',
        'pass123'
      )

      expect(result.isErr()).toBe(true)
    })
  })

  describe('registerUser', () => {
    it('registers and returns user credentials', async () => {
      db.query.mockReturnValue(
        okAsync({
          id: 'user-1',
          username: 'alice',
          role: 'user',
          password: 'hashed',
        })
      )

      const result = await service.registerUser(
        'alice',
        'alice@test.com',
        'pass123'
      )

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual({
        id: 'user-1',
        username: 'alice',
        role: 'user',
      })
    })

    it('hashes password before storing', async () => {
      db.query.mockReturnValue(
        okAsync({ id: '1', username: 'a', role: 'user', password: 'h' })
      )

      await service.registerUser('a', 'a@test.com', 'mypassword')

      expect(bcrypt.hash).toHaveBeenCalledWith('mypassword', 10)
    })

    it('returns DATABASE_ERROR when insert fails', async () => {
      db.query.mockReturnValue(errAsync(AppError.databaseError()))

      const result = await service.registerUser(
        'alice',
        'alice@test.com',
        'pass123'
      )

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('DATABASE_ERROR')
    })

    it('returns NOT_FOUND when insert returns undefined (guard)', async () => {
      db.query.mockReturnValue(okAsync(undefined))

      const result = await service.registerUser(
        'alice',
        'alice@test.com',
        'pass123'
      )

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('NOT_FOUND')
    })
  })

  describe('loginUser', () => {
    const storedUser = {
      id: 'user-1',
      username: 'alice',
      email: 'alice@test.com',
      role: 'user' as const,
      password: 'stored-hash',
    }

    it('returns credentials on valid login', async () => {
      db.query.mockReturnValue(okAsync(storedUser))
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

      const result = await service.loginUser('alice', 'correct-pass')

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual({
        id: 'user-1',
        username: 'alice',
        role: 'user',
      })
    })

    it('compares provided password against stored hash', async () => {
      db.query.mockReturnValue(okAsync(storedUser))
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

      await service.loginUser('alice', 'the-password')

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'the-password',
        'stored-hash'
      )
    })

    it('returns INVALID_CREDENTIALS on wrong password', async () => {
      db.query.mockReturnValue(okAsync(storedUser))
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

      const result = await service.loginUser('alice', 'wrong-pass')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('INVALID_CREDENTIALS')
    })

    it('returns NOT_FOUND when user does not exist', async () => {
      db.query.mockReturnValue(errAsync(AppError.notFound('User')))

      const result = await service.loginUser('nobody', 'pass')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('NOT_FOUND')
    })

    it('returns NOT_FOUND when query returns undefined (guard)', async () => {
      db.query.mockReturnValue(okAsync(undefined))

      const result = await service.loginUser('alice', 'pass')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('NOT_FOUND')
    })
  })
})
