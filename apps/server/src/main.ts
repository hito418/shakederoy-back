import './instrument'
import { serve } from '@hono/node-server'
import { Scalar } from '@scalar/hono-api-reference'
import { openAPIRouteHandler } from 'hono-openapi'
import { showRoutes } from 'hono/dev'
import { app } from './app'
import { env } from './shared/env'

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

if (process?.env?.NODE_ENV === 'DEV') {
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
