import type { CocktailVote } from '@repo/schemas/votes'
import type { CocktailView } from '@repo/schemas/cocktail-views'
import type { CocktailOfMonth } from '@repo/schemas/cocktail-of-month'
import { ResultAsync } from 'neverthrow'
import { DbService, type PaginatedResult } from 'src/shared/db-service'
import { AppError } from 'src/shared/errors'

export class AnalyticsService {
  constructor(private db: DbService) {}

  // --- Votes ---

  getVoteSummary(
    cocktailId: string,
    userId?: string | null
  ): ResultAsync<{
    cocktail_id: string
    upvotes: number
    downvotes: number
    score: number
    total: number
    user_vote: 'upvote' | 'downvote' | null
  }, AppError> {
    return this.db.transaction(async (trx) => {
      const [upvoteRow, downvoteRow, currentVote] = await Promise.all([
        trx
          .selectFrom('cocktail_votes')
          .select((eb) => eb.fn.countAll().as('count'))
          .where('cocktail_id', '=', cocktailId)
          .where('vote_type', '=', 'upvote')
          .executeTakeFirst(),
        trx
          .selectFrom('cocktail_votes')
          .select((eb) => eb.fn.countAll().as('count'))
          .where('cocktail_id', '=', cocktailId)
          .where('vote_type', '=', 'downvote')
          .executeTakeFirst(),
        userId
          ? trx
              .selectFrom('cocktail_votes')
              .select('vote_type')
              .where('cocktail_id', '=', cocktailId)
              .where('user_id', '=', userId)
              .executeTakeFirst()
          : Promise.resolve(undefined),
      ])

      const upvotes = Number(upvoteRow?.count ?? 0)
      const downvotes = Number(downvoteRow?.count ?? 0)

      return {
        cocktail_id: cocktailId,
        upvotes,
        downvotes,
        score: upvotes - downvotes,
        total: upvotes + downvotes,
        user_vote: currentVote?.vote_type ?? null,
      }
    })
  }

  listVotes(
    cocktailId: string,
    page: number,
    pageSize: number
  ): ResultAsync<PaginatedResult<CocktailVote>, AppError> {
    return this.db.queryPaginated(
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

  vote(
    cocktailId: string,
    userId: string,
    voteType: 'upvote' | 'downvote'
  ): ResultAsync<CocktailVote, AppError> {
    return this.db.transaction(async (trx) => {
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

  deleteVote(
    id: string,
    userId: string
  ): ResultAsync<CocktailVote, AppError> {
    return this.db.delete(
      (db) =>
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

  listViews(
    cocktailId: string,
    page: number,
    pageSize: number
  ): ResultAsync<PaginatedResult<CocktailView>, AppError> {
    return this.db.queryPaginated(
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

  createView(data: {
    cocktail_id: string
    user_id?: string | null
    ip_address?: string | null
    user_agent?: string | null
    hour_of_day?: number | null
    day_of_week?: number | null
  }): ResultAsync<CocktailView, AppError> {
    return this.db.insert(
      (db) =>
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

  listOfMonth(
    year: number,
    month: number
  ): ResultAsync<CocktailOfMonth[], AppError> {
    return this.db.queryMany((db) =>
      db
        .selectFrom('cocktail_of_month')
        .selectAll()
        .where('year', '=', year)
        .where('month', '=', month)
        .orderBy('rank', 'asc')
        .execute()
    )
  }

  getOfMonthById(id: string): ResultAsync<CocktailOfMonth, AppError> {
    return this.db.queryFirst(
      (db) =>
        db
          .selectFrom('cocktail_of_month')
          .selectAll()
          .where('id', '=', id)
          .executeTakeFirst(),
      AppError.notFound('CocktailOfMonth')
    )
  }

  createOfMonth(data: {
    cocktail_id: string
    year: number
    month: number
    rank?: number
  }): ResultAsync<CocktailOfMonth, AppError> {
    return this.db.insert(
      (db) =>
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

  updateOfMonth(
    id: string,
    data: {
      cocktail_id?: string
      year?: number
      month?: number
      rank?: number
    }
  ): ResultAsync<CocktailOfMonth, AppError> {
    return this.db.update(
      (db) =>
        db
          .updateTable('cocktail_of_month')
          .set(DbService.cleanUpdate(data))
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('CocktailOfMonth')
    )
  }

  deleteOfMonth(id: string): ResultAsync<CocktailOfMonth, AppError> {
    return this.db.delete(
      (db) =>
        db
          .deleteFrom('cocktail_of_month')
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('CocktailOfMonth')
    )
  }
}
