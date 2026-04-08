import * as Sentry from '@sentry/node'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import './config/arktype'
import authRoute from './routes/auth'
import barsRoute from './routes/bars'
import cocktailsRoute from './routes/cocktails'
import partiesRoute from './routes/parties'
import usersRoute from './routes/users'
import { env } from './shared/env'
import './shared/hono'
import { provide } from './shared/provide'
import { sessionService } from './container'

export const app = new Hono()
  .use(provide('sessionService', sessionService))
  .use(
    cors({
      origin: env.CORS_ORIGIN.split(','),
      credentials: true,
    })
  )
  .route('/', authRoute)
  .route('/', usersRoute)
  .route('/', cocktailsRoute)
  .route('/', barsRoute)
  .route('/', partiesRoute)
  .get('/healthcheck', (ctx) => {
    return ctx.json({ status: 'ok' }, 200)
  })
  .get('/debug-sentry', () => {
    throw new Error('Sentry test error')
  })
  .onError((err, ctx) => {
    Sentry.captureException(err)
    return ctx.json({ error: 'Internal Server Error' }, 500)
  })
