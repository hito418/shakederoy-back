import type { Database } from '@repo/schemas'
import type { Kysely } from 'kysely'
import { faker } from '@faker-js/faker'
import { slugify } from './helpers'

type User = { id: string; is_bar_owner: boolean }

const BAR_STYLES = [
  'classic', 'speakeasy', 'tiki', 'rooftop', 'dive',
  'wine_bar', 'cocktail_lounge', 'sports_bar', 'brewpub', 'other',
] as const

export async function seedBars(trx: Kysely<Database>, users: User[]) {
  const barOwners = users.filter((u) => u.is_bar_owner)

  const bars = barOwners.map((owner, i) => {
    const name = `${faker.company.name()} ${faker.helpers.arrayElement(['Bar', 'Lounge', 'Tavern', 'Pub', 'Speakeasy'])}`
    return {
      owner_id: owner.id,
      name,
      slug: slugify(`${name}-${i}`),
      description: faker.lorem.sentence(),
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      postal_code: faker.location.zipCode(),
      country: faker.location.country(),
      latitude: faker.location.latitude(),
      longitude: faker.location.longitude(),
      phone: faker.phone.number(),
      website: faker.internet.url(),
      style: faker.helpers.arrayElement(BAR_STYLES),
    }
  })

  const inserted = await trx
    .insertInto('bars')
    .values(bars)
    .returningAll()
    .execute()

  console.log(`  bars: ${inserted.length}`)
  return inserted
}
