import { type } from 'arktype'
import { paginatedSchema, strip, timestamps, timestampsWithSoftDelete } from 'src/shared/response-schemas'

export const BarSchema = type({
  ...strip,
  id: 'string',
  owner_id: 'string',
  name: 'string',
  slug: 'string',
  'description?': 'string | null',
  'address?': 'string | null',
  'city?': 'string | null',
  'postal_code?': 'string | null',
  'country?': 'string | null',
  'latitude?': 'number | null',
  'longitude?': 'number | null',
  'phone?': 'string | null',
  'website?': 'string | null',
  'style?': "'classic'|'speakeasy'|'tiki'|'rooftop'|'dive'|'wine_bar'|'cocktail_lounge'|'sports_bar'|'brewpub'|'other' | null",
  ...timestampsWithSoftDelete,
})

export const BarPaginatedSchema = paginatedSchema(BarSchema)

export const BarPhotoSchema = type({
  ...strip,
  id: 'string',
  bar_id: 'string',
  url: 'string',
  'alt_text?': 'string | null',
  is_primary: 'boolean',
  ...timestamps,
})

export const BarSignatureCocktailSchema = type({
  ...strip,
  id: 'string',
  bar_id: 'string',
  cocktail_id: 'string',
  'price?': 'string | null',
  'currency?': 'string | null',
  is_available: 'boolean',
  ...timestamps,
})

export const BarLikeSchema = type({
  ...strip,
  id: 'string',
  bar_id: 'string',
  user_id: 'string',
  ...timestamps,
})

export const BarLikePaginatedSchema = paginatedSchema(BarLikeSchema)

export const BarLikeToggleSchema = type({ ...strip, liked: 'boolean' })

export const BarReviewSchema = type({
  ...strip,
  id: 'string',
  bar_id: 'string',
  user_id: 'string',
  rating: 'number',
  'comment?': 'string | null',
  ...timestampsWithSoftDelete,
})

export const BarReviewPaginatedSchema = paginatedSchema(BarReviewSchema)
