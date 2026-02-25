import { type } from 'arktype'
import { strip, timestamps } from 'src/shared/response-schemas'

export const SafeUserSchema = type({
  ...strip,
  id: 'string',
  username: 'string',
  email: 'string',
  role: "'admin' | 'user'",
  'profile_pic?': 'string | null',
  'is_bar_owner?': 'boolean',
  ...timestamps,
  'deleted_at?': 'string | null',
})

export const SessionPayloadSchema = type({
  ...strip,
  sub: { '+': 'delete', id: 'string' },
  username: 'string',
  role: "'admin' | 'user'",
})
