import type { Kyselify } from 'drizzle-orm/kysely'
import { pgTable, text, uuid } from 'drizzle-orm/pg-core'
import type { Insertable, Selectable, Updateable } from 'kysely'
import { timestamps } from '../shared/timestamps'

export const alcoholTypes = pgTable('alcohol_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').unique().notNull(),
  description: text('description'),
  abvRangeMin: text('abv_range_min'),
  abvRangeMax: text('abv_range_max'),
  ...timestamps,
})

export type AlcoholType = Selectable<Kyselify<typeof alcoholTypes>>
export type AlcoholTypeInsert = Insertable<Kyselify<typeof alcoholTypes>>
export type AlcoholTypeUpdate = Updateable<Kyselify<typeof alcoholTypes>>
