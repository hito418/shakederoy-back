import type { Kyselify } from 'drizzle-orm/kysely'
import { pgTable, text, uuid } from 'drizzle-orm/pg-core'
import type { Insertable, Selectable, Updateable } from 'kysely'
import { cocktails } from './cocktails'
import { ingredients } from './ingredients'
import { timestamps } from '../shared/timestamps'

export const cocktailIngredients = pgTable('cocktail_ingredients', {
  id: uuid('id').defaultRandom().primaryKey(),
  cocktailId: uuid('cocktail_id')
    .notNull()
    .references(() => cocktails.id, { onDelete: 'cascade' }),
  ingredientId: uuid('ingredient_id')
    .notNull()
    .references(() => ingredients.id, { onDelete: 'cascade' }),
  quantity: text('quantity'),
  unit: text('unit'),
  notes: text('notes'),
  ...timestamps,
})

export type CocktailIngredient = Selectable<Kyselify<typeof cocktailIngredients>>
export type CocktailIngredientInsert = Insertable<
  Kyselify<typeof cocktailIngredients>
>
export type CocktailIngredientUpdate = Updateable<
  Kyselify<typeof cocktailIngredients>
>
