import type {
  BarReviewInsert,
  BarReviewUpdate,
} from '@repo/schemas/bar-reviews'
import { DbService } from 'src/shared/db-service'

export class ReviewsService {
  constructor(private db: DbService) {}

  list(barId: string, page: number, pageSize: number) {
    return this.db.queryPaginated(
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

  getById(id: string) {
    return this.db.query((db) =>
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

  create(data: BarReviewInsert) {
    return this.db.query((db) =>
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

  update(id: string, userId: string, data: BarReviewUpdate) {
    return this.db.query((db) =>
      db
        .updateTable('bar_reviews')
        .set(DbService.cleanUpdate(data))
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

  delete(id: string, userId: string) {
    return this.db.query((db) =>
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
}
