import bcrypt from 'bcrypt'
import type { Database } from '@repo/schemas'
import type { User } from '@repo/schemas/users'
import type { Kysely } from 'kysely'
import { ResultAsync, err, fromPromise, ok } from 'neverthrow'
import { dbQuery, guard } from 'src/shared/db-helpers'
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
  return dbQuery(db.selectFrom('users').select('id').limit(1).execute())
    .andThen((userList) => {
      if (userList.length > 0) {
        return err(Errors.alreadyExists('Admin initialization'))
      }
      return ok(undefined)
    })
    .andThen(() =>
      fromPromise(bcrypt.hash(password, 10), () =>
        Errors.internalError('Failed to hash password')
      )
    )
    .andThen((hashedPassword) =>
      dbQuery(
        db
          .insertInto('users')
          .values({
            username,
            email,
            password: hashedPassword,
            role: 'admin',
          })
          .returningAll()
          .executeTakeFirst(),
        () => Errors.databaseError('Failed to create admin user')
      )
    )
    .andThen(guard(Errors.databaseError('Failed to create admin user')))
    .map(({ password: _, ...safeUser }) => safeUser)
}

export function registerUser(
  db: DB,
  username: string,
  email: string,
  password: string
): ResultAsync<UserCredentials, AppError> {
  return fromPromise(bcrypt.hash(password, 10), () =>
    Errors.internalError('Failed to hash password')
  )
    .andThen((hashedPassword) =>
      dbQuery(
        db
          .insertInto('users')
          .values({
            username,
            email,
            password: hashedPassword,
          })
          .returningAll()
          .executeTakeFirst(),
        () => Errors.databaseError('Failed to register user')
      )
    )
    .andThen(guard())
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
  return dbQuery(
    db
      .selectFrom('users')
      .selectAll()
      .where((eb) =>
        eb.or([eb('email', '=', credential), eb('username', '=', credential)])
      )
      .executeTakeFirst(),
    () => Errors.notFound('User')
  )
    .andThen(guard(Errors.notFound('User')))
    .andThen((user) =>
      fromPromise(bcrypt.compare(password, user.password), () =>
        Errors.internalError('Password verification failed')
      ).andThen((isMatch) =>
        isMatch ? ok(user) : err(Errors.invalidCredentials('Wrong password'))
      )
    )
    .map((user) => ({
      id: user.id,
      username: user.username,
      role: user.role,
    }))
}
