import { vi, describe, it, expect, beforeEach } from 'vitest'
import { okAsync, errAsync } from 'neverthrow'
import { SessionService } from 'src/features/auth/session.service'
import { AppError } from 'src/shared/errors'
import { mockDbService } from './helpers'

describe('SessionService', () => {
  let db: ReturnType<typeof mockDbService>
  let service: SessionService

  beforeEach(() => {
    vi.clearAllMocks()
    db = mockDbService()
    service = new SessionService(db as never)
  })

  describe('create', () => {
    it('creates a session and returns sessionId with payload', async () => {
      db.query.mockReturnValue(
        okAsync({ id: 'sess', user_id: 'user-1', expires_at: new Date() })
      )

      const result = await service.create('user-1', 'alice', 'user')

      expect(result.isOk()).toBe(true)
      const value = result._unsafeUnwrap()
      expect(value.sessionId).toEqual(expect.any(String))
      expect(value.sessionId).toHaveLength(64) // 32 random bytes -> 64 hex chars
      expect(value.payload).toEqual({
        sub: { id: 'user-1' },
        username: 'alice',
        role: 'user',
      })
    })

    it('returns DATABASE_ERROR when insert fails', async () => {
      db.query.mockReturnValue(errAsync(AppError.databaseError()))

      const result = await service.create('user-1', 'alice', 'user')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('DATABASE_ERROR')
    })
  })

  describe('validate', () => {
    it('returns payload for a valid non-expired session', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000)
      db.query.mockReturnValue(
        okAsync({
          user_id: 'user-1',
          expires_at: futureDate,
          username: 'alice',
          role: 'user',
        })
      )

      const result = await service.validate('valid-session')

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual({
        sub: { id: 'user-1' },
        username: 'alice',
        role: 'user',
      })
    })

    it('returns UNAUTHORIZED and deletes expired session', async () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000)
      db.query
        .mockReturnValueOnce(
          okAsync({
            user_id: 'user-1',
            expires_at: pastDate,
            username: 'alice',
            role: 'user',
          })
        )
        .mockReturnValueOnce(okAsync([]))

      const result = await service.validate('expired-session')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().message).toBe('Session expired')
      expect(db.query).toHaveBeenCalledTimes(2)
    })

    it('returns UNAUTHORIZED when session not found in db', async () => {
      db.query.mockReturnValue(
        errAsync(AppError.unauthorized('Invalid session'))
      )

      const result = await service.validate('nonexistent')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('UNAUTHORIZED')
    })

    it('returns error when query returns undefined (guard)', async () => {
      db.query.mockReturnValue(okAsync(undefined))

      const result = await service.validate('session-id')

      expect(result.isErr()).toBe(true)
    })
  })

  describe('delete', () => {
    it('deletes session successfully', async () => {
      db.query.mockReturnValue(okAsync([]))

      const result = await service.delete('session-id')

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toBeUndefined()
    })

    it('returns DATABASE_ERROR on failure', async () => {
      db.query.mockReturnValue(errAsync(AppError.databaseError()))

      const result = await service.delete('session-id')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('DATABASE_ERROR')
    })
  })

  describe('deleteAllForUser', () => {
    it('deletes all sessions for a user', async () => {
      db.query.mockReturnValue(okAsync([]))

      const result = await service.deleteAllForUser('user-1')

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toBeUndefined()
    })

    it('returns DATABASE_ERROR on failure', async () => {
      db.query.mockReturnValue(errAsync(AppError.databaseError()))

      const result = await service.deleteAllForUser('user-1')

      expect(result.isErr()).toBe(true)
    })
  })

  describe('cleanupExpired', () => {
    it('returns the count of deleted sessions', async () => {
      db.query.mockReturnValue(okAsync({ numDeletedRows: BigInt(5) }))

      const result = await service.cleanupExpired()

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toBe(5)
    })

    it('returns 0 when no expired sessions exist', async () => {
      db.query.mockReturnValue(okAsync({ numDeletedRows: BigInt(0) }))

      const result = await service.cleanupExpired()

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toBe(0)
    })

    it('returns DATABASE_ERROR on failure', async () => {
      db.query.mockReturnValue(errAsync(AppError.databaseError()))

      const result = await service.cleanupExpired()

      expect(result.isErr()).toBe(true)
    })
  })
})
