import type { Kyselify } from 'drizzle-orm/kysely'
import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import type { Insertable, Selectable, Updateable } from 'kysely'
import { cocktails } from './cocktails'
import { users } from './users'
import { timestamps } from '../shared/timestamps'

export const cocktailViews = pgTable('cocktail_views', {
  id: uuid('id').defaultRandom().primaryKey(),
  cocktailId: uuid('cocktail_id')
    .notNull()
    .references(() => cocktails.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  hourOfDay: integer('hour_of_day'),
  dayOfWeek: integer('day_of_week'),
  ...timestamps,
})

export type CocktailView = Selectable<Kyselify<typeof cocktailViews>>
export type CocktailViewInsert = Insertable<Kyselify<typeof cocktailViews>>
export type CocktailViewUpdate = Updateable<Kyselify<typeof cocktailViews>>
