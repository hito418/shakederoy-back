import type { Kyselify } from 'drizzle-orm/kysely'
import { pgTable, uuid } from 'drizzle-orm/pg-core'
import type { Insertable, Selectable, Updateable } from 'kysely'
import { cocktailStyles } from './cocktail-styles'
import { partyParticipants } from './party-participants'
import { timestamps } from '../shared/timestamps'

export const partyParticipantStyles = pgTable('party_participant_styles', {
  id: uuid('id').defaultRandom().primaryKey(),
  participantId: uuid('participant_id')
    .notNull()
    .references(() => partyParticipants.id, { onDelete: 'cascade' }),
  styleId: uuid('style_id')
    .notNull()
    .references(() => cocktailStyles.id, { onDelete: 'cascade' }),
  ...timestamps,
})

export type PartyParticipantStyle = Selectable<
  Kyselify<typeof partyParticipantStyles>
>
export type PartyParticipantStyleInsert = Insertable<
  Kyselify<typeof partyParticipantStyles>
>
export type PartyParticipantStyleUpdate = Updateable<
  Kyselify<typeof partyParticipantStyles>
>
