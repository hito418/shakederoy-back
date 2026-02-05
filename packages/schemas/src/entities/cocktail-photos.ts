import type { Kyselify } from 'drizzle-orm/kysely'
import { boolean, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import type { Insertable, Selectable, Updateable } from 'kysely'
import { cocktails } from './cocktails'
import { timestamps } from '../shared/timestamps'

export const cocktailPhotos = pgTable('cocktail_photos', {
  id: uuid('id').defaultRandom().primaryKey(),
  cocktailId: uuid('cocktail_id')
    .notNull()
    .references(() => cocktails.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  altText: text('alt_text'),
  isPrimary: boolean('is_primary').notNull().default(false),
  ...timestamps,
})

export type CocktailPhoto = Selectable<Kyselify<typeof cocktailPhotos>>
export type CocktailPhotoInsert = Insertable<Kyselify<typeof cocktailPhotos>>
export type CocktailPhotoUpdate = Updateable<Kyselify<typeof cocktailPhotos>>
