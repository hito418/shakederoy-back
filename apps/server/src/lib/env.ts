import { type } from 'arktype'

const envSchema = type({
  PG_HOST: 'string',
  PG_PORT: 'string.numeric',
  PG_DB: 'string',
  PG_USER: 'string',
  PG_PASSWORD: 'string',
  COOKIE_SECRET: 'string',
  JWT_SECRET: 'string', 
  CORS_ORIGIN: 'string',
  APP_PORT: 'string.numeric',
  // PAGE_SIZE: type.string.default('15'),
  // MAX_FILE_SIZE: type.string.default((10 * 1024 * 1024).toString()),
  NODE_ENV: '"DEV" | "STAGING" | "PROD"',
})

const result = envSchema(process.env)
if (result instanceof type.errors) {
  console.error('Invalid Environment Variables')
  console.error(result.summary)
  process.exit(1)
}

type out = typeof envSchema.inferOut

declare global {
  namespace NodeJS {
    interface ProcessEnv extends out {}
  }
}

export {}
