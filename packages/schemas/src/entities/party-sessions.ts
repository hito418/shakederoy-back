import type { Kyselify } from 'drizzle-orm/kysely'
import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { Insertable, Selectable, Updateable } from 'kysely'
import { partyModeEnum } from '../shared/enums'
import { users } from './users'
import { timestamps } from '../shared/timestamps'

export const partySessions = pgTable('party_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').unique().notNull(),
  hostId: uuid('host_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name'),
  mode: partyModeEnum('mode').notNull().default('voting'),
  isActive: boolean('is_active').notNull().default(true),
  expiresAt: timestamp('expires_at'),
  ...timestamps,
})

export type PartySession = Selectable<Kyselify<typeof partySessions>>
export type PartySessionInsert = Insertable<Kyselify<typeof partySessions>>
export type PartySessionUpdate = Updateable<Kyselify<typeof partySessions>>
