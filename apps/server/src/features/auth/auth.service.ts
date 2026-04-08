import bcrypt from 'bcrypt'
import type { User } from '@repo/schemas/users'
import { ResultAsync, err, fromPromise, ok } from 'neverthrow'
import { DbService } from 'src/shared/db-service'
import { AppError } from 'src/shared/errors'

type SafeUser = Omit<User, 'password'>

export interface UserCredentials {
  id: string
  username: string
  role: User['role']
}

export class AuthService {
  constructor(private db: DbService) {}

  initAdmin(
    username: string,
    email: string,
    password: string
  ): ResultAsync<SafeUser, AppError> {
    return this.db
      .query((db) => db.selectFrom('users').select('id').limit(1).execute())
      .andThen((userList) => {
        if (userList.length > 0) {
          return err(AppError.alreadyExists('Admin initialization'))
        }
        return ok(undefined)
      })
      .andThen(() =>
        fromPromise(bcrypt.hash(password, 10), () =>
          AppError.internalError('Failed to hash password')
        )
      )
      .andThen((hashedPassword) =>
        this.db.query(
          (db) =>
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
          () => AppError.databaseError('Failed to create admin user')
        )
      )
      .andThen(
        DbService.guard(AppError.databaseError('Failed to create admin user'))
      )
      .map(({ password: _, ...safeUser }) => safeUser)
  }

  registerUser(
    username: string,
    email: string,
    password: string,
    isBarOwner = false
  ): ResultAsync<UserCredentials, AppError> {
    return fromPromise(bcrypt.hash(password, 10), () =>
      AppError.internalError('Failed to hash password')
    )
      .andThen((hashedPassword) =>
        this.db.query(
          (db) =>
            db
              .insertInto('users')
              .values({
                username,
                email,
                password: hashedPassword,
                is_bar_owner: isBarOwner,
              })
              .returningAll()
              .executeTakeFirst(),
          () => AppError.databaseError('Failed to register user')
        )
      )
      .andThen(DbService.guard())
      .map((user) => ({
        id: user.id,
        username: user.username,
        role: user.role,
      }))
  }

  loginUser(
    credential: string,
    password: string
  ): ResultAsync<UserCredentials, AppError> {
    return this.db
      .query(
        (db) =>
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
        () => AppError.notFound('User')
      )
      .andThen(DbService.guard(AppError.notFound('User')))
      .andThen((user) =>
        fromPromise(bcrypt.compare(password, user.password), () =>
          AppError.internalError('Password verification failed')
        ).andThen((isMatch) =>
          isMatch
            ? ok(user)
            : err(AppError.invalidCredentials('Wrong password'))
        )
      )
      .map((user) => ({
        id: user.id,
        username: user.username,
        role: user.role,
      }))
  }
}
