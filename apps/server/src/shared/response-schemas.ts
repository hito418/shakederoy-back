import { type } from 'arktype'
import { resolver } from 'hono-openapi'
import { Result, ok, err } from 'neverthrow'
import { AppError } from 'src/shared/errors'

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

export const errResponse = (description: string): ErrorResponseEntry => ({
  description,
  content: { 'application/json': { schema: resolver(ErrorSchema) } },
})

export const errorResponses: Record<401 | 404 | 409 | 500, ErrorResponseEntry> =
  {
    401: errResponse('Unauthorized'),
    404: errResponse('Not found'),
    409: errResponse('Already exists'),
    500: errResponse('Internal server error'),
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

export function dto<T extends type.Any>(
  schema: T,
  data: unknown
): Result<T['infer'], AppError> {
  const out = schema(data)
  if (out instanceof type.errors) {
    return err(
      AppError.internalError(`Response schema mismatch: ${out.summary}`)
    )
  }
  return ok(out)
}
