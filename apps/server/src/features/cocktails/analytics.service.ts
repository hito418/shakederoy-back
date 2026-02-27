import type { Database } from '@repo/schemas'
import type { CocktailVote } from '@repo/schemas/votes'
import type { CocktailView } from '@repo/schemas/cocktail-views'
import type { CocktailOfMonth } from '@repo/schemas/cocktail-of-month'
import type { Kysely } from 'kysely'
import { ResultAsync } from 'neverthrow'
import { cleanUpdate, dbDelete, dbInsert, dbQueryFirst, dbQueryMany, dbQueryPaginated, dbUpdate, withTransaction, type PaginatedResult } from 'src/shared/db-helpers'
import { AppError } from 'src/shared/errors'

type DB = Kysely<Database>

// --- Votes ---

export function listCocktailVotes(
  db: DB,
  cocktailId: string,
  page: number,
  pageSize: number
): ResultAsync<PaginatedResult<CocktailVote>, AppError> {
  return dbQueryPaginated(
    db,
    (trx) =>
      trx
        .selectFrom('cocktail_votes')
        .select((eb) => eb.fn.countAll().as('count'))
        .where('cocktail_id', '=', cocktailId)
        .execute(),
    (trx) =>
      trx
        .selectFrom('cocktail_votes')
        .selectAll()
        .where('cocktail_id', '=', cocktailId)
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .execute(),
    page,
    pageSize
  )
}

export function voteCocktail(
  db: DB,
  cocktailId: string,
  userId: string,
  voteType: 'upvote' | 'downvote'
): ResultAsync<CocktailVote, AppError> {
  return withTransaction(db, async (trx) => {
    const existing = await trx
      .selectFrom('cocktail_votes')
      .selectAll()
      .where('cocktail_id', '=', cocktailId)
      .where('user_id', '=', userId)
      .executeTakeFirst()

    if (existing && existing.vote_type === voteType) {
      const deleted = await trx
        .deleteFrom('cocktail_votes')
        .where('id', '=', existing.id)
        .returningAll()
        .executeTakeFirst()
      if (!deleted) throw new Error('Failed to delete vote')
      return deleted
    }

    if (existing) {
      const updated = await trx
        .updateTable('cocktail_votes')
        .set({ vote_type: voteType, updated_at: new Date() })
        .where('id', '=', existing.id)
        .returningAll()
        .executeTakeFirst()
      if (!updated) throw new Error('Failed to update vote')
      return updated
    }

    const created = await trx
      .insertInto('cocktail_votes')
      .values({
        cocktail_id: cocktailId,
        user_id: userId,
        vote_type: voteType,
      })
      .returningAll()
      .executeTakeFirst()
    if (!created) throw new Error('Failed to create vote')
    return created
  })
}

export function deleteCocktailVote(db: DB, id: string, userId: string): ResultAsync<CocktailVote, AppError> {
  return dbDelete(
    () =>
      db
        .deleteFrom('cocktail_votes')
        .where('id', '=', id)
        .where('user_id', '=', userId)
        .returningAll()
        .executeTakeFirst(),
    AppError.notFound('CocktailVote')
  )
}

// --- Views ---

export function listCocktailViews(
  db: DB,
  cocktailId: string,
  page: number,
  pageSize: number
): ResultAsync<PaginatedResult<CocktailView>, AppError> {
  return dbQueryPaginated(
    db,
    (trx) =>
      trx
        .selectFrom('cocktail_views')
        .select((eb) => eb.fn.countAll().as('count'))
        .where('cocktail_id', '=', cocktailId)
        .execute(),
    (trx) =>
      trx
        .selectFrom('cocktail_views')
        .selectAll()
        .where('cocktail_id', '=', cocktailId)
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .orderBy('created_at', 'desc')
        .execute(),
    page,
    pageSize
  )
}

export function createCocktailView(
  db: DB,
  data: {
    cocktail_id: string
    user_id?: string | null
    ip_address?: string | null
    user_agent?: string | null
    hour_of_day?: number | null
    day_of_week?: number | null
  }
): ResultAsync<CocktailView, AppError> {
  return dbInsert(
    () =>
      db
        .insertInto('cocktail_views')
        .values({
          cocktail_id: data.cocktail_id,
          user_id: data.user_id,
          ip_address: data.ip_address,
          user_agent: data.user_agent,
          hour_of_day: data.hour_of_day,
          day_of_week: data.day_of_week,
        })
        .returningAll()
        .executeTakeFirst(),
    'Failed to create view'
  )
}

// --- Cocktail of Month ---

export function listCocktailOfMonth(
  db: DB,
  year: number,
  month: number
): ResultAsync<CocktailOfMonth[], AppError> {
  return dbQueryMany(() =>
    db
      .selectFrom('cocktail_of_month')
      .selectAll()
      .where('year', '=', year)
      .where('month', '=', month)
      .orderBy('rank', 'asc')
      .execute()
  )
}

export function getCocktailOfMonthById(
  db: DB,
  id: string
): ResultAsync<CocktailOfMonth, AppError> {
  return dbQueryFirst(
    () =>
      db
        .selectFrom('cocktail_of_month')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst(),
    AppError.notFound('CocktailOfMonth')
  )
}

export function createCocktailOfMonth(
  db: DB,
  data: { cocktail_id: string; year: number; month: number; rank?: number }
): ResultAsync<CocktailOfMonth, AppError> {
  return dbInsert(
    () =>
      db
        .insertInto('cocktail_of_month')
        .values({
          cocktail_id: data.cocktail_id,
          year: data.year,
          month: data.month,
          ...(data.rank !== undefined ? { rank: data.rank } : {}),
        })
        .returningAll()
        .executeTakeFirst(),
    'Failed to create cocktail of month'
  )
}

export function updateCocktailOfMonth(
  db: DB,
  id: string,
  data: { cocktail_id?: string; year?: number; month?: number; rank?: number }
): ResultAsync<CocktailOfMonth, AppError> {
  return dbUpdate(
    () =>
      db
        .updateTable('cocktail_of_month')
        .set(cleanUpdate(data))
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst(),
    AppError.notFound('CocktailOfMonth')
  )
}

export function deleteCocktailOfMonth(
  db: DB,
  id: string
): ResultAsync<CocktailOfMonth, AppError> {
  return dbDelete(
    () =>
      db
        .deleteFrom('cocktail_of_month')
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst(),
    AppError.notFound('CocktailOfMonth')
  )
}
