import type { User } from '@repo/schemas/users'
import { env } from 'hono/adapter'
import { getSignedCookie } from 'hono/cookie'
import { type HonoVarMiddleware } from 'src/shared/hono'
import { validateSession, type SessionPayload } from './session.service'

export const isAuth: (
  ...roleList: (User["role"])[]
) => HonoVarMiddleware<{ userPayload: SessionPayload }> = function (...roleList) {
  return async (ctx, next) => {
    const { COOKIE_SECRET } = env(ctx)
    const sessionId = await getSignedCookie(ctx, COOKIE_SECRET, 'session_id')

    if (!sessionId) {
      return ctx.json({ message: 'Unauthorized' }, 401)
    }

    const db = ctx.get('database')
    const result = await validateSession(db, sessionId)

    if (result.isErr()) {
      return ctx.json({ message: result.error.message }, 401)
    }

    const payload = result.value

    if (
      roleList.length > 0 &&
      !roleList.includes(payload.role)
    ) {
      return ctx.json({ message: 'Unauthorized' }, 401)
    }

    ctx.set('userPayload', payload)

    await next()
  }
}
