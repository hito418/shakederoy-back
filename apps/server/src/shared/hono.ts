import { Database } from '@repo/schemas'
import { Kysely } from 'kysely'

declare module 'hono' {
  export interface ContextVariableMap {
    database: Kysely<Database>
  }
}
