import bcrypt from 'bcrypt'
import { faker } from '@faker-js/faker'
import { SALT_ROUNDS } from './config'

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export function pickRandom<T>(arr: T[], count: number): T[] {
  return faker.helpers.arrayElements(arr, count)
}

export function pickOne<T>(arr: T[]): T {
  return faker.helpers.arrayElement(arr)
}
