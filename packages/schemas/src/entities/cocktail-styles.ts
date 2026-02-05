import type { Kyselify } from 'drizzle-orm/kysely'
import { pgTable, text, uuid } from 'drizzle-orm/pg-core'
import type { Insertable, Selectable, Updateable } from 'kysely'
import { timestamps } from '../shared/timestamps'

export const cocktailStyles = pgTable('cocktail_styles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').unique().notNull(),
  description: text('description'),
  ...timestamps,
})

export type CocktailStyle = Selectable<Kyselify<typeof cocktailStyles>>
export type CocktailStyleInsert = Insertable<Kyselify<typeof cocktailStyles>>
export type CocktailStyleUpdate = Updateable<Kyselify<typeof cocktailStyles>>
