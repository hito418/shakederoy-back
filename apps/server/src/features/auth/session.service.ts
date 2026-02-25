import { randomBytes } from 'node:crypto'
import type { Kysely } from 'kysely'
import type { Database } from '@repo/schemas'
import type { User } from '@repo/schemas/users'
import { ResultAsync, err, ok } from 'neverthrow'
import { Errors, type AppError } from 'src/shared/errors'
import { fromPromise, dbQueryFirst, dbInsert } from 'src/shared/db-helpers'

type DB = Kysely<Database>

export interface SessionPayload {
  sub: { id: string }
  username: string
  role: User['role']
}

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function generateSessionId(): string {
  return randomBytes(32).toString('hex')
}

export function createSession(
  db: DB,
  userId: string,
  username: string,
  role: User['role']
): ResultAsync<{ sessionId: string; payload: SessionPayload }, AppError> {
  const sessionId = generateSessionId()
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)

  return dbInsert(
    () =>
      db
        .insertInto('sessions')
        .values({
          id: sessionId,
          user_id: userId,
          expires_at: expiresAt,
        })
        .returning(['id', 'user_id', 'expires_at'])
        .executeTakeFirst(),
    'Failed to create session'
  ).map(() => ({
    sessionId,
    payload: {
      sub: { id: userId },
      username,
      role,
    },
  }))
}

export function validateSession(
  db: DB,
  sessionId: string
): ResultAsync<SessionPayload, AppError> {
  return dbQueryFirst(
    () =>
      db
        .selectFrom('sessions')
        .innerJoin('users', 'users.id', 'sessions.user_id')
        .select(['sessions.user_id', 'sessions.expires_at', 'users.username', 'users.role'])
        .where('sessions.id', '=', sessionId)
        .executeTakeFirst(),
    Errors.unauthorized('Invalid session')
  ).andThen((session) => {
    if (new Date(session.expires_at).valueOf() < Date.now()) {
      return deleteSession(db, sessionId).andThen(() =>
        err(Errors.unauthorized('Session expired'))
      )
    }
    return ok({
      sub: { id: session.user_id },
      username: session.username,
      role: session.role,
    })
  })
}

export function deleteSession(
  db: DB,
  sessionId: string
): ResultAsync<void, AppError> {
  return fromPromise(
    db.deleteFrom('sessions').where('id', '=', sessionId).execute(),
    () => Errors.databaseError('Failed to delete session')
  ).map(() => undefined)
}

export function deleteAllUserSessions(
  db: DB,
  userId: string
): ResultAsync<void, AppError> {
  return fromPromise(
    db.deleteFrom('sessions').where('user_id', '=', userId).execute(),
    () => Errors.databaseError('Failed to delete user sessions')
  ).map(() => undefined)
}

export function cleanupExpiredSessions(db: DB): ResultAsync<number, AppError> {
  return fromPromise(
    db
      .deleteFrom('sessions')
      .where('expires_at', '<', new Date())
      .executeTakeFirst(),
    () => Errors.databaseError('Failed to cleanup expired sessions')
  ).map((result) => Number(result.numDeletedRows))
}
