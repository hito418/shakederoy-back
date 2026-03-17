import { type } from 'arktype'
import {
  dateToString,
  paginatedSchema,
  strip,
  timestamps,
} from 'src/shared/response-schemas'

export const SafeUserSchema = type({
  ...strip,
  id: 'string',
  username: 'string',
  email: 'string',
  role: "'admin' | 'user'",
  'profile_pic?': 'string | null',
  ...timestamps,
})

export const SafeUserPaginatedSchema = paginatedSchema(SafeUserSchema)

export const DeletedIdSchema = type({ ...strip, id: 'string' })

export const UserFavoriteSchema = type({
  ...strip,
  id: 'string',
  user_id: 'string',
  cocktail_id: 'string',
  ...timestamps,
})

export const UserFavoritePaginatedSchema = paginatedSchema(UserFavoriteSchema)

export const FavoriteToggleSchema = type({
  ...strip,
  action: "'added' | 'removed'",
  favorite: {
    '+': 'delete',
    id: 'string',
    user_id: 'string',
    cocktail_id: 'string',
    ...timestamps,
  },
})

export const CollectionSchema = type({
  ...strip,
  id: 'string',
  user_id: 'string',
  name: 'string',
  'description?': 'string | null',
  is_public: 'boolean',
  ...timestamps,
  'deleted_at?': dateToString.or(type('null')),
})

export const CollectionPaginatedSchema = paginatedSchema(CollectionSchema)

export const CollectionCocktailSchema = type({
  ...strip,
  id: 'string',
  collection_id: 'string',
  cocktail_id: 'string',
  ...timestamps,
})

export const CollectionCocktailPaginatedSchema = paginatedSchema(
  CollectionCocktailSchema
)
