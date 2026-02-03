import type { Kysely, Selectable } from 'kysely'
import type { Database } from '@repo/schemas'
import { ResultAsync } from 'neverthrow'
import { Errors, type AppError } from 'src/shared/errors'
import { dbQueryMany, dbQueryFirst, dbInsert, dbUpdate, dbDelete } from 'src/shared/db-helpers'

type DB = Kysely<Database>
type UserRow = Selectable<Database['users']>
type SafeUser = Omit<UserRow, 'password'>

export type { SafeUser }

const safeUserColumns = [
  'id',
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

export function listAllUsers(db: DB): ResultAsync<SafeUser[], AppError> {
  return dbQueryMany(() =>
    db
      .selectFrom('users')
      .select([...safeUserColumns])
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
  email: string,
  password: string,
  role: 'admin' | 'user'
): ResultAsync<SafeUser, AppError> {
  return dbInsert(
    () =>
      db
        .insertInto('users')
        .values({
          email,
          password,
          role,
        })
        .returning([...safeUserColumns])
        .executeTakeFirst(),
    'Failed to create user'
  )
}

export type UpdateUserData = {
  email?: string
  password?: string
  phoneNumber?: string | null
  city?: string | null
  region?: string | null
  zipCode?: string | null
  role?: 'admin' | 'user'
}

export function updateUser(
  db: DB,
  id: string,
  data: UpdateUserData
): ResultAsync<SafeUser, AppError> {
  return dbUpdate(
    () =>
      db
        .updateTable('users')
        .set({ ...data })
        .where('id', '=', id)
        .returning([...safeUserColumns])
        .executeTakeFirst(),
    Errors.notFound('User')
  )
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
