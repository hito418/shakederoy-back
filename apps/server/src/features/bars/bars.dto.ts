import { type } from 'arktype'
import {
  paginatedSchema,
  strip,
  timestamps,
  timestampsWithSoftDelete,
} from 'src/shared/response-schemas'

const barStyleValues = "'classic'|'speakeasy'|'tiki'|'rooftop'|'dive'|'wine_bar'|'cocktail_lounge'|'sports_bar'|'brewpub'|'other'" as const

// --- Bar List Item ---

export const BarListItemSchema = type({
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
  'style?': `${barStyleValues} | null`,
  owner_username: 'string | null',
  'photo_url?': 'string | null',
  'photo_alt_text?': 'string | null',
  likes_count: 'number',
  'average_rating?': 'number | null',
  ...timestampsWithSoftDelete,
})

export const BarListPaginatedSchema = paginatedSchema(BarListItemSchema)

// --- Bar Detail ---

export const BarPhotoDetailSchema = type({
  ...strip,
  id: 'string',
  bar_id: 'string',
  url: 'string',
  'alt_text?': 'string | null',
  is_primary: 'boolean',
  ...timestamps,
})

export const BarSignatureCocktailDetailSchema = type({
  ...strip,
  id: 'string',
  bar_id: 'string',
  cocktail_id: 'string',
  'cocktail_name?': 'string | null',
  'price?': 'string | null',
  'currency?': 'string | null',
  is_available: 'boolean',
  ...timestamps,
})

export const BarDetailSchema = type({
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
  'style?': `${barStyleValues} | null`,
  owner_username: 'string | null',
  photos: BarPhotoDetailSchema.array(),
  likes_count: 'number',
  'average_rating?': 'number | null',
  signature_cocktails: BarSignatureCocktailDetailSchema.array(),
  'liked?': 'boolean | null',
  ...timestampsWithSoftDelete,
})

export const BarPhotoDetailListSchema = BarPhotoDetailSchema.array()
export const BarSignatureCocktailDetailListSchema = BarSignatureCocktailDetailSchema.array()

// --- Sub-resource schemas ---

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

export const BarPhotoListSchema = BarPhotoSchema.array()
export const BarSignatureCocktailListSchema = BarSignatureCocktailSchema.array()

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

// --- Query schemas ---

export const BarListQuerySchema = type({
  'page?': 'string.numeric.parse',
  'city?': 'string',
  'style?': barStyleValues,
  'search?': 'string',
  'owner_id?': 'string',
})
