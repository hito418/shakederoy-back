import { pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core'
import { cocktails } from './cocktails'
import { users } from './users'

export const favorites = pgTable(
  'favorites',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    cocktailId: uuid('cocktail_id')
      .notNull()
      .references(() => cocktails.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.cocktailId] }),
  })
)

export type Favorite = typeof favorites.$inferSelect
export type FavoriteInsert = typeof favorites.$inferInsert
