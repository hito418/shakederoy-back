import type { CocktailVote } from '@repo/schemas/votes'
import type { CocktailView } from '@repo/schemas/cocktail-views'
import type { CocktailOfMonth } from '@repo/schemas/cocktail-of-month'
import { ResultAsync } from 'neverthrow'
import { DbService, type PaginatedResult } from 'src/shared/db-service'
import { AppError } from 'src/shared/errors'

export class AnalyticsService {
  constructor(private db: DbService) {}

  listRankings(
    period: 'weekly' | 'monthly',
    limit: number
  ): ResultAsync<
    {
      cocktail_id: string
      score: number
      upvotes: number
      downvotes: number
      total: number
    }[],
    AppError
  > {
    return this.db.transaction(async (trx) => {
      const now = new Date()
      const startDate = new Date(now)

      if (period === 'weekly') {
        const day = startDate.getDay()
        const diff = day === 0 ? 6 : day - 1
        startDate.setDate(startDate.getDate() - diff)
      } else {
        startDate.setDate(1)
      }

      startDate.setHours(0, 0, 0, 0)

      const votes = await trx
        .selectFrom('cocktail_votes')
        .innerJoin('cocktails', 'cocktail_votes.cocktail_id', 'cocktails.id')
        .select(['cocktail_votes.cocktail_id', 'cocktail_votes.vote_type'])
        .where('cocktail_votes.created_at', '>=', startDate)
        .where('cocktails.status', '=', 'approved')
        .where('cocktails.deleted_at', 'is', null)
        .execute()

      const rankingsMap = new Map<
        string,
        {
          cocktail_id: string
          score: number
          upvotes: number
          downvotes: number
          total: number
        }
      >()

      for (const vote of votes) {
        const current = rankingsMap.get(vote.cocktail_id) ?? {
          cocktail_id: vote.cocktail_id,
          score: 0,
          upvotes: 0,
          downvotes: 0,
          total: 0,
        }

        if (vote.vote_type === 'upvote') {
          current.upvotes += 1
          current.score += 1
        } else {
          current.downvotes += 1
          current.score -= 1
        }

        current.total += 1
        rankingsMap.set(vote.cocktail_id, current)
      }

      return Array.from(rankingsMap.values())
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score
          if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes
          return b.total - a.total
        })
        .slice(0, limit)
    })
  }

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
