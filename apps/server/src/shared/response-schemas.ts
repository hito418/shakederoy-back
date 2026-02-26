import { type } from 'arktype'
import { resolver } from 'hono-openapi'

export const timestamps = {
  created_at: 'string',
  updated_at: 'string',
} as const

export const timestampsWithSoftDelete = {
  ...timestamps,
  'deleted_at?': 'string | null',
} as const

const strip = { '+': 'delete' } as const

export const ErrorSchema = type({ ...strip, message: 'string' })

export const DeletedIdSchema = type({ ...strip, id: 'string' })

type ErrorResponseEntry = {
  description: string
  content: { 'application/json': { schema: object } }
}

const err = (description: string): ErrorResponseEntry => ({
  description,
  content: { 'application/json': { schema: resolver(ErrorSchema) } },
})

export const errorResponses: Record<401 | 404 | 409 | 500, ErrorResponseEntry> =
  {
    401: err('Unauthorized'),
    404: err('Not found'),
    409: err('Already exists'),
    500: err('Internal server error'),
  }

export { strip }

export function paginatedSchema<t>(itemType: type.Any<t>) {
  return type({
    '+': 'delete',
    data: itemType.array(),
    page: 'number',
    size: 'number',
    total: 'number',
    totalPages: 'number',
  })
}
