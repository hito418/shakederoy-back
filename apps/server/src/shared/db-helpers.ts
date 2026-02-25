import type { Database } from '@repo/schemas'
import type { Kysely } from 'kysely'
import { err, ok, ResultAsync } from 'neverthrow'
import { Errors, type AppError } from './errors'

export type PaginatedResult<T> = {
  data: T[]
  page: number
  size: number
  total: number
  totalPages: number
}

export function cleanUpdate<T extends Record<string, unknown>>(data: T): Partial<T> & { updated_at: Date } {
  const cleaned = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  )
  return { ...cleaned, updated_at: new Date() } as Partial<T> & { updated_at: Date }
}

export function withTransaction<T>(
  db: Kysely<Database>,
  fn: (trx: Kysely<Database>) => Promise<T>
): ResultAsync<T, AppError> {
  return fromPromise(db.transaction().execute(fn), () => Errors.databaseError())
}

export function fromPromise<T>(
  promise: Promise<T>,
  errorFn: (e: unknown) => AppError = () => Errors.internalError()
): ResultAsync<T, AppError> {
  return ResultAsync.fromPromise(promise, errorFn)
}

export function dbQueryFirst<T>(
  queryFn: () => Promise<T | undefined>,
  notFoundError: AppError
): ResultAsync<T, AppError> {
  return fromPromise(queryFn(), () => Errors.databaseError(notFoundError.message)).andThen((result) =>
    result !== undefined ? ok(result) : err(notFoundError)
  )
}

export function dbQueryFirstOptional<T>(
  queryFn: () => Promise<T | undefined>
): ResultAsync<T | undefined, AppError> {
  return fromPromise(queryFn(), () => Errors.databaseError())
}

export function dbQueryMany<T>(queryFn: () => Promise<T[]>): ResultAsync<T[], AppError> {
  return fromPromise(queryFn(), () => Errors.databaseError())
}

export function dbQueryPaginated<T>(
  db: Kysely<Database>,
  countFn: (trx: Kysely<Database>) => Promise<{ count: string | number | bigint }[]>,
  dataFn: (trx: Kysely<Database>) => Promise<T[]>,
  page: number,
  size: number
): ResultAsync<PaginatedResult<T>, AppError> {
  return fromPromise(
    db.transaction().execute(async (trx) => {
      const [countRows, data] = await Promise.all([countFn(trx), dataFn(trx)])
      const total = Number(countRows[0]?.count ?? 0)
      return {
        data,
        page,
        size,
        total,
        totalPages: Math.ceil(total / size),
      }
    }),
    () => Errors.databaseError()
  )
}

export function dbInsert<T>(
  queryFn: () => Promise<T | undefined>,
  errorMessage = 'Failed to insert record'
): ResultAsync<T, AppError> {
  return fromPromise(queryFn(), () => Errors.databaseError(errorMessage)).andThen((result) =>
    result !== undefined ? ok(result) : err(Errors.databaseError(errorMessage))
  )
}

export function dbUpdate<T>(
  queryFn: () => Promise<T | undefined>,
  notFoundError: AppError
): ResultAsync<T, AppError> {
  return fromPromise(queryFn(), () => Errors.databaseError(notFoundError.message)).andThen((result) =>
    result !== undefined ? ok(result) : err(notFoundError)
  )
}

export function dbDelete<T>(
  queryFn: () => Promise<T | undefined>,
  notFoundError: AppError
): ResultAsync<T, AppError> {
  return fromPromise(queryFn(), () => Errors.databaseError(notFoundError.message)).andThen((result) =>
    result !== undefined ? ok(result) : err(notFoundError)
  )
}
