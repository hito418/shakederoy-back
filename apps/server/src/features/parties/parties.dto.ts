import { type } from 'arktype'
import { paginatedSchema, strip, timestamps } from 'src/shared/response-schemas'

export const PartySessionSchema = type({
  ...strip,
  id: 'string',
  code: 'string',
  host_id: 'string',
  'name?': 'string | null',
  mode: "'voting' | 'host_picks' | 'random'",
  is_active: 'boolean',
  'expires_at?': 'string | null',
  ...timestamps,
})

export const PartySessionPaginatedSchema = paginatedSchema(PartySessionSchema)

export const PartyParticipantSchema = type({
  ...strip,
  id: 'string',
  session_id: 'string',
  'user_id?': 'string | null',
  'guest_name?': 'string | null',
  'prefers_alcoholic?': 'boolean | null',
  'max_intensity?': 'number | null',
  ...timestamps,
})

export const PartyParticipantStyleSchema = type({
  ...strip,
  id: 'string',
  participant_id: 'string',
  style_id: 'string',
  ...timestamps,
})

export const PartyParticipantListSchema = PartyParticipantSchema.array()
export const PartyParticipantStyleListSchema = PartyParticipantStyleSchema.array()

export const PartyCocktailSelectionSchema = type({
  ...strip,
  id: 'string',
  session_id: 'string',
  cocktail_id: 'string',
  vote_count: 'number',
  is_selected: 'number',
  ...timestamps,
})

export const PartyCocktailSelectionListSchema = PartyCocktailSelectionSchema.array()
