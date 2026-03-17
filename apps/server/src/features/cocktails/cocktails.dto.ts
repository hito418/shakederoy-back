import { type } from 'arktype'
import { paginatedSchema, strip, timestamps, timestampsWithSoftDelete } from 'src/shared/response-schemas'

export const CocktailSchema = type({
  ...strip,
  id: 'string',
  name: 'string',
  slug: 'string',
  'description?': 'string | null',
  is_alcoholic: 'boolean',
  'main_alcohol_id?': 'string | null',
  'intensity?': 'number | null',
  'difficulty?': "'easy' | 'medium' | 'hard' | null",
  'prep_time?': 'number | null',
  'glass_id?': 'string | null',
  status: "'draft' | 'pending' | 'approved' | 'rejected'",
  'created_by_id?': 'string | null',
  'variant_of_id?': 'string | null',
  'bar_id?': 'string | null',
  ...timestampsWithSoftDelete,
})

export const CocktailPaginatedSchema = paginatedSchema(CocktailSchema)

export const CocktailStyleSchema = type({
  ...strip,
  id: 'string',
  name: 'string',
  'description?': 'string | null',
  ...timestamps,
})

export const CocktailStylePaginatedSchema = paginatedSchema(CocktailStyleSchema)

export const GlassSchema = type({
  ...strip,
  id: 'string',
  name: 'string',
  'description?': 'string | null',
  'capacity?': 'number | null',
  'image_url?': 'string | null',
  ...timestamps,
})

export const GlassPaginatedSchema = paginatedSchema(GlassSchema)

export const AlcoholTypeSchema = type({
  ...strip,
  id: 'string',
  name: 'string',
  'description?': 'string | null',
  'abv_range_min?': 'string | null',
  'abv_range_max?': 'string | null',
  ...timestamps,
})

export const AlcoholTypePaginatedSchema = paginatedSchema(AlcoholTypeSchema)

export const IngredientSchema = type({
  ...strip,
  id: 'string',
  name: 'string',
  'description?': 'string | null',
  category: "'spirit'|'liqueur'|'wine'|'beer'|'mixer'|'juice'|'syrup'|'bitter'|'garnish'|'dairy'|'other'",
  is_alcoholic: 'boolean',
  'alcohol_type_id?': 'string | null',
  'image_url?': 'string | null',
  ...timestampsWithSoftDelete,
})

export const IngredientPaginatedSchema = paginatedSchema(IngredientSchema)

export const CocktailIngredientSchema = type({
  ...strip,
  id: 'string',
  cocktail_id: 'string',
  ingredient_id: 'string',
  'quantity?': 'string | null',
  'unit?': 'string | null',
  'notes?': 'string | null',
  ...timestamps,
})

export const CocktailPhotoSchema = type({
  ...strip,
  id: 'string',
  cocktail_id: 'string',
  url: 'string',
  'alt_text?': 'string | null',
  is_primary: 'boolean',
  ...timestamps,
})

export const PreparationStepSchema = type({
  ...strip,
  id: 'string',
  cocktail_id: 'string',
  step_number: 'number',
  instruction: 'string',
  'image_url?': 'string | null',
  ...timestamps,
})

export const CocktailStyleJunctionSchema = type({
  ...strip,
  id: 'string',
  cocktail_id: 'string',
  style_id: 'string',
  ...timestamps,
})

export const CocktailFullSchema = type({
  ...strip,
  cocktail: CocktailSchema,
  ingredients: CocktailIngredientSchema.array(),
  steps: PreparationStepSchema.array(),
  'style?': CocktailStyleJunctionSchema.or('null'),
})

export const CocktailIngredientListSchema = CocktailIngredientSchema.array()
export const CocktailPhotoListSchema = CocktailPhotoSchema.array()
export const PreparationStepListSchema = PreparationStepSchema.array()
export const CocktailStyleJunctionListSchema = CocktailStyleJunctionSchema.array()

export const CocktailVoteSchema = type({
  ...strip,
  id: 'string',
  cocktail_id: 'string',
  user_id: 'string',
  vote_type: "'upvote' | 'downvote'",
  ...timestamps,
})

export const CocktailVotePaginatedSchema = paginatedSchema(CocktailVoteSchema)

export const CocktailVoteSummarySchema = type({
  ...strip,
  cocktail_id: 'string',
  upvotes: 'number',
  downvotes: 'number',
  score: 'number',
  total: 'number',
  'user_vote?': "'upvote' | 'downvote' | null",
})

export const CocktailViewSchema = type({
  ...strip,
  id: 'string',
  cocktail_id: 'string',
  'user_id?': 'string | null',
  'ip_address?': 'string | null',
  'user_agent?': 'string | null',
  'hour_of_day?': 'number | null',
  'day_of_week?': 'number | null',
  ...timestamps,
})

export const CocktailViewPaginatedSchema = paginatedSchema(CocktailViewSchema)

export const CocktailOfMonthSchema = type({
  ...strip,
  id: 'string',
  cocktail_id: 'string',
  year: 'number',
  month: 'number',
  rank: 'number',
  ...timestamps,
})

export const CocktailOfMonthListSchema = CocktailOfMonthSchema.array()
