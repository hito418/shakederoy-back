import type { User } from '@repo/schemas/users'
import { getSignedCookie } from 'hono/cookie'
import { validateSession, type SessionPayload } from './session.service'
import { MiddlewareHandler } from 'hono'
import { env } from 'src/shared/env'

export const isAuth: (
  ...roleList: User['role'][]
) => MiddlewareHandler<{ Variables: { userPayload: SessionPayload } }> =
  function (...roleList) {
    return async (ctx, next) => {
      const sessionId = await getSignedCookie(
        ctx,
        env.COOKIE_SECRET,
        'session_id'
      )

      if (!sessionId) {
        return ctx.json({ message: 'Unauthorized' }, 401)
      }

      const db = ctx.get('database')
      const result = await validateSession(db, sessionId)

      if (result.isErr()) {
        return ctx.json({ message: result.error.message }, 401)
      }

      const payload = result.value

      if (roleList.length > 0 && !roleList.includes(payload.role)) {
        return ctx.json({ message: 'Unauthorized' }, 401)
      }

      ctx.set('userPayload', payload)

      await next()
    }
  }

export const optionalAuth: () => MiddlewareHandler<{
  Variables: { userPayload: SessionPayload | null }
}> = function () {
  return async (ctx, next) => {
    const sessionId = await getSignedCookie(
      ctx,
      env.COOKIE_SECRET,
      'session_id'
    )

    if (sessionId) {
      const db = ctx.get('database')
      const result = await validateSession(db, sessionId)

      if (result.isOk()) {
        ctx.set('userPayload', result.value)
        return next()
      }
    }

    ctx.set('userPayload', null)
    await next()
  }
}
