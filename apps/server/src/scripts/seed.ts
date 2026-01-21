import { faker } from '@faker-js/faker'
import { hash } from '@node-rs/argon2'
import { db } from '../lib/db'

const USERS_COUNT = 50
const COCKTAILS_COUNT = 100
const ADMIN_COUNT = 5

async function seedUsers() {
  console.log('Seeding users...')

  const users = []

  users.push({
    username: 'admin',
    email: 'admin@shakederoy.com',
    password: await hash('AdminPassword123!'),
    role: 'admin' as const,
    profile_pic: faker.image.avatar(),
  })

  for (let i = 0; i < ADMIN_COUNT - 1; i++) {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    users.push({
      username: faker.internet.userName({ firstName, lastName }).toLowerCase(),
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      password: await hash('AdminPass123!'),
      role: 'admin' as const,
      profile_pic: faker.image.avatar(),
    })
  }

  for (let i = 0; i < USERS_COUNT - ADMIN_COUNT; i++) {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    users.push({
      username: faker.internet.userName({ firstName, lastName }).toLowerCase(),
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      password: await hash('UserPassword123!'),
      role: 'user' as const,
      profile_pic: Math.random() > 0.3 ? faker.image.avatar() : null,
    })
  }

  const inserted = await db
    .insertInto('users')
    .values(users)
    .returningAll()
    .execute()

  console.log(`Created ${inserted.length} users (${ADMIN_COUNT} admins)`)
  return inserted
}

async function seedCocktails() {
  console.log('Seeding cocktails...')

  const spirits = ['Vodka', 'Gin', 'Rum', 'Tequila', 'Whiskey', 'Bourbon', 'Cognac', 'Brandy']
  const mixers = ['Tonic', 'Soda', 'Ginger Beer', 'Cola', 'Lemonade', 'Orange Juice', 'Cranberry Juice', 'Pineapple Juice']
  const flavors = ['Lime', 'Lemon', 'Orange', 'Mint', 'Strawberry', 'Mango', 'Passion Fruit', 'Raspberry', 'Peach', 'Ginger']
  const styles = ['Sour', 'Fizz', 'Martini', 'Mule', 'Spritz', 'Punch', 'Smash', 'Collins', 'Cooler', 'Daisy']
  const garnishes = ['lime wedge', 'lemon twist', 'orange slice', 'mint sprig', 'cherry', 'olive', 'cucumber', 'salt rim']
  const glassware = ['highball glass', 'martini glass', 'old fashioned glass', 'coupe', 'collins glass', 'copper mug']

  const cocktails = []

  for (let i = 0; i < COCKTAILS_COUNT; i++) {
    const spirit = faker.helpers.arrayElement(spirits)
    const flavor = faker.helpers.arrayElement(flavors)
    const style = faker.helpers.arrayElement(styles)
    const mixer = faker.helpers.arrayElement(mixers)
    const garnish = faker.helpers.arrayElement(garnishes)
    const glass = faker.helpers.arrayElement(glassware)

    const name = `${flavor} ${spirit} ${style}`

    const ingredients = [
      `${faker.number.int({ min: 30, max: 60 })}ml ${spirit.toLowerCase()}`,
      `${faker.number.int({ min: 15, max: 30 })}ml ${flavor.toLowerCase()} juice`,
      `${faker.number.int({ min: 10, max: 20 })}ml simple syrup`,
      `${faker.number.int({ min: 60, max: 120 })}ml ${mixer.toLowerCase()}`,
      'ice',
      garnish,
    ].join(', ')

    const instructions = [
      `Fill a shaker with ice.`,
      `Add ${spirit.toLowerCase()} and ${flavor.toLowerCase()} juice.`,
      `Add simple syrup and shake vigorously for 15 seconds.`,
      `Strain into a ${glass} filled with fresh ice.`,
      `Top with ${mixer.toLowerCase()}.`,
      `Garnish with ${garnish}.`,
    ].join(' ')

    cocktails.push({
      name,
      description: faker.lorem.sentence({ min: 10, max: 20 }),
      ingredients,
      instructions,
      image: null,
    })
  }

  const inserted = await db
    .insertInto('cocktails')
    .values(cocktails)
    .returningAll()
    .execute()

  console.log(`Created ${inserted.length} cocktails`)
  return inserted
}

async function seed() {
  try {
    console.log('Starting database seeding...\n')

    if (process.env.NODE_ENV !== 'PROD') {
      await seedUsers()
    }
    
    await seedCocktails()

    console.log('\nSeeding completed!')

    if (process.env.NODE_ENV !== 'PROD') {
      console.log('\nAdmin credentials:')
      console.log('  Email: admin@shakederoy.com')
      console.log('  Password: AdminPassword123!')
    }
  } catch (error) {
    console.error('Seeding failed:', error)
    process.exit(1)
  } finally {
    await db.destroy()
  }
}

seed()
