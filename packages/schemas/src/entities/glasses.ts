import type { Kyselify } from 'drizzle-orm/kysely'
import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import type { Insertable, Selectable, Updateable } from 'kysely'
import { timestamps } from '../shared/timestamps'

export const glasses = pgTable('glasses', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').unique().notNull(),
  description: text('description'),
  capacity: integer('capacity'),
  imageUrl: text('image_url'),
  ...timestamps,
})

export type Glass = Selectable<Kyselify<typeof glasses>>
export type GlassInsert = Insertable<Kyselify<typeof glasses>>
export type GlassUpdate = Updateable<Kyselify<typeof glasses>>
