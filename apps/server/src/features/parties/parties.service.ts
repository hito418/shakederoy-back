import type {
  PartySession,
  PartySessionInsert,
  PartySessionUpdate,
} from '@repo/schemas/party-sessions'
import type {
  PartyParticipant,
  PartyParticipantInsert,
  PartyParticipantUpdate,
} from '@repo/schemas/party-participants'
import type {
  PartyParticipantStyle,
  PartyParticipantStyleInsert,
} from '@repo/schemas/party-participant-styles'
import type {
  PartyCocktailSelection,
  PartyCocktailSelectionInsert,
  PartyCocktailSelectionUpdate,
} from '@repo/schemas/party-cocktail-selections'
import type { ResultAsync } from 'neverthrow'
import { DbService, type PaginatedResult } from 'src/shared/db-service'
import { AppError } from 'src/shared/errors'

export class PartiesService {
  constructor(private db: DbService) {}

  // --- Party Sessions ---

  listSessions(
    page: number,
    pageSize: number
  ): ResultAsync<PaginatedResult<PartySession>, AppError> {
    return this.db.queryPaginated(
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

  getSessionById(id: string): ResultAsync<PartySession, AppError> {
    return this.db.queryFirst(
      (db) =>
        db
          .selectFrom('party_sessions')
          .selectAll()
          .where('id', '=', id)
          .executeTakeFirst(),
      AppError.notFound('PartySession')
    )
  }

  getSessionByCode(code: string): ResultAsync<PartySession, AppError> {
    return this.db.queryFirst(
      (db) =>
        db
          .selectFrom('party_sessions')
          .selectAll()
          .where('code', '=', code)
          .executeTakeFirst(),
      AppError.notFound('PartySession')
    )
  }

  createSession(
    data: PartySessionInsert
  ): ResultAsync<PartySession, AppError> {
    return this.db.insert(
      (db) =>
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

  updateSession(
    id: string,
    hostId: string,
    data: PartySessionUpdate
  ): ResultAsync<PartySession, AppError> {
    return this.db.update(
      (db) =>
        db
          .updateTable('party_sessions')
          .set(DbService.cleanUpdate(data))
          .where('id', '=', id)
          .where('host_id', '=', hostId)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('PartySession')
    )
  }

  deleteSession(
    id: string,
    hostId: string
  ): ResultAsync<PartySession, AppError> {
    return this.db.delete(
      (db) =>
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

  listParticipants(
    sessionId: string
  ): ResultAsync<PartyParticipant[], AppError> {
    return this.db.queryMany((db) =>
      db
        .selectFrom('party_participants')
        .selectAll()
        .where('session_id', '=', sessionId)
        .orderBy('created_at', 'asc')
        .execute()
    )
  }

  createParticipant(
    data: PartyParticipantInsert
  ): ResultAsync<PartyParticipant, AppError> {
    return this.db.insert(
      (db) =>
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

  updateParticipant(
    id: string,
    data: PartyParticipantUpdate
  ): ResultAsync<PartyParticipant, AppError> {
    return this.db.update(
      (db) =>
        db
          .updateTable('party_participants')
          .set(DbService.cleanUpdate(data))
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('PartyParticipant')
    )
  }

  deleteParticipant(
    id: string
  ): ResultAsync<PartyParticipant, AppError> {
    return this.db.delete(
      (db) =>
        db
          .deleteFrom('party_participants')
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('PartyParticipant')
    )
  }

  // --- Party Participant Styles ---

  listParticipantStyles(
    participantId: string
  ): ResultAsync<PartyParticipantStyle[], AppError> {
    return this.db.queryMany((db) =>
      db
        .selectFrom('party_participant_styles')
        .selectAll()
        .where('participant_id', '=', participantId)
        .execute()
    )
  }

  addParticipantStyle(
    data: PartyParticipantStyleInsert
  ): ResultAsync<PartyParticipantStyle, AppError> {
    return this.db.insert(
      (db) =>
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

  removeParticipantStyle(
    id: string
  ): ResultAsync<PartyParticipantStyle, AppError> {
    return this.db.delete(
      (db) =>
        db
          .deleteFrom('party_participant_styles')
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('PartyParticipantStyle')
    )
  }

  // --- Party Cocktail Selections ---

  listSelections(
    sessionId: string
  ): ResultAsync<PartyCocktailSelection[], AppError> {
    return this.db.queryMany((db) =>
      db
        .selectFrom('party_cocktail_selections')
        .selectAll()
        .where('session_id', '=', sessionId)
        .orderBy('vote_count', 'desc')
        .execute()
    )
  }

  createSelection(
    data: PartyCocktailSelectionInsert
  ): ResultAsync<PartyCocktailSelection, AppError> {
    return this.db.insert(
      (db) =>
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

  updateSelection(
    id: string,
    data: PartyCocktailSelectionUpdate
  ): ResultAsync<PartyCocktailSelection, AppError> {
    return this.db.update(
      (db) =>
        db
          .updateTable('party_cocktail_selections')
          .set(DbService.cleanUpdate(data))
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('PartyCocktailSelection')
    )
  }

  deleteSelection(
    id: string
  ): ResultAsync<PartyCocktailSelection, AppError> {
    return this.db.delete(
      (db) =>
        db
          .deleteFrom('party_cocktail_selections')
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('PartyCocktailSelection')
    )
  }
}
