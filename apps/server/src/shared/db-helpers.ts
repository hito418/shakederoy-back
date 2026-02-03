import { err, ok, ResultAsync } from 'neverthrow'
import { Errors, type AppError } from './errors'

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
  return fromPromise(queryFn(), () => Errors.databaseError()).andThen((result) =>
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

export function dbInsert<T>(
  queryFn: () => Promise<T | undefined>,
  errorMessage = 'Failed to insert record'
): ResultAsync<T, AppError> {
  return fromPromise(queryFn(), () => Errors.databaseError()).andThen((result) =>
    result !== undefined ? ok(result) : err(Errors.databaseError(errorMessage))
  )
}

export function dbUpdate<T>(
  queryFn: () => Promise<T | undefined>,
  notFoundError: AppError
): ResultAsync<T, AppError> {
  return fromPromise(queryFn(), () => Errors.databaseError()).andThen((result) =>
    result !== undefined ? ok(result) : err(notFoundError)
  )
}

export function dbDelete<T>(
  queryFn: () => Promise<T | undefined>,
  notFoundError: AppError
): ResultAsync<T, AppError> {
  return fromPromise(queryFn(), () => Errors.databaseError()).andThen((result) =>
    result !== undefined ? ok(result) : err(notFoundError)
  )
}
