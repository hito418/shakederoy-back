import type { Kyselify } from 'drizzle-orm/kysely'
import { pgTable, uuid } from 'drizzle-orm/pg-core'
import type { Insertable, Selectable, Updateable } from 'kysely'
import { cocktails } from './cocktails'
import { users } from './users'
import { timestamps } from '../shared/timestamps'

export const userFavorites = pgTable('user_favorites', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  cocktailId: uuid('cocktail_id')
    .notNull()
    .references(() => cocktails.id, { onDelete: 'cascade' }),
  ...timestamps,
})

export type UserFavorite = Selectable<Kyselify<typeof userFavorites>>
export type UserFavoriteInsert = Insertable<Kyselify<typeof userFavorites>>
export type UserFavoriteUpdate = Updateable<Kyselify<typeof userFavorites>>
