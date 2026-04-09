import { errAsync, okAsync } from 'neverthrow'
import type { SessionPayload } from 'src/features/auth/session.service'
import { AppError } from 'src/shared/errors'
import { vi, type Mock } from 'vitest'

export function mockSessionService(): {
  create: Mock; validate: Mock; delete: Mock; deleteAllForUser: Mock; cleanupExpired: Mock
} {
  return {
    create: vi.fn(),
    validate: vi.fn(),
    delete: vi.fn(),
    deleteAllForUser: vi.fn(),
    cleanupExpired: vi.fn(),
  }
}

export function mockAuthService(): {
  initAdmin: Mock; registerUser: Mock; loginUser: Mock
} {
  return {
    initAdmin: vi.fn(),
    registerUser: vi.fn(),
    loginUser: vi.fn(),
  }
}

export const testUser: SessionPayload = {
  sub: { id: 'user-1' },
  username: 'testuser',
  role: 'user',
}

export const testAdmin: SessionPayload = {
  sub: { id: 'admin-1' },
  username: 'admin',
  role: 'admin',
}

export function stubValidSession(
  sessionSvc: ReturnType<typeof mockSessionService>,
  payload: SessionPayload = testUser
) {
  sessionSvc.validate.mockReturnValue(okAsync(payload))
}

export function stubNoSession(
  sessionSvc: ReturnType<typeof mockSessionService>
) {
  sessionSvc.validate.mockReturnValue(
    errAsync(AppError.unauthorized('Invalid session'))
  )
}

export function mockDbService(): {
  query: Mock; queryFirst: Mock; queryMany: Mock; insert: Mock;
  update: Mock; delete: Mock; queryPaginated: Mock; transaction: Mock
} {
  return {
    query: vi.fn(),
    queryFirst: vi.fn(),
    queryMany: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    queryPaginated: vi.fn(),
    transaction: vi.fn(),
  }
}
