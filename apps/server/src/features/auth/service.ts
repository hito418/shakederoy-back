import bcrypt from 'bcrypt'
import type { Database } from '@repo/schemas'
import type { User } from '@repo/schemas/users'
import type { Kysely } from 'kysely'
import { ResultAsync, err, ok } from 'neverthrow'
import { dbInsert, dbQueryFirst, fromPromise } from 'src/shared/db-helpers'
import { Errors, type AppError } from 'src/shared/errors'

type DB = Kysely<Database>
type SafeUser = Omit<User, 'password'>

export interface UserCredentials {
  id: string
  username: string
  role: User['role']
}

export function initAdmin(
  db: DB,
  username: string,
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
      fromPromise(bcrypt.hash(password, 10), () => Errors.internalError('Failed to hash password'))
    )
    .andThen((hashedPassword) =>
      dbInsert(
        () =>
          db
            .insertInto('users')
            .values({
              username,
              email,
              password: hashedPassword,
              role: 'admin',
            } as any)
            .returningAll()
            .executeTakeFirst(),
        'Failed to create admin user'
      )
    )
    .map(({ password: _, ...safeUser }) => safeUser)
}

export function registerUser(
  db: DB,
  username: string,
  email: string,
  password: string
): ResultAsync<UserCredentials, AppError> {
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
            } as any)
            .returningAll()
            .executeTakeFirst(),
        'Failed to register user'
      )
    )
    .map((user) => ({
      id: user.id,
      username: user.username,
      role: user.role,
    }))
}

export function loginUser(
  db: DB,
  credential: string,
  password: string
): ResultAsync<UserCredentials, AppError> {
  return dbQueryFirst(
    () =>
      db
        .selectFrom('users')
        .selectAll()
        .where((eb) =>
          eb.or([
            eb('email', '=', credential),
            eb('username', '=', credential),
          ])
        )
        .executeTakeFirst(),
    Errors.notFound('User')
  )
    .andThen((user) =>
      fromPromise(
        bcrypt.compare(password, user.password),
        () => Errors.internalError('Password verification failed')
      ).andThen((isMatch) =>
        isMatch
          ? ok(user)
          : err(Errors.invalidCredentials('Wrong password'))
      )
    )
    .map((user) => ({
      id: user.id,
      username: user.username,
      role: user.role,
    }))
}
