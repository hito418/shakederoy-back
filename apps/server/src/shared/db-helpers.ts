import type { Database } from '@repo/schemas'
import type { Kysely } from 'kysely'
import { err, fromPromise, ok, ResultAsync } from 'neverthrow'
import { Errors, type AppError } from './errors'

export type PaginatedResult<T> = {
  data: T[]
  page: number
  size: number
  total: number
  totalPages: number
}

export function cleanUpdate<T extends Record<string, unknown>>(
  data: T
): Partial<T> & { updated_at: Date } {
  const cleaned = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  )
  return { ...cleaned, updated_at: new Date() } as Partial<T> & {
    updated_at: Date
  }
}

export function dbQuery<T>(
  promise: Promise<T>,
  errorFn: (e: unknown) => AppError = () => Errors.databaseError()
): ResultAsync<T, AppError> {
  return fromPromise(promise, errorFn)
}

export function guard<T>(
  error: AppError = Errors.notFound('Resource')
): (value: T | undefined) => ResultAsync<T, AppError> {
  return (value) => {
    if (value === undefined) {
      return err(error)
    }
    return ok(value)
  }
}

export function dbQueryPaginated<T>(
  db: Kysely<Database>,
  countFn: (
    trx: Kysely<Database>
  ) => Promise<{ count: string | number | bigint }[]>,
  dataFn: (trx: Kysely<Database>) => Promise<T[]>,
  page: number,
  size: number
): ResultAsync<PaginatedResult<T>, AppError> {
  return ResultAsync.fromPromise(
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
