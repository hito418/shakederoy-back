import { describe, it, expect } from 'vitest'
import { type } from 'arktype'
import { dto } from 'src/shared/response-schemas'

describe('dto', () => {
  const UserSchema = type({
    '+': 'delete',
    id: 'string',
    name: 'string',
  })

  it('returns Ok when data matches schema', () => {
    const result = dto(UserSchema, { id: '1', name: 'Alice' })

    expect(result.isOk()).toBe(true)
    expect(result._unsafeUnwrap()).toEqual({ id: '1', name: 'Alice' })
  })

  it('strips extra keys with + delete', () => {
    const result = dto(UserSchema, { id: '1', name: 'Alice', extra: true })

    expect(result.isOk()).toBe(true)
    expect(result._unsafeUnwrap()).toEqual({ id: '1', name: 'Alice' })
  })

  it('returns Err when data is missing required fields', () => {
    const result = dto(UserSchema, { id: '1' })

    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr().type).toBe('INTERNAL_ERROR')
    expect(result._unsafeUnwrapErr().message).toContain('Response schema mismatch')
  })

  it('returns Err when field has wrong type', () => {
    const result = dto(UserSchema, { id: 1, name: 'Alice' })

    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr().type).toBe('INTERNAL_ERROR')
  })
})
