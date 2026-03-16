import { db } from './shared/db'
import { DbService } from './shared/db-service'
import { AuthService } from './features/auth/auth.service'
import { SessionService } from './features/auth/session.service'
import { CocktailsService } from './features/cocktails/cocktails.service'
import { StylesService } from './features/cocktails/styles.service'
import { ExtrasService } from './features/cocktails/extras.service'
import { GlassesService } from './features/cocktails/glasses.service'
import { AlcoholTypesService } from './features/cocktails/alcohol-types.service'
import { IngredientsService } from './features/cocktails/ingredients.service'
import { AnalyticsService } from './features/cocktails/analytics.service'
import { UsersService } from './features/users/users.service'
import { FavoritesService } from './features/users/favorites.service'
import { CollectionsService } from './features/users/collections.service'
import { BarsService } from './features/bars/bars.service'
import { ReviewsService } from './features/bars/reviews.service'
import { PartiesService } from './features/parties/parties.service'

const dbService = new DbService(db)

export const sessionService = new SessionService(dbService)
export const authService = new AuthService(dbService)
export const cocktailsService = new CocktailsService(dbService)
export const stylesService = new StylesService(dbService)
export const extrasService = new ExtrasService(dbService)
export const glassesService = new GlassesService(dbService)
export const alcoholTypesService = new AlcoholTypesService(dbService)
export const ingredientsService = new IngredientsService(dbService)
export const analyticsService = new AnalyticsService(dbService)
export const usersService = new UsersService(dbService)
export const favoritesService = new FavoritesService(dbService)
export const collectionsService = new CollectionsService(dbService)
export const barsService = new BarsService(dbService)
export const reviewsService = new ReviewsService(dbService)
export const partiesService = new PartiesService(dbService)
