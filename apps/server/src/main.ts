import { serve } from '@hono/node-server'
import { Scalar } from '@scalar/hono-api-reference'
import { Hono } from 'hono'
import { openAPIRouteHandler } from 'hono-openapi'
import { cors } from 'hono/cors'
import { showRoutes } from 'hono/dev'
import './config/arktype'
import authRoute from './routes/auth'
import barsRoute from './routes/bars'
import cocktailsRoute from './routes/cocktails'
import partiesRoute from './routes/parties'
import usersRoute from './routes/users'
import { db } from './shared/db'
import { env } from './shared/env'
import './shared/hono'

const app = new Hono()
  .use(async (ctx, next) => {
    ctx.set('database', db)
    await next()
  })
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

app
  .get(
    '/openapi.json',
    openAPIRouteHandler(app, {
      documentation: {
        info: {
          title: 'ShakeDeRoy',
          version: '1.0.0',
          description: 'shakederoy API',
        },
      },
    })
  )
  .get(
    '/docs',
    Scalar({
      theme: 'saturn',
      url: '/openapi.json',
    })
  )

if (process?.env?.NODE_ENV === 'DEV' || process?.env?.NODE_ENV === 'STAGING') {
  showRoutes(app)
}

const server = serve(
  {
    fetch: app.fetch,
    port: env.APP_PORT,
  },
  (info) => console.log(`Listening on http://localhost:${info.port}`)
)

process.on('SIGTERM', () => {
  console.log('SIGTERM received: closing HTTP server')
  server.close()
  process.exit(0)
})
process.on('SIGINT', () => {
  console.log('SIGINT received: closing HTTP server')
  server.close()
  process.exit(0)
})
