import type { Kyselify } from 'drizzle-orm/kysely'
import { doublePrecision, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import type { Insertable, Selectable, Updateable } from 'kysely'
import { barStyleEnum } from '../shared/enums'
import { users } from './users'
import { deletedAt, timestamps } from '../shared/timestamps'

export const bars = pgTable('bars', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  description: text('description'),
  address: text('address'),
  city: text('city'),
  postalCode: text('postal_code'),
  country: text('country'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  phone: text('phone'),
  website: text('website'),
  style: barStyleEnum('style'),
  ...timestamps,
  deletedAt,
})

export type Bar = Selectable<Kyselify<typeof bars>>
export type BarInsert = Insertable<Kyselify<typeof bars>>
export type BarUpdate = Updateable<Kyselify<typeof bars>>
