import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'
import { Selectable, Insertable, Updateable } from 'kysely'
import { Kyselify } from 'drizzle-orm/kysely'

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type Session = Selectable<Kyselify<typeof sessions>>
export type SessionInsert = Insertable<Kyselify<typeof sessions>>
export type SessionUpdate = Updateable<Kyselify<typeof sessions>>