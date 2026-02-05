import type { Kyselify } from 'drizzle-orm/kysely'
import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import type { Insertable, Selectable, Updateable } from 'kysely'
import { bars } from './bars'
import { users } from './users'
import { deletedAt, timestamps } from '../shared/timestamps'

export const barReviews = pgTable('bar_reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  barId: uuid('bar_id')
    .notNull()
    .references(() => bars.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  ...timestamps,
  deletedAt,
})

export type BarReview = Selectable<Kyselify<typeof barReviews>>
export type BarReviewInsert = Insertable<Kyselify<typeof barReviews>>
export type BarReviewUpdate = Updateable<Kyselify<typeof barReviews>>
