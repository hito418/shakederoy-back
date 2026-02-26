import { type } from 'arktype'
import {
  paginatedSchema,
  strip,
  camelTimestamps,
  camelTimestampsWithSoftDelete,
} from 'src/shared/response-schemas'

const barStyleValues = "'classic'|'speakeasy'|'tiki'|'rooftop'|'dive'|'wine_bar'|'cocktail_lounge'|'sports_bar'|'brewpub'|'other'" as const

// --- Bar List Item ---

export const BarListItemSchema = type({
  ...strip,
  id: 'string',
  ownerId: 'string',
  name: 'string',
  slug: 'string',
  'description?': 'string | null',
  'address?': 'string | null',
  'city?': 'string | null',
  'postalCode?': 'string | null',
  'country?': 'string | null',
  'latitude?': 'number | null',
  'longitude?': 'number | null',
  'phone?': 'string | null',
  'website?': 'string | null',
  'style?': `${barStyleValues} | null`,
  ownerUsername: 'string | null',
  'photoUrl?': 'string | null',
  'photoAltText?': 'string | null',
  likesCount: 'number',
  'averageRating?': 'number | null',
  ...camelTimestampsWithSoftDelete,
})

export const BarListPaginatedSchema = paginatedSchema(BarListItemSchema)

// --- Bar Detail ---

export const BarPhotoDetailSchema = type({
  ...strip,
  id: 'string',
  barId: 'string',
  url: 'string',
  'altText?': 'string | null',
  isPrimary: 'boolean',
  ...camelTimestamps,
})

export const BarSignatureCocktailDetailSchema = type({
  ...strip,
  id: 'string',
  barId: 'string',
  cocktailId: 'string',
  'cocktailName?': 'string | null',
  'price?': 'string | null',
  'currency?': 'string | null',
  isAvailable: 'boolean',
  ...camelTimestamps,
})

export const BarDetailSchema = type({
  ...strip,
  id: 'string',
  ownerId: 'string',
  name: 'string',
  slug: 'string',
  'description?': 'string | null',
  'address?': 'string | null',
  'city?': 'string | null',
  'postalCode?': 'string | null',
  'country?': 'string | null',
  'latitude?': 'number | null',
  'longitude?': 'number | null',
  'phone?': 'string | null',
  'website?': 'string | null',
  'style?': `${barStyleValues} | null`,
  ownerUsername: 'string | null',
  photos: BarPhotoDetailSchema.array(),
  likesCount: 'number',
  'averageRating?': 'number | null',
  signatureCocktails: BarSignatureCocktailDetailSchema.array(),
  'liked?': 'boolean | null',
  ...camelTimestampsWithSoftDelete,
})

// --- Sub-resource schemas ---

export const BarPhotoSchema = type({
  ...strip,
  id: 'string',
  barId: 'string',
  url: 'string',
  'altText?': 'string | null',
  isPrimary: 'boolean',
  ...camelTimestamps,
})

export const BarSignatureCocktailSchema = type({
  ...strip,
  id: 'string',
  barId: 'string',
  cocktailId: 'string',
  'price?': 'string | null',
  'currency?': 'string | null',
  isAvailable: 'boolean',
  ...camelTimestamps,
})

export const BarLikeSchema = type({
  ...strip,
  id: 'string',
  barId: 'string',
  userId: 'string',
  ...camelTimestamps,
})

export const BarLikePaginatedSchema = paginatedSchema(BarLikeSchema)

export const BarLikeToggleSchema = type({ ...strip, liked: 'boolean' })

export const BarReviewSchema = type({
  ...strip,
  id: 'string',
  barId: 'string',
  userId: 'string',
  rating: 'number',
  'comment?': 'string | null',
  ...camelTimestampsWithSoftDelete,
})

export const BarReviewPaginatedSchema = paginatedSchema(BarReviewSchema)

// --- Query schemas ---

export const BarListQuerySchema = type({
  'page?': 'string.numeric.parse',
  'city?': 'string',
  'style?': barStyleValues,
  'search?': 'string',
})
