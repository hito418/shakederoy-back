import type { Database } from '@repo/schemas'
import { BarReview, BarReviewInsert, BarReviewUpdate } from '@repo/schemas/bar-reviews'
import type { Kysely } from 'kysely'
import { ResultAsync } from 'neverthrow'
import { cleanUpdate, dbDelete, dbInsert, dbQueryFirst, dbQueryMany, dbUpdate } from 'src/shared/db-helpers'
import { Errors, type AppError } from 'src/shared/errors'

type DB = Kysely<Database>

export function listBarReviews(
  db: DB,
  barId: string,
  page: number,
  pageSize: number
): ResultAsync<BarReview[], AppError> {
  return dbQueryMany(() =>
    db
      .selectFrom('bar_reviews')
      .selectAll()
      .where('bar_id', '=', barId)
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .orderBy('updated_at', 'desc')
      .execute()
  )
}

export function getBarReviewById(db: DB, id: string): ResultAsync<BarReview, AppError> {
  return dbQueryFirst(
    () =>
      db
        .selectFrom('bar_reviews')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst(),
    Errors.notFound('Bar review')
  )
}

export function createBarReview(
  db: DB,
  data: BarReviewInsert
): ResultAsync<BarReview, AppError> {
  return dbInsert(
    () =>
      db
        .insertInto('bar_reviews')
        .values({
          bar_id: data.bar_id,
          user_id: data.user_id,
          rating: data.rating,
          comment: data.comment,
        })
        .returningAll()
        .executeTakeFirst(),
    'Failed to create bar review'
  )
}

export function updateBarReview(
  db: DB,
  id: string,
  userId: string,
  data: BarReviewUpdate
): ResultAsync<BarReview, AppError> {
  return dbUpdate(
    () =>
      db
        .updateTable('bar_reviews')
        .set(cleanUpdate(data))
        .where('id', '=', id)
        .where('user_id', '=', userId)
        .returningAll()
        .executeTakeFirst(),
    Errors.notFound('Bar review')
  )
}

export function deleteBarReview(db: DB, id: string, userId: string): ResultAsync<BarReview, AppError> {
  return dbDelete(
    () =>
      db
        .deleteFrom('bar_reviews')
        .where('id', '=', id)
        .where('user_id', '=', userId)
        .returningAll()
        .executeTakeFirst(),
    Errors.notFound('Bar review')
  )
}
