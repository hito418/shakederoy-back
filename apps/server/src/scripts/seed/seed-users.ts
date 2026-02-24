import type { Database } from '@repo/schemas'
import type { Kysely } from 'kysely'
import { faker } from '@faker-js/faker'
import { COUNTS, ADMIN_PASSWORD, USER_PASSWORD } from './config'
import { hashPassword } from './helpers'

export async function seedUsers(trx: Kysely<Database>) {
  const adminHash = await hashPassword(ADMIN_PASSWORD)
  const userHash = await hashPassword(USER_PASSWORD)

  const users: Array<{
    username: string
    email: string
    password: string
    role: 'admin' | 'user'
    profile_pic: string | null
    is_bar_owner: boolean
  }> = []

  // Primary admin
  users.push({
    username: 'admin',
    email: 'admin@shakederoy.com',
    password: adminHash,
    role: 'admin',
    profile_pic: faker.image.avatar(),
    is_bar_owner: false,
  })

  // Additional admins
  for (let i = 0; i < COUNTS.ADMINS - 1; i++) {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    users.push({
      username: faker.internet.userName({ firstName, lastName }).toLowerCase(),
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      password: adminHash,
      role: 'admin',
      profile_pic: faker.image.avatar(),
      is_bar_owner: false,
    })
  }

  // Regular users — first batch are bar owners
  const barOwnerCount = COUNTS.BARS
  const regularCount = COUNTS.USERS - COUNTS.ADMINS

  for (let i = 0; i < regularCount; i++) {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    users.push({
      username: faker.internet.userName({ firstName, lastName }).toLowerCase(),
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      password: userHash,
      role: 'user',
      profile_pic: Math.random() > 0.3 ? faker.image.avatar() : null,
      is_bar_owner: i < barOwnerCount,
    })
  }

  const inserted = await trx
    .insertInto('users')
    .values(users)
    .returningAll()
    .execute()

  console.log(`  users: ${inserted.length} (${COUNTS.ADMINS} admins, ${barOwnerCount} bar owners)`)
  return inserted
}
