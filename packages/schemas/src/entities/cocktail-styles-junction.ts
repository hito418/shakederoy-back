import type { Kyselify } from 'drizzle-orm/kysely'
import { pgTable, uuid } from 'drizzle-orm/pg-core'
import type { Insertable, Selectable, Updateable } from 'kysely'
import { cocktails } from './cocktails'
import { cocktailStyles } from './cocktail-styles'
import { timestamps } from '../shared/timestamps'

export const cocktailStylesJunction = pgTable('cocktail_styles_junction', {
  id: uuid('id').defaultRandom().primaryKey(),
  cocktailId: uuid('cocktail_id')
    .notNull()
    .references(() => cocktails.id, { onDelete: 'cascade' }),
  styleId: uuid('style_id')
    .notNull()
    .references(() => cocktailStyles.id, { onDelete: 'cascade' }),
  ...timestamps,
})

export type CocktailStyleJunction = Selectable<
  Kyselify<typeof cocktailStylesJunction>
>
export type CocktailStyleJunctionInsert = Insertable<
  Kyselify<typeof cocktailStylesJunction>
>
export type CocktailStyleJunctionUpdate = Updateable<
  Kyselify<typeof cocktailStylesJunction>
>
