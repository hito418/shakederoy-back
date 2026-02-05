import type { Kyselify } from 'drizzle-orm/kysely'
import { integer, pgTable, uuid } from 'drizzle-orm/pg-core'
import type { Insertable, Selectable, Updateable } from 'kysely'
import { cocktails } from './cocktails'
import { partySessions } from './party-sessions'
import { timestamps } from '../shared/timestamps'

export const partyCocktailSelections = pgTable('party_cocktail_selections', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => partySessions.id, { onDelete: 'cascade' }),
  cocktailId: uuid('cocktail_id')
    .notNull()
    .references(() => cocktails.id, { onDelete: 'cascade' }),
  voteCount: integer('vote_count').notNull().default(0),
  isSelected: integer('is_selected').notNull().default(0),
  ...timestamps,
})

export type PartyCocktailSelection = Selectable<
  Kyselify<typeof partyCocktailSelections>
>
export type PartyCocktailSelectionInsert = Insertable<
  Kyselify<typeof partyCocktailSelections>
>
export type PartyCocktailSelectionUpdate = Updateable<
  Kyselify<typeof partyCocktailSelections>
>
