import type { ContentfulStatusCode } from 'hono/utils/http-status'

export type AppError =
  | { type: 'NOT_FOUND'; message: string }
  | { type: 'ALREADY_EXISTS'; message: string }
  | { type: 'UNAUTHORIZED'; message: string }
  | { type: 'INVALID_CREDENTIALS'; message: string }
  | { type: 'DATABASE_ERROR'; message: string }
  | { type: 'INTERNAL_ERROR'; message: string }

export const Errors = {
  notFound: (resource: string): AppError => ({
    type: 'NOT_FOUND',
    message: `${resource} not found`,
  }),
  alreadyExists: (resource: string): AppError => ({
    type: 'ALREADY_EXISTS',
    message: `${resource} already exists`,
  }),
  unauthorized: (message = 'Unauthorized'): AppError => ({
    type: 'UNAUTHORIZED',
    message,
  }),
  invalidCredentials: (message = 'Invalid credentials'): AppError => ({
    type: 'INVALID_CREDENTIALS',
    message,
  }),
  databaseError: (message = 'Database operation failed'): AppError => ({
    type: 'DATABASE_ERROR',
    message,
  }),
  internalError: (message = 'Internal server error'): AppError => ({
    type: 'INTERNAL_ERROR',
    message,
  }),
} as const

export function errorToHttpStatus(error: AppError): ContentfulStatusCode {
  switch (error.type) {
    case 'NOT_FOUND':
      return 404
    case 'ALREADY_EXISTS':
      return 409
    case 'UNAUTHORIZED':
      return 401
    case 'INVALID_CREDENTIALS':
      return 401
    case 'DATABASE_ERROR':
      return 500
    case 'INTERNAL_ERROR':
      return 500
  }
}
