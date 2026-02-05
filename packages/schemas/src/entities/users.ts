import type { Kyselify } from 'drizzle-orm/kysely'
import { boolean, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import type { Insertable, Selectable, Updateable } from 'kysely'
import { deletedAt, timestamps } from '../shared/timestamps'
import { userRolesEnum } from '../shared/enums'

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: text('username').unique().notNull(),
  email: text('email').unique().notNull(),
  password: text('password').notNull(),
  role: userRolesEnum('role').notNull().default('user'),
  profilePic: text('profile_pic'),
  isBarOwner: boolean('is_bar_owner').notNull().default(false),
  ...timestamps,
  deletedAt,
})

export type User = Selectable<Kyselify<typeof users>>
export type UserInsert = Insertable<Kyselify<typeof users>>
export type UserUpdate = Updateable<Kyselify<typeof users>>
