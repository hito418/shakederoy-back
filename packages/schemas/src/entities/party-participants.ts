import type { Kyselify } from 'drizzle-orm/kysely'
import { boolean, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import type { Insertable, Selectable, Updateable } from 'kysely'
import { partySessions } from './party-sessions'
import { users } from './users'
import { timestamps } from '../shared/timestamps'

export const partyParticipants = pgTable('party_participants', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => partySessions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  guestName: text('guest_name'),
  prefersAlcoholic: boolean('prefers_alcoholic'),
  maxIntensity: integer('max_intensity'),
  ...timestamps,
})

export type PartyParticipant = Selectable<Kyselify<typeof partyParticipants>>
export type PartyParticipantInsert = Insertable<
  Kyselify<typeof partyParticipants>
>
export type PartyParticipantUpdate = Updateable<
  Kyselify<typeof partyParticipants>
>
