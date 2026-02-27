import type { Database } from '@repo/schemas'
import type { PartySession, PartySessionInsert, PartySessionUpdate } from '@repo/schemas/party-sessions'
import type { PartyParticipant, PartyParticipantInsert, PartyParticipantUpdate } from '@repo/schemas/party-participants'
import type { PartyParticipantStyle, PartyParticipantStyleInsert } from '@repo/schemas/party-participant-styles'
import type { PartyCocktailSelection, PartyCocktailSelectionInsert, PartyCocktailSelectionUpdate } from '@repo/schemas/party-cocktail-selections'
import type { Kysely } from 'kysely'
import type { ResultAsync } from 'neverthrow'
import { cleanUpdate, dbDelete, dbInsert, dbQueryFirst, dbQueryMany, dbQueryPaginated, dbUpdate, type PaginatedResult } from 'src/shared/db-helpers'
import { AppError } from 'src/shared/errors'

type DB = Kysely<Database>

// --- Party Sessions ---

export function listPartySessions(
  db: DB,
  page: number,
  pageSize: number
): ResultAsync<PaginatedResult<PartySession>, AppError> {
  return dbQueryPaginated(
    db,
    (trx) =>
      trx
        .selectFrom('party_sessions')
        .select((eb) => eb.fn.countAll().as('count'))
        .where('is_active', '=', true)
        .execute(),
    (trx) =>
      trx
        .selectFrom('party_sessions')
        .selectAll()
        .where('is_active', '=', true)
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .orderBy('created_at', 'desc')
        .execute(),
    page,
    pageSize
  )
}

export function getPartySessionById(
  db: DB,
  id: string
): ResultAsync<PartySession, AppError> {
  return dbQueryFirst(
    () =>
      db
        .selectFrom('party_sessions')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst(),
    AppError.notFound('PartySession')
  )
}

export function getPartySessionByCode(
  db: DB,
  code: string
): ResultAsync<PartySession, AppError> {
  return dbQueryFirst(
    () =>
      db
        .selectFrom('party_sessions')
        .selectAll()
        .where('code', '=', code)
        .executeTakeFirst(),
    AppError.notFound('PartySession')
  )
}

export function createPartySession(
  db: DB,
  data: PartySessionInsert
): ResultAsync<PartySession, AppError> {
  return dbInsert(
    () =>
      db
        .insertInto('party_sessions')
        .values({
          code: data.code,
          host_id: data.host_id,
          name: data.name,
          mode: data.mode,
          is_active: data.is_active,
          expires_at: data.expires_at,
        })
        .returningAll()
        .executeTakeFirst(),
    'Failed to create party session'
  )
}

export function updatePartySession(
  db: DB,
  id: string,
  hostId: string,
  data: PartySessionUpdate
): ResultAsync<PartySession, AppError> {
  return dbUpdate(
    () =>
      db
        .updateTable('party_sessions')
        .set(cleanUpdate(data))
        .where('id', '=', id)
        .where('host_id', '=', hostId)
        .returningAll()
        .executeTakeFirst(),
    AppError.notFound('PartySession')
  )
}

export function deletePartySession(
  db: DB,
  id: string,
  hostId: string
): ResultAsync<PartySession, AppError> {
  return dbDelete(
    () =>
      db
        .deleteFrom('party_sessions')
        .where('id', '=', id)
        .where('host_id', '=', hostId)
        .returningAll()
        .executeTakeFirst(),
    AppError.notFound('PartySession')
  )
}

// --- Party Participants ---

export function listPartyParticipants(
  db: DB,
  sessionId: string
): ResultAsync<PartyParticipant[], AppError> {
  return dbQueryMany(() =>
    db
      .selectFrom('party_participants')
      .selectAll()
      .where('session_id', '=', sessionId)
      .orderBy('created_at', 'asc')
      .execute()
  )
}

export function createPartyParticipant(
  db: DB,
  data: PartyParticipantInsert
): ResultAsync<PartyParticipant, AppError> {
  return dbInsert(
    () =>
      db
        .insertInto('party_participants')
        .values({
          session_id: data.session_id,
          user_id: data.user_id,
          guest_name: data.guest_name,
          prefers_alcoholic: data.prefers_alcoholic,
          max_intensity: data.max_intensity,
        })
        .returningAll()
        .executeTakeFirst(),
    'Failed to add participant'
  )
}

export function updatePartyParticipant(
  db: DB,
  id: string,
  data: PartyParticipantUpdate
): ResultAsync<PartyParticipant, AppError> {
  return dbUpdate(
    () =>
      db
        .updateTable('party_participants')
        .set(cleanUpdate(data))
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst(),
    AppError.notFound('PartyParticipant')
  )
}

export function deletePartyParticipant(
  db: DB,
  id: string
): ResultAsync<PartyParticipant, AppError> {
  return dbDelete(
    () =>
      db
        .deleteFrom('party_participants')
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst(),
    AppError.notFound('PartyParticipant')
  )
}

// --- Party Participant Styles ---

export function listParticipantStyles(
  db: DB,
  participantId: string
): ResultAsync<PartyParticipantStyle[], AppError> {
  return dbQueryMany(() =>
    db
      .selectFrom('party_participant_styles')
      .selectAll()
      .where('participant_id', '=', participantId)
      .execute()
  )
}

export function addParticipantStyle(
  db: DB,
  data: PartyParticipantStyleInsert
): ResultAsync<PartyParticipantStyle, AppError> {
  return dbInsert(
    () =>
      db
        .insertInto('party_participant_styles')
        .values({
          participant_id: data.participant_id,
          style_id: data.style_id,
        })
        .returningAll()
        .executeTakeFirst(),
    'Failed to add participant style'
  )
}

export function removeParticipantStyle(
  db: DB,
  id: string
): ResultAsync<PartyParticipantStyle, AppError> {
  return dbDelete(
    () =>
      db
        .deleteFrom('party_participant_styles')
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst(),
    AppError.notFound('PartyParticipantStyle')
  )
}

// --- Party Cocktail Selections ---

export function listPartySelections(
  db: DB,
  sessionId: string
): ResultAsync<PartyCocktailSelection[], AppError> {
  return dbQueryMany(() =>
    db
      .selectFrom('party_cocktail_selections')
      .selectAll()
      .where('session_id', '=', sessionId)
      .orderBy('vote_count', 'desc')
      .execute()
  )
}

export function createPartySelection(
  db: DB,
  data: PartyCocktailSelectionInsert
): ResultAsync<PartyCocktailSelection, AppError> {
  return dbInsert(
    () =>
      db
        .insertInto('party_cocktail_selections')
        .values({
          session_id: data.session_id,
          cocktail_id: data.cocktail_id,
          vote_count: data.vote_count,
          is_selected: data.is_selected,
        })
        .returningAll()
        .executeTakeFirst(),
    'Failed to create party selection'
  )
}

export function updatePartySelection(
  db: DB,
  id: string,
  data: PartyCocktailSelectionUpdate
): ResultAsync<PartyCocktailSelection, AppError> {
  return dbUpdate(
    () =>
      db
        .updateTable('party_cocktail_selections')
        .set(cleanUpdate(data))
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst(),
    AppError.notFound('PartyCocktailSelection')
  )
}

export function deletePartySelection(
  db: DB,
  id: string
): ResultAsync<PartyCocktailSelection, AppError> {
  return dbDelete(
    () =>
      db
        .deleteFrom('party_cocktail_selections')
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst(),
    AppError.notFound('PartyCocktailSelection')
  )
}
