import * as Sentry from '@sentry/node'
import { env } from './shared/env'

Sentry.init({
  dsn: env.SENTRY_DSN,
  environment: env.NODE_ENV.toLowerCase(),
  enabled: env.NODE_ENV !== 'DEV',
  sendDefaultPii: true,
  tracesSampleRate: env.NODE_ENV === 'PROD' ? 0.2 : 1.0,
})
