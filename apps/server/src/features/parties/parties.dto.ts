import { type } from 'arktype'
import { dateToString, paginatedSchema, strip, timestamps } from 'src/shared/response-schemas'

export const PartySessionSchema = type({
  ...strip,
  id: 'string',
  code: 'string',
  host_id: 'string',
  'name?': 'string | null',
  mode: "'voting' | 'host_picks' | 'random'",
  is_active: 'boolean',
  'expires_at?': dateToString.or(type('null')),
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

// --- Soirée Mode ---

export const ScoredCocktailSchema = type({
  ...strip,
  cocktail_id: 'string',
  name: 'string',
  'description?': 'string | null',
  is_alcoholic: 'boolean',
  'intensity?': 'number | null',
  'difficulty?': 'string | null',
  'prep_time?': 'number | null',
  score: 'number',
})

export const ScoredCocktailListSchema = ScoredCocktailSchema.array()

const IngredientQuantitySchema = type({
  ...strip,
  cocktail: 'string',
  'quantity?': 'string | null',
  'unit?': 'string | null',
})

export const AggregatedIngredientSchema = type({
  ...strip,
  ingredient_id: 'string',
  name: 'string',
  category: 'string',
  is_alcoholic: 'boolean',
  cocktail_count: 'number',
  cocktails: 'string[]',
  quantities: IngredientQuantitySchema.array(),
})

export const AggregatedIngredientListSchema = AggregatedIngredientSchema.array()

const BarmanIngredientSchema = type({
  ...strip,
  name: 'string',
  'quantity?': 'string | null',
  'unit?': 'string | null',
  'notes?': 'string | null',
})

const BarmanStepSchema = type({
  ...strip,
  step_number: 'number',
  instruction: 'string',
})

const BarmanCocktailSchema = type({
  ...strip,
  id: 'string',
  name: 'string',
  'description?': 'string | null',
  'difficulty?': 'string | null',
  'prep_time?': 'number | null',
  ingredients: BarmanIngredientSchema.array(),
  steps: BarmanStepSchema.array(),
})

const ShoppingListItemSchema = type({
  ...strip,
  ingredient_id: 'string',
  name: 'string',
  category: 'string',
  is_alcoholic: 'boolean',
  cocktail_count: 'number',
  cocktails: 'string[]',
})

export const BarmanViewSchema = type({
  ...strip,
  cocktails: BarmanCocktailSchema.array(),
  shopping_list: ShoppingListItemSchema.array(),
})
