import type { Kyselify } from 'drizzle-orm/kysely'
import { boolean, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import type { Insertable, Selectable, Updateable } from 'kysely'
import { alcoholTypes } from './alcohol-types'
import { ingredientCategoryEnum } from '../shared/enums'
import { deletedAt, timestamps } from '../shared/timestamps'

export const ingredients = pgTable('ingredients', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').unique().notNull(),
  description: text('description'),
  category: ingredientCategoryEnum('category').notNull(),
  isAlcoholic: boolean('is_alcoholic').notNull().default(false),
  alcoholTypeId: uuid('alcohol_type_id').references(() => alcoholTypes.id, {
    onDelete: 'set null',
  }),
  imageUrl: text('image_url'),
  ...timestamps,
  deletedAt,
})

export type Ingredient = Selectable<Kyselify<typeof ingredients>>
export type IngredientInsert = Insertable<Kyselify<typeof ingredients>>
export type IngredientUpdate = Updateable<Kyselify<typeof ingredients>>
