import bcrypt from 'bcrypt'
import type { Database } from '@repo/schemas'
import { User, UserUpdate } from '@repo/schemas/users'
import type { Kysely } from 'kysely'
import { ResultAsync } from 'neverthrow'
import { cleanUpdate, dbDelete, dbInsert, dbQueryFirst, dbQueryMany, dbUpdate, fromPromise } from 'src/shared/db-helpers'
import { Errors, type AppError } from 'src/shared/errors'

type DB = Kysely<Database>
type SafeUser = Omit<User, 'password'>

export type { SafeUser }

const safeUserColumns: (keyof SafeUser)[] = [
  'id',
  'username',
  'email',
  'role',
  'profile_pic',
  'created_at',
  'updated_at',
] as const

export function listUsers(
  db: DB,
  page: number,
  pageSize: number
): ResultAsync<SafeUser[], AppError> {
  return dbQueryMany(() =>
    db
      .selectFrom('users')
      .select([...safeUserColumns])
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .orderBy('updated_at', 'desc')
      .execute()
  )
}

export function getUserById(db: DB, id: string): ResultAsync<SafeUser, AppError> {
  return dbQueryFirst(
    () =>
      db
        .selectFrom('users')
        .select([...safeUserColumns])
        .where('id', '=', id)
        .executeTakeFirst(),
    Errors.notFound('User')
  )
}

export function createUser(
  db: DB,
  username: string,
  email: string,
  password: string,
  role: 'admin' | 'user'
): ResultAsync<SafeUser, AppError> {
  return fromPromise(bcrypt.hash(password, 10), () => Errors.internalError('Failed to hash password'))
    .andThen((hashedPassword) =>
      dbInsert(
        () =>
          db
            .insertInto('users')
            .values({
              username,
              email,
              password: hashedPassword,
              role,
            })
            .returning([...safeUserColumns])
            .executeTakeFirst(),
        'Failed to create user'
      )
    )
}

export function updateUser(
  db: DB,
  id: string,
  data: UserUpdate
): ResultAsync<SafeUser, AppError> {
  const hashIfNeeded = data.password
    ? fromPromise(bcrypt.hash(data.password, 10), () => Errors.internalError('Failed to hash password'))
    : ResultAsync.fromSafePromise<string | undefined, AppError>(Promise.resolve(undefined))

  return hashIfNeeded.andThen((hashedPassword) => {
    const updateData = cleanUpdate({
      ...data,
      ...(hashedPassword ? { password: hashedPassword } : {}),
    })
    return dbUpdate(
      () =>
        db
          .updateTable('users')
          .set(updateData)
          .where('id', '=', id)
          .returning([...safeUserColumns])
          .executeTakeFirst(),
      Errors.notFound('User')
    )
  })
}

export function deleteUser(db: DB, id: string): ResultAsync<{ id: string }, AppError> {
  return dbDelete(
    () =>
      db
        .deleteFrom('users')
        .where('id', '=', id)
        .returning('id')
        .executeTakeFirst(),
    Errors.notFound('User')
  )
}
