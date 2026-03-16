import bcrypt from 'bcrypt'
import type { User, UserUpdate } from '@repo/schemas/users'
import { fromPromise, ResultAsync } from 'neverthrow'
import { DbService, type PaginatedResult } from 'src/shared/db-service'
import { AppError } from 'src/shared/errors'

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

export class UsersService {
  constructor(private db: DbService) {}

  list(
    page: number,
    pageSize: number
  ): ResultAsync<PaginatedResult<SafeUser>, AppError> {
    return this.db.queryPaginated(
      (trx) =>
        trx
          .selectFrom('users')
          .select((eb) => eb.fn.countAll().as('count'))
          .execute(),
      (trx) =>
        trx
          .selectFrom('users')
          .select([...safeUserColumns])
          .limit(pageSize)
          .offset((page - 1) * pageSize)
          .orderBy('updated_at', 'desc')
          .execute(),
      page,
      pageSize
    )
  }

  getById(id: string): ResultAsync<SafeUser, AppError> {
    return this.db.queryFirst(
      (db) =>
        db
          .selectFrom('users')
          .select([...safeUserColumns])
          .where('id', '=', id)
          .executeTakeFirst(),
      AppError.notFound('User')
    )
  }

  create(
    username: string,
    email: string,
    password: string,
    role: 'admin' | 'user'
  ): ResultAsync<SafeUser, AppError> {
    return fromPromise(
      bcrypt.hash(password, 10),
      () => AppError.internalError('Failed to hash password')
    ).andThen((hashedPassword) =>
      this.db.insert(
        (db) =>
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

  update(
    id: string,
    data: UserUpdate
  ): ResultAsync<SafeUser, AppError> {
    const hashIfNeeded = data.password
      ? fromPromise(
          bcrypt.hash(data.password, 10),
          () => AppError.internalError('Failed to hash password')
        )
      : ResultAsync.fromSafePromise<string | undefined, AppError>(
          Promise.resolve(undefined)
        )

    return hashIfNeeded.andThen((hashedPassword) => {
      const updateData = DbService.cleanUpdate({
        ...data,
        ...(hashedPassword ? { password: hashedPassword } : {}),
      })
      return this.db.update(
        (db) =>
          db
            .updateTable('users')
            .set(updateData)
            .where('id', '=', id)
            .returning([...safeUserColumns])
            .executeTakeFirst(),
        AppError.notFound('User')
      )
    })
  }

  delete(id: string): ResultAsync<{ id: string }, AppError> {
    return this.db.delete(
      (db) =>
        db
          .deleteFrom('users')
          .where('id', '=', id)
          .returning('id')
          .executeTakeFirst(),
      AppError.notFound('User')
    )
  }
}
