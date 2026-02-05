import type { Kyselify } from 'drizzle-orm/kysely'

// Reference tables
import { alcoholTypes } from './entities/alcohol-types'
import { cocktailStyles } from './entities/cocktail-styles'
import { glasses } from './entities/glasses'

// Core tables
import { users } from './entities/users'
import { sessions } from './entities/sessions'
import { ingredients } from './entities/ingredients'
import { bars } from './entities/bars'
import { cocktails } from './entities/cocktails'

// Cocktail relations
import { cocktailIngredients } from './entities/cocktail-ingredients'
import { cocktailStylesJunction } from './entities/cocktail-styles-junction'
import { cocktailPhotos } from './entities/cocktail-photos'
import { preparationSteps } from './entities/preparation-steps'
import { cocktailVotes } from './entities/votes'

// User features
import { userFavorites } from './entities/favorites'
import { collections, collectionCocktails } from './entities/collections'

// Analytics
import { cocktailViews } from './entities/cocktail-views'
import { cocktailOfMonth } from './entities/cocktail-of-month'

// Bar features
import { barPhotos } from './entities/bar-photos'
import { barSignatureCocktails } from './entities/bar-signature-cocktails'
import { barLikes } from './entities/bar-likes'
import { barReviews } from './entities/bar-reviews'

// Party mode
import { partySessions } from './entities/party-sessions'
import { partyParticipants } from './entities/party-participants'
import { partyParticipantStyles } from './entities/party-participant-styles'
import { partyCocktailSelections } from './entities/party-cocktail-selections'

export type Database = {
  // Reference tables
  glasses: Kyselify<typeof glasses>
  alcohol_types: Kyselify<typeof alcoholTypes>
  cocktail_styles: Kyselify<typeof cocktailStyles>

  // Core tables
  users: Kyselify<typeof users>
  sessions: Kyselify<typeof sessions>
  ingredients: Kyselify<typeof ingredients>
  bars: Kyselify<typeof bars>
  cocktails: Kyselify<typeof cocktails>

  // Cocktail relations
  cocktail_ingredients: Kyselify<typeof cocktailIngredients>
  cocktail_styles_junction: Kyselify<typeof cocktailStylesJunction>
  cocktail_photos: Kyselify<typeof cocktailPhotos>
  preparation_steps: Kyselify<typeof preparationSteps>
  cocktail_votes: Kyselify<typeof cocktailVotes>

  // User features
  user_favorites: Kyselify<typeof userFavorites>
  collections: Kyselify<typeof collections>
  collection_cocktails: Kyselify<typeof collectionCocktails>

  // Analytics
  cocktail_views: Kyselify<typeof cocktailViews>
  cocktail_of_month: Kyselify<typeof cocktailOfMonth>

  // Bar features
  bar_photos: Kyselify<typeof barPhotos>
  bar_signature_cocktails: Kyselify<typeof barSignatureCocktails>
  bar_likes: Kyselify<typeof barLikes>
  bar_reviews: Kyselify<typeof barReviews>

  // Party mode
  party_sessions: Kyselify<typeof partySessions>
  party_participants: Kyselify<typeof partyParticipants>
  party_participant_styles: Kyselify<typeof partyParticipantStyles>
  party_cocktail_selections: Kyselify<typeof partyCocktailSelections>
}
