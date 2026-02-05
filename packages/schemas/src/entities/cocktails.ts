import type { Kyselify } from 'drizzle-orm/kysely'
import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import type { Insertable, Selectable, Updateable } from 'kysely'
import { bars } from './bars'
import { cocktailStatusEnum } from '../shared/enums'
import { glasses } from './glasses'
import { users } from './users'
import { deletedAt, timestamps } from '../shared/timestamps'

export const cocktails = pgTable('cocktails', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').unique().notNull(),
  slug: text('slug').unique().notNull(),
  description: text('description'),
  intensity: integer('intensity'),
  difficulty: integer('difficulty'),
  prepTime: integer('prep_time'),
  glassId: uuid('glass_id').references(() => glasses.id, {
    onDelete: 'set null',
  }),
  status: cocktailStatusEnum('status').notNull().default('draft'),
  createdById: uuid('created_by_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  variantOfId: uuid('variant_of_id'),
  barId: uuid('bar_id').references(() => bars.id, { onDelete: 'set null' }),
  ...timestamps,
  deletedAt,
})

export type Cocktail = Selectable<Kyselify<typeof cocktails>>
export type CocktailInsert = Insertable<Kyselify<typeof cocktails>>
export type CocktailUpdate = Updateable<Kyselify<typeof cocktails>>
