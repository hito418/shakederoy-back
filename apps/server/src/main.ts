import { showRoutes } from 'hono/dev'
import { serve } from '@hono/node-server'
import './lib/env'
import { db } from './lib/db'
import authRoute from './routes/auth'
import { cors } from 'hono/cors'
// import usersRoute from './routes/users'
import { HonoVar } from './lib/hono'
import { env } from 'hono/adapter'
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
  // .route('/', usersRoute)

if (process?.env?.NODE_ENV === 'DEV') {
  showRoutes(app)
}

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => console.log(`Listening on http://localhost:${info.port}`)
)

process.on('SIGTERM', () => {
  console.log('SIGTERM received: closing HTTP server')
  process.exit(0)
})
process.on('SIGINT', () => {
  console.log('SIGINT received: closing HTTP server')
  process.exit(0)
})
