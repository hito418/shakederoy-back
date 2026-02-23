import type { Database } from '@repo/schemas'
import type { UserFavorite } from '@repo/schemas/favorites'
import type { Kysely } from 'kysely'
import { ResultAsync } from 'neverthrow'
import { dbQueryMany, withTransaction } from 'src/shared/db-helpers'
import type { AppError } from 'src/shared/errors'

type DB = Kysely<Database>

export function listUserFavorites(
  db: DB,
  userId: string,
  page: number,
  pageSize: number
): ResultAsync<UserFavorite[], AppError> {
  return dbQueryMany(() =>
    db
      .selectFrom('user_favorites')
      .selectAll()
      .where('user_id', '=', userId)
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .orderBy('created_at', 'desc')
      .execute()
  )
}

export function toggleFavorite(
  db: DB,
  userId: string,
  cocktailId: string
): ResultAsync<{ action: 'added' | 'removed'; favorite: UserFavorite }, AppError> {
  return withTransaction(db, async (trx) => {
    const existing = await trx
      .selectFrom('user_favorites')
      .selectAll()
      .where('user_id', '=', userId)
      .where('cocktail_id', '=', cocktailId)
      .executeTakeFirst()

    if (existing) {
      const deleted = await trx
        .deleteFrom('user_favorites')
        .where('id', '=', existing.id)
        .returningAll()
        .executeTakeFirst()
      if (!deleted) throw new Error('Failed to delete favorite')
      return { action: 'removed' as const, favorite: deleted }
    }

    const created = await trx
      .insertInto('user_favorites')
      .values({ user_id: userId, cocktail_id: cocktailId })
      .returningAll()
      .executeTakeFirst()
    if (!created) throw new Error('Failed to create favorite')
    return { action: 'added' as const, favorite: created }
  })
}
