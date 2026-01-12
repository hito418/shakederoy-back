import type { Kyselify } from 'drizzle-orm/kysely'
import { cocktails } from './schemas/cocktails'
import { users } from './schemas/users'

export type Database = {
  cocktails: Kyselify<typeof cocktails>
  users: Kyselify<typeof users>
}
