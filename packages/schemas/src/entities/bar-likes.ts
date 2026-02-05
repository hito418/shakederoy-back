import type { Kyselify } from 'drizzle-orm/kysely'
import { pgTable, uuid } from 'drizzle-orm/pg-core'
import type { Insertable, Selectable, Updateable } from 'kysely'
import { bars } from './bars'
import { users } from './users'
import { timestamps } from '../shared/timestamps'

export const barLikes = pgTable('bar_likes', {
  id: uuid('id').defaultRandom().primaryKey(),
  barId: uuid('bar_id')
    .notNull()
    .references(() => bars.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  ...timestamps,
})

export type BarLike = Selectable<Kyselify<typeof barLikes>>
export type BarLikeInsert = Insertable<Kyselify<typeof barLikes>>
export type BarLikeUpdate = Updateable<Kyselify<typeof barLikes>>
