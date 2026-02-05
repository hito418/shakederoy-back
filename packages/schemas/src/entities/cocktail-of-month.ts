import type { Kyselify } from 'drizzle-orm/kysely'
import { integer, pgTable, uuid } from 'drizzle-orm/pg-core'
import type { Insertable, Selectable, Updateable } from 'kysely'
import { cocktails } from './cocktails'
import { timestamps } from '../shared/timestamps'

export const cocktailOfMonth = pgTable('cocktail_of_month', {
  id: uuid('id').defaultRandom().primaryKey(),
  cocktailId: uuid('cocktail_id')
    .notNull()
    .references(() => cocktails.id, { onDelete: 'cascade' }),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  rank: integer('rank').notNull().default(1),
  ...timestamps,
})

export type CocktailOfMonth = Selectable<Kyselify<typeof cocktailOfMonth>>
export type CocktailOfMonthInsert = Insertable<Kyselify<typeof cocktailOfMonth>>
export type CocktailOfMonthUpdate = Updateable<Kyselify<typeof cocktailOfMonth>>
