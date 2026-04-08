import { vi, describe, it, expect, beforeEach } from 'vitest'
import { okAsync, errAsync } from 'neverthrow'
import { AppError } from 'src/shared/errors'
import { mockDbService } from './helpers'

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
  },
}))

import bcrypt from 'bcrypt'
import { UsersService } from 'src/features/users/users.service'

const safeUser = {
  id: 'user-1',
  username: 'alice',
  email: 'alice@test.com',
  role: 'user' as const,
  profile_pic: null,
  is_bar_owner: false,
  created_at: new Date(),
  updated_at: new Date(),
}

describe('UsersService', () => {
  let db: ReturnType<typeof mockDbService>
  let service: UsersService

  beforeEach(() => {
    vi.clearAllMocks()
    db = mockDbService()
    service = new UsersService(db as never)
  })

  describe('list', () => {
    it('returns paginated users', async () => {
      const paginated = {
        data: [safeUser],
        page: 1,
        size: 15,
        total: 1,
        totalPages: 1,
      }
      db.queryPaginated.mockReturnValue(okAsync(paginated))

      const result = await service.list(1, 15)

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual(paginated)
    })

    it('returns error on db failure', async () => {
      db.queryPaginated.mockReturnValue(errAsync(AppError.databaseError()))

      const result = await service.list(1, 15)

      expect(result.isErr()).toBe(true)
    })
  })

  describe('getById', () => {
    it('returns user when found', async () => {
      db.queryFirst.mockReturnValue(okAsync(safeUser))

      const result = await service.getById('user-1')

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap().username).toBe('alice')
    })

    it('returns NOT_FOUND when user does not exist', async () => {
      db.queryFirst.mockReturnValue(errAsync(AppError.notFound('User')))

      const result = await service.getById('nonexistent')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('NOT_FOUND')
    })
  })

  describe('create', () => {
    it('hashes password and creates user', async () => {
      db.insert.mockReturnValue(okAsync(safeUser))

      const result = await service.create(
        'alice',
        'alice@test.com',
        'plaintext',
        'user'
      )

      expect(result.isOk()).toBe(true)
      expect(bcrypt.hash).toHaveBeenCalledWith('plaintext', 10)
    })

    it('returns error when insert fails', async () => {
      db.insert.mockReturnValue(
        errAsync(AppError.databaseError('Failed to create user'))
      )

      const result = await service.create(
        'alice',
        'alice@test.com',
        'pass',
        'user'
      )

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('DATABASE_ERROR')
    })
  })

  describe('update', () => {
    it('hashes password when password is provided', async () => {
      db.update.mockReturnValue(okAsync(safeUser))

      await service.update('user-1', { password: 'newpass' })

      expect(bcrypt.hash).toHaveBeenCalledWith('newpass', 10)
    })

    it('skips hashing when no password is provided', async () => {
      db.update.mockReturnValue(okAsync(safeUser))

      await service.update('user-1', { username: 'bob' })

      expect(bcrypt.hash).not.toHaveBeenCalled()
    })

    it('returns NOT_FOUND when user does not exist', async () => {
      db.update.mockReturnValue(errAsync(AppError.notFound('User')))

      const result = await service.update('nonexistent', { username: 'bob' })

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('NOT_FOUND')
    })
  })

  describe('delete', () => {
    it('returns deleted user id', async () => {
      db.delete.mockReturnValue(okAsync({ id: 'user-1' }))

      const result = await service.delete('user-1')

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual({ id: 'user-1' })
    })

    it('returns NOT_FOUND when user does not exist', async () => {
      db.delete.mockReturnValue(errAsync(AppError.notFound('User')))

      const result = await service.delete('nonexistent')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('NOT_FOUND')
    })
  })
})
