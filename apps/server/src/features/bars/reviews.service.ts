import type { Database } from '@repo/schemas'
import { BarReviewInsert, BarReviewUpdate } from '@repo/schemas/bar-reviews'
import type { Kysely } from 'kysely'
import { cleanUpdate, dbQuery, dbQueryPaginated } from 'src/shared/db-helpers'
import { AppError } from 'src/shared/errors'

type DB = Kysely<Database>

export function listBarReviews(
  db: DB,
  barId: string,
  page: number,
  pageSize: number
) {
  return dbQueryPaginated(
    db,
    (trx) =>
      trx
        .selectFrom('bar_reviews')
        .select((eb) => eb.fn.countAll().as('count'))
        .where('bar_id', '=', barId)
        .execute(),
    (trx) =>
      trx
        .selectFrom('bar_reviews')
        .selectAll()
        .where('bar_id', '=', barId)
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .orderBy('updated_at', 'desc')
        .execute(),
    page,
    pageSize
  )
}

export function getBarReviewById(
  db: DB,
  id: string
) {
  return dbQuery(
    db
      .selectFrom('bar_reviews')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()
      .then((row) => {
        if (!row) throw new Error('Bar review not found')
        return row
      })
  )
}

export function createBarReview(
  db: DB,
  data: BarReviewInsert
) {
  return dbQuery(
    db
      .insertInto('bar_reviews')
      .values({
        bar_id: data.bar_id,
        user_id: data.user_id,
        rating: data.rating,
        comment: data.comment,
      })
      .returningAll()
      .executeTakeFirst()
      .then((row) => {
        if (!row) throw new Error('Failed to create bar review')
        return row
      })
  )
}

export function updateBarReview(
  db: DB,
  id: string,
  userId: string,
  data: BarReviewUpdate
) {
  return dbQuery(
    db
      .updateTable('bar_reviews')
      .set(cleanUpdate(data))
      .where('id', '=', id)
      .where('user_id', '=', userId)
      .returningAll()
      .executeTakeFirst()
      .then((row) => {
        if (!row) throw new Error('Bar review not found')
        return row
      })
  )
}

export function deleteBarReview(
  db: DB,
  id: string,
  userId: string
) {
  return dbQuery(
    db
      .deleteFrom('bar_reviews')
      .where('id', '=', id)
      .where('user_id', '=', userId)
      .returningAll()
      .executeTakeFirst()
      .then((row) => {
        if (!row) throw new Error('Bar review not found')
        return row
      })
  )
}
