import type { User } from '@repo/schemas/users'
import type { JWTPayload } from 'hono/utils/jwt/types'

export interface Payload extends JWTPayload {
  sub: {
    id: string
    username: string
  }
  role: User['role']
}
