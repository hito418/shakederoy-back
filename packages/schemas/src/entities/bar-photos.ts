import type { Kyselify } from 'drizzle-orm/kysely'
import { boolean, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import type { Insertable, Selectable, Updateable } from 'kysely'
import { bars } from './bars'
import { timestamps } from '../shared/timestamps'

export const barPhotos = pgTable('bar_photos', {
  id: uuid('id').defaultRandom().primaryKey(),
  barId: uuid('bar_id')
    .notNull()
    .references(() => bars.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  altText: text('alt_text'),
  isPrimary: boolean('is_primary').notNull().default(false),
  ...timestamps,
})

export type BarPhoto = Selectable<Kyselify<typeof barPhotos>>
export type BarPhotoInsert = Insertable<Kyselify<typeof barPhotos>>
export type BarPhotoUpdate = Updateable<Kyselify<typeof barPhotos>>
