import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { env } from 'hono/adapter'
import { cors } from 'hono/cors'
import { showRoutes } from 'hono/dev'
import { db } from './shared/db'
import './shared/env'
import { HonoVar } from './shared/hono'
import authRoute from './routes/auth'
import cocktailsRoute from './routes/cocktails'
import favoritesRoute from './routes/favorites'
import usersRoute from './routes/users'
// import seedDb from './lib/seed'

if (process?.env?.NODE_ENV === 'DEV') {
  try {
    // await seedDb()
  } catch {}
}

function normalizeCorsEntry(entry: string): string {
  const trimmed = entry.trim()
  if (!trimmed) {
    return ''
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }

  return `http://${trimmed}`
}

function getCorsOrigin(origin: string | undefined, rawAllowedOrigins: string): string {
  const configured = rawAllowedOrigins
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

  if (configured.length === 0) {
    return '*'
  }

  if (!origin) {
    return normalizeCorsEntry(configured[0])
  }

  if (configured.includes('*')) {
    return origin
  }

  let originUrl: URL | null = null
  try {
    originUrl = new URL(origin)
  } catch {}

  for (const entry of configured) {
    if (entry.startsWith('http://') || entry.startsWith('https://')) {
      if (entry === origin) {
        return origin
      }
      continue
    }

    if (originUrl && originUrl.hostname === entry) {
      return origin
    }
  }

  return normalizeCorsEntry(configured[0])
}

const app = new HonoVar()
  .use(async (ctx, next) => {
    ctx.set('database', db)
    await next()
  })
  .use('/uploads/*', serveStatic({ root: './' }))
  .use(
    cors({
      origin: (origin, ctx) => getCorsOrigin(origin, env(ctx).CORS_ORIGIN),
      credentials: true,
    })
  )
  .route('/', authRoute)
  .route('/', usersRoute)
  .route('/', cocktailsRoute)
  .route('/', favoritesRoute)
  .get('/healthcheck', (ctx) => {
    return ctx.json({ status: 'ok' }, 200)
  })

if (process?.env?.NODE_ENV === 'DEV' || process?.env?.NODE_ENV === 'STAGING') {
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
