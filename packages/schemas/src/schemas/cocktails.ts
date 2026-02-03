import type { Kyselify } from 'drizzle-orm/kysely'
import { pgTable, text, uuid } from 'drizzle-orm/pg-core'
import type { Insertable, Selectable, Updateable } from 'kysely'
import { timestamps } from './utils/timestamps'

export const cocktails = pgTable('cocktails', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').unique().notNull(),
  description: text('description').notNull(),
  ingredients: text('ingredients').notNull(),
  instructions: text('instructions').notNull(),
  image: text('image'),
  ...timestamps,
})

export type Cocktail = Selectable<Kyselify<typeof cocktails>>
export type CocktailInsert = Insertable<Kyselify<typeof cocktails>>
export type CocktailUpdate = Updateable<Kyselify<typeof cocktails>>
