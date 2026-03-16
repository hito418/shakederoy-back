import type { UserFavorite } from '@repo/schemas/favorites'
import type { ResultAsync } from 'neverthrow'
import { DbService, type PaginatedResult } from 'src/shared/db-service'
import type { AppError } from 'src/shared/errors'

export class FavoritesService {
  constructor(private db: DbService) {}

  list(
    userId: string,
    page: number,
    pageSize: number
  ): ResultAsync<PaginatedResult<UserFavorite>, AppError> {
    return this.db.queryPaginated(
      (trx) =>
        trx
          .selectFrom('user_favorites')
          .select((eb) => eb.fn.countAll().as('count'))
          .where('user_id', '=', userId)
          .execute(),
      (trx) =>
        trx
          .selectFrom('user_favorites')
          .selectAll()
          .where('user_id', '=', userId)
          .limit(pageSize)
          .offset((page - 1) * pageSize)
          .orderBy('created_at', 'desc')
          .execute(),
      page,
      pageSize
    )
  }

  toggle(
    userId: string,
    cocktailId: string
  ): ResultAsync<
    { action: 'added' | 'removed'; favorite: UserFavorite },
    AppError
  > {
    return this.db.transaction(async (trx) => {
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
}
