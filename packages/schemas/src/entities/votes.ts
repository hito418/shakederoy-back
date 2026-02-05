import type { Kyselify } from 'drizzle-orm/kysely'
import { pgTable, uuid } from 'drizzle-orm/pg-core'
import type { Insertable, Selectable, Updateable } from 'kysely'
import { cocktails } from './cocktails'
import { voteTypeEnum } from '../shared/enums'
import { users } from './users'
import { timestamps } from '../shared/timestamps'

export const cocktailVotes = pgTable('cocktail_votes', {
  id: uuid('id').defaultRandom().primaryKey(),
  cocktailId: uuid('cocktail_id')
    .notNull()
    .references(() => cocktails.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  voteType: voteTypeEnum('vote_type').notNull(),
  ...timestamps,
})

export type CocktailVote = Selectable<Kyselify<typeof cocktailVotes>>
export type CocktailVoteInsert = Insertable<Kyselify<typeof cocktailVotes>>
export type CocktailVoteUpdate = Updateable<Kyselify<typeof cocktailVotes>>
