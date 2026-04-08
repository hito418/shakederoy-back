import * as Sentry from '@sentry/node'
import { env } from './shared/env'

console.log('DSN', env.SENTRY_DSN)

Sentry.init({
  dsn: env.SENTRY_DSN,
  environment: env.NODE_ENV.toLowerCase(),
  enabled: env.NODE_ENV !== 'DEV',
  sendDefaultPii: true,
  tracesSampleRate: 0,
  integrations: [],
  release: 'shakederoy@1.0.0',
})
