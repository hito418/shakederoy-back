import { hash, verify } from '@node-rs/argon2'
import { sign } from 'hono/jwt'
import type { Kysely, Selectable } from 'kysely'
import type { Database } from '@repo/schemas'
import { Payload } from 'src/shared/types/payload'
import { ResultAsync, err, ok } from 'neverthrow'
import { Errors, type AppError } from 'src/shared/errors'
import { fromPromise, dbQueryFirst, dbInsert } from 'src/shared/db-helpers'

type DB = Kysely<Database>
type UserRow = Selectable<Database['users']>
type SafeUser = Omit<UserRow, 'password'>

export function initAdmin(
  db: DB,
  email: string,
  password: string
): ResultAsync<SafeUser, AppError> {
  return fromPromise(
    db.selectFrom('users').select('id').limit(1).execute(),
    () => Errors.databaseError()
  )
    .andThen((userList) => {
      if (userList.length > 0) {
        return err(Errors.alreadyExists('Admin initialization'))
      }
      return ok(undefined)
    })
    .andThen(() =>
      fromPromise(hash(password), () => Errors.internalError('Failed to hash password'))
    )
    .andThen((hashedPassword) =>
      dbInsert(
        () =>
          db
            .insertInto('users')
            .values({
              email,
              password: hashedPassword,
              role: 'admin',
            })
            .returningAll()
            .executeTakeFirst(),
        'Failed to create admin user'
      )
    )
    .map(({ password: _, ...safeUser }) => safeUser)
}

export function registerUser(
  db: DB,
  email: string,
  password: string
): ResultAsync<Payload, AppError> {
  return fromPromise(hash(password), () => Errors.internalError('Failed to hash password'))
    .andThen((hashedPassword) =>
      dbInsert(
        () =>
          db
            .insertInto('users')
            .values({
              email,
              password: hashedPassword,
            })
            .returningAll()
            .executeTakeFirst(),
        'Failed to register user'
      )
    )
    .map((user) => ({
      sub: { id: user.id },
      role: user.role,
    }))
}

export function loginUser(
  db: DB,
  email: string,
  password: string
): ResultAsync<Payload, AppError> {
  return dbQueryFirst(
    () =>
      db
        .selectFrom('users')
        .selectAll()
        .where('email', '=', email)
        .executeTakeFirst(),
    Errors.notFound('User')
  )
    .andThen((user) =>
      fromPromise(
        verify(user.password, password),
        () => Errors.internalError('Password verification failed')
      ).andThen((isMatch) =>
        isMatch
          ? ok(user)
          : err(Errors.invalidCredentials('Wrong password'))
      )
    )
    .map((user) => ({
      sub: { id: user.id },
      role: user.role,
    }))
}

export function createToken(payload: Payload, secret: string): ResultAsync<string, AppError> {
  return fromPromise(
    sign(payload, secret),
    () => Errors.internalError('Failed to create token')
  )
}
