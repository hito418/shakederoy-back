import { pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { timestamps } from './utils/timestamps'

export const userRolesEnum = pgEnum('user_roles', ['admin', 'user'])

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: text('username').unique().notNull(),
  email: text('email').unique().notNull(),
  password: text('password').notNull(),
  role: userRolesEnum('role').notNull().default('user'),
  profilePic: text('profile_pic'),
  ...timestamps,
})

export type User = typeof users.$inferSelect
export type UserInsert = typeof users.$inferInsert
