import type { Kyselify } from 'drizzle-orm/kysely'
import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import type { Insertable, Selectable, Updateable } from 'kysely'
import { cocktails } from './cocktails'
import { timestamps } from '../shared/timestamps'

export const preparationSteps = pgTable('preparation_steps', {
  id: uuid('id').defaultRandom().primaryKey(),
  cocktailId: uuid('cocktail_id')
    .notNull()
    .references(() => cocktails.id, { onDelete: 'cascade' }),
  stepNumber: integer('step_number').notNull(),
  instruction: text('instruction').notNull(),
  imageUrl: text('image_url'),
  ...timestamps,
})

export type PreparationStep = Selectable<Kyselify<typeof preparationSteps>>
export type PreparationStepInsert = Insertable<
  Kyselify<typeof preparationSteps>
>
export type PreparationStepUpdate = Updateable<
  Kyselify<typeof preparationSteps>
>
