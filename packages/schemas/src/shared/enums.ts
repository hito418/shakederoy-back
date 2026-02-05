import { pgEnum } from 'drizzle-orm/pg-core'

export const userRolesEnum = pgEnum('user_roles', ['admin', 'user'])

export const cocktailStatusEnum = pgEnum('cocktail_status', [
  'draft',
  'pending',
  'approved',
  'rejected',
])

export const voteTypeEnum = pgEnum('vote_type', ['upvote', 'downvote'])

export const barStyleEnum = pgEnum('bar_style', [
  'classic',
  'speakeasy',
  'tiki',
  'rooftop',
  'dive',
  'wine_bar',
  'cocktail_lounge',
  'sports_bar',
  'brewpub',
  'other',
])

export const partyModeEnum = pgEnum('party_mode', [
  'voting',
  'host_picks',
  'random',
])

export const ingredientCategoryEnum = pgEnum('ingredient_category', [
  'spirit',
  'liqueur',
  'wine',
  'beer',
  'mixer',
  'juice',
  'syrup',
  'bitter',
  'garnish',
  'dairy',
  'other',
])
