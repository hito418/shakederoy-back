import { hash, verify } from '@node-rs/argon2'
import { sign } from 'hono/jwt'
import type { Kysely } from 'kysely'
import type { Database } from '@repo/schemas'
import { Payload } from 'src/shared/types/payload'

type DB = Kysely<Database>

export async function initAdmin(
  db: DB,
  email: string,
  password: string
) {
  const userList = await db
    .selectFrom('users')
    .select('id')
    .limit(1)
    .execute()

  if (userList.length > 0) {
    return { error: 'already_initialized' as const }
  }

  const hashedPassword = await hash(password)

  const user = await db
    .insertInto('users')
    .values({
      email,
      password: hashedPassword,
      role: 'admin',
    })
    .returningAll()
    .executeTakeFirst()

  if (!user) {
    return { error: 'failed' as const }
  }

  const { password: _, ...safeUser } = user
  return { user: safeUser }
}

export async function registerUser(
  db: DB,
  email: string,
  password: string
) {
  const hashedPassword = await hash(password)

  const user = await db
    .insertInto('users')
    .values({
      email,
      password: hashedPassword,
    })
    .returningAll()
    .executeTakeFirst()

  if (!user) {
    return { error: 'failed' as const }
  }

  const payload: Payload = {
    sub: { id: user.id },
    role: user.role,
  }

  return { payload }
}

export async function loginUser(
  db: DB,
  email: string,
  password: string
) {
  const user = await db
    .selectFrom('users')
    .selectAll()
    .where('email', '=', email)
    .executeTakeFirst()

  if (!user) {
    return { error: 'not_found' as const }
  }

  const isMatch = await verify(user.password, password)

  if (!isMatch) {
    return { error: 'wrong_password' as const }
  }

  const payload: Payload = {
    sub: { id: user.id },
    role: user.role,
  }

  return { payload }
}

export async function createToken(payload: Payload, secret: string) {
  return sign(payload, secret)
}
