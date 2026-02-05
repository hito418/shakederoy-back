import type { Kyselify } from 'drizzle-orm/kysely'
import { boolean, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import type { Insertable, Selectable, Updateable } from 'kysely'
import { cocktails } from './cocktails'
import { users } from './users'
import { deletedAt, timestamps } from '../shared/timestamps'

export const collections = pgTable('collections', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  isPublic: boolean('is_public').notNull().default(false),
  ...timestamps,
  deletedAt,
})

export const collectionCocktails = pgTable('collection_cocktails', {
  id: uuid('id').defaultRandom().primaryKey(),
  collectionId: uuid('collection_id')
    .notNull()
    .references(() => collections.id, { onDelete: 'cascade' }),
  cocktailId: uuid('cocktail_id')
    .notNull()
    .references(() => cocktails.id, { onDelete: 'cascade' }),
  ...timestamps,
})

export type Collection = Selectable<Kyselify<typeof collections>>
export type CollectionInsert = Insertable<Kyselify<typeof collections>>
export type CollectionUpdate = Updateable<Kyselify<typeof collections>>

export type CollectionCocktail = Selectable<Kyselify<typeof collectionCocktails>>
export type CollectionCocktailInsert = Insertable<
  Kyselify<typeof collectionCocktails>
>
export type CollectionCocktailUpdate = Updateable<
  Kyselify<typeof collectionCocktails>
>
