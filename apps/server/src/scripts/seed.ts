import { faker } from '@faker-js/faker'
import bcrypt from 'bcrypt'
import { sql } from 'kysely'
import { db } from '../shared/db'

const USERS_COUNT = 30
const COCKTAILS_COUNT = 40
const ADMIN_COUNT = 3

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function seedUsers() {
  console.log('Seeding users...')

  const users = []
  users.push({
    username: 'admin',
    email: 'admin@shakederoy.com',
    password: await bcrypt.hash('AdminPassword123!', 10),
    role: 'admin' as const,
    profile_pic: faker.image.avatar(),
  })

  for (let i = 0; i < ADMIN_COUNT - 1; i++) {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    users.push({
      username: faker.internet.userName({ firstName, lastName }).toLowerCase(),
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      password: await bcrypt.hash('AdminPass123!', 10),
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
      password: await bcrypt.hash('UserPassword123!', 10),
      role: 'user' as const,
      profile_pic: Math.random() > 0.3 ? faker.image.avatar() : null,
    })
  }

  const inserted = await db.insertInto('users').values(users as any).returningAll().execute()
  console.log(`Created ${inserted.length} users (${ADMIN_COUNT} admins)`)
  return inserted
}

async function seedStyles() {
  const styleNames = ['Tropical', 'Classique', 'Fruite', 'Aperitif', 'Sans alcool', 'Signature']
  const inserted = await db
    .insertInto('cocktail_styles')
    .values(styleNames.map((name) => ({ name, description: null })) as any)
    .returningAll()
    .execute()

  return inserted
}

async function seedIngredients() {
  const baseIngredients = [
    { name: 'Rhum blanc', alcoholic: true },
    { name: 'Vodka', alcoholic: true },
    { name: 'Gin', alcoholic: true },
    { name: 'Tequila', alcoholic: true },
    { name: 'Menthe', alcoholic: false },
    { name: 'Citron vert', alcoholic: false },
    { name: 'Jus d ananas', alcoholic: false },
    { name: 'Sirop de sucre', alcoholic: false },
    { name: 'Eau gazeuse', alcoholic: false },
    { name: 'Lait de coco', alcoholic: false },
  ]

  const inserted = await db
    .insertInto('ingredients')
    .values(
      baseIngredients.map((ingredient) => ({
        name: ingredient.name,
        category: ingredient.alcoholic ? 'spirit' : 'mixer',
        is_alcoholic: ingredient.alcoholic,
        description: null,
        alcohol_type_id: null,
        image_url: null,
        deleted_at: null,
      })) as any
    )
    .returningAll()
    .execute()

  return inserted
}

async function seedCocktails(userIds: string[], styleIds: string[], ingredientIds: string[]) {
  console.log('Seeding cocktails...')

  const cocktailsPayload = []
  for (let i = 0; i < COCKTAILS_COUNT; i++) {
    const spirit = faker.helpers.arrayElement(['Rum', 'Gin', 'Vodka', 'Tequila'])
    const flavor = faker.helpers.arrayElement(['Lime', 'Berry', 'Sunset', 'Royal'])
    const suffix = faker.word.adjective()
    const name = `${flavor} ${spirit} ${suffix}`

    cocktailsPayload.push({
      name,
      slug: `${slugify(name)}-${i + 1}`,
      description: faker.lorem.sentence({ min: 8, max: 16 }),
      intensity: faker.number.int({ min: 1, max: 3 }),
      difficulty: faker.number.int({ min: 1, max: 3 }),
      prep_time: faker.number.int({ min: 3, max: 15 }),
      status: 'approved' as const,
      created_by_id: faker.helpers.arrayElement(userIds),
      variant_of_id: null,
      bar_id: null,
      glass_id: null,
      deleted_at: null,
    })
  }

  const cocktails = await db.insertInto('cocktails').values(cocktailsPayload as any).returningAll().execute()

  if (cocktails.length >= 3) {
    await db
      .updateTable('cocktails')
      .set({ variant_of_id: cocktails[0].id })
      .where('id', '=', cocktails[1].id)
      .execute()
  }

  const styleRows = []
  const ingredientRows = []
  const stepRows = []
  const photoRows = []

  for (const cocktail of cocktails) {
    const pickedStyles = faker.helpers.arrayElements(styleIds, { min: 1, max: 3 })
    for (const styleId of pickedStyles) {
      styleRows.push({
        cocktail_id: cocktail.id,
        style_id: styleId,
      })
    }

    const pickedIngredients = faker.helpers.arrayElements(ingredientIds, { min: 3, max: 5 })
    for (const ingredientId of pickedIngredients) {
      ingredientRows.push({
        cocktail_id: cocktail.id,
        ingredient_id: ingredientId,
        quantity: `${faker.number.int({ min: 1, max: 8 })} cl`,
        unit: null,
        notes: null,
      })
    }

    for (let stepNumber = 1; stepNumber <= 3; stepNumber++) {
      stepRows.push({
        cocktail_id: cocktail.id,
        step_number: stepNumber,
        instruction: faker.lorem.sentence({ min: 8, max: 14 }),
        image_url: null,
      })
    }

    photoRows.push({
      cocktail_id: cocktail.id,
      url: `https://picsum.photos/seed/${cocktail.slug}/800/800`,
      alt_text: cocktail.name,
      is_primary: true,
    })
  }

  if (styleRows.length > 0) {
    await db.insertInto('cocktail_styles_junction').values(styleRows as any).execute()
  }
  if (ingredientRows.length > 0) {
    await db.insertInto('cocktail_ingredients').values(ingredientRows as any).execute()
  }
  if (stepRows.length > 0) {
    await db.insertInto('preparation_steps').values(stepRows as any).execute()
  }
  if (photoRows.length > 0) {
    await db.insertInto('cocktail_photos').values(photoRows as any).execute()
  }

  console.log(`Created ${cocktails.length} cocktails with relations`)
}

async function seed() {
  try {
    console.log('Starting database seeding...\n')

    await sql`
      TRUNCATE TABLE
        user_favorites,
        cocktail_photos,
        preparation_steps,
        cocktail_ingredients,
        cocktail_styles_junction,
        cocktails,
        ingredients,
        cocktail_styles,
        sessions,
        users
      RESTART IDENTITY CASCADE
    `.execute(db)

    const users = await seedUsers()
    const styles = await seedStyles()
    const ingredients = await seedIngredients()

    await seedCocktails(
      users.map((user) => user.id),
      styles.map((style) => style.id),
      ingredients.map((ingredient) => ingredient.id)
    )

    console.log('\nSeeding completed')
    console.log('\nAdmin credentials:')
    console.log('  Username: admin')
    console.log('  Email: admin@shakederoy.com')
    console.log('  Password: AdminPassword123!')
  } catch (error) {
    console.error('Seeding failed:', error)
    process.exit(1)
  } finally {
    await db.destroy()
  }
}

seed()
