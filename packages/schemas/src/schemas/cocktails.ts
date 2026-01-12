import { pgTable, text, uuid } from 'drizzle-orm/pg-core'
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

export type Cocktail = typeof cocktails.$inferSelect
export type CocktailInsert = typeof cocktails.$inferInsert
