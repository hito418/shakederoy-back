import type { Kyselify } from 'drizzle-orm/kysely'
import { cocktails } from './schemas/cocktails'
import { favorites } from './schemas/favorites'
import { users } from './schemas/users'

export type Database = {
  cocktails: Kyselify<typeof cocktails>
  favorites: Kyselify<typeof favorites>
  users: Kyselify<typeof users>
}
