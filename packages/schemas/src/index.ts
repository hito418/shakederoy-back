import type { Kyselify } from 'drizzle-orm/kysely'
import { cocktails } from './schemas/cocktails'
import { sessions } from './schemas/sessions'
import { users } from './schemas/users'

export type Database = {
  cocktails: Kyselify<typeof cocktails>
  sessions: Kyselify<typeof sessions>
  users: Kyselify<typeof users>
}
