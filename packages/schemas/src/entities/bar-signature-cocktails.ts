import type { Kyselify } from 'drizzle-orm/kysely'
import { boolean, numeric, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import type { Insertable, Selectable, Updateable } from 'kysely'
import { bars } from './bars'
import { cocktails } from './cocktails'
import { timestamps } from '../shared/timestamps'

export const barSignatureCocktails = pgTable('bar_signature_cocktails', {
  id: uuid('id').defaultRandom().primaryKey(),
  barId: uuid('bar_id')
    .notNull()
    .references(() => bars.id, { onDelete: 'cascade' }),
  cocktailId: uuid('cocktail_id')
    .notNull()
    .references(() => cocktails.id, { onDelete: 'cascade' }),
  price: numeric('price', { precision: 10, scale: 2 }),
  currency: text('currency').default('EUR'),
  isAvailable: boolean('is_available').notNull().default(true),
  ...timestamps,
})

export type BarSignatureCocktail = Selectable<
  Kyselify<typeof barSignatureCocktails>
>
export type BarSignatureCocktailInsert = Insertable<
  Kyselify<typeof barSignatureCocktails>
>
export type BarSignatureCocktailUpdate = Updateable<
  Kyselify<typeof barSignatureCocktails>
>
