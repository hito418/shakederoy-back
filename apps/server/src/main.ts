import { serve } from '@hono/node-server'
import { env } from 'hono/adapter'
import { cors } from 'hono/cors'
import { showRoutes } from 'hono/dev'
import { db } from './lib/db'
import './lib/env'
import { HonoVar } from './lib/hono'
import authRoute from './routes/auth'
import cocktailsRoute from './routes/cocktails'
import usersRoute from './routes/users'
// import seedDb from './lib/seed'

if (process?.env?.NODE_ENV === 'DEV') {
  try {
    // await seedDb()
  } catch {}
}

const app = new HonoVar()
  .use(async (ctx, next) => {
    ctx.set('database', db)
    await next()
  })
  .use(
    cors({
      origin: (_, ctx) => env(ctx)['CORS_ORIGIN'],
      credentials: true,
    })
  )
  .route('/', authRoute)
  .route('/', usersRoute)
  .route('/', cocktailsRoute)

if (process?.env?.NODE_ENV === 'DEV') {
  showRoutes(app)
}

const server = serve(
  {
    fetch: app.fetch,
    port: Number(process.env.APP_PORT) || 3000,
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
