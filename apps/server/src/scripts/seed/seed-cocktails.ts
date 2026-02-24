import type { Database } from '@repo/schemas'
import type { Kysely } from 'kysely'
import { faker } from '@faker-js/faker'
import { COUNTS } from './config'
import { slugify, pickOne, pickRandom } from './helpers'

type Ref = {
  users: Array<{ id: string; role: string }>
  glasses: Array<{ id: string }>
  bars: Array<{ id: string }>
  ingredients: Array<{ id: string; name: string; category: string }>
  styles: Array<{ id: string }>
}

const STATUSES = ['draft', 'pending', 'approved', 'approved', 'approved'] as const
const UNITS = ['ml', 'oz', 'dash', 'barspoon', 'piece', 'slice', 'sprig']

const STEP_TEMPLATES = [
  'Add {ingredient} to the shaker.',
  'Fill the glass with crushed ice.',
  'Shake vigorously for 10-15 seconds.',
  'Strain into the prepared glass.',
  'Stir gently for 20-30 seconds.',
  'Muddle the ingredients in the glass.',
  'Top with soda water.',
  'Garnish and serve immediately.',
  'Double strain into a chilled glass.',
  'Express citrus peel over the surface.',
  'Layer the ingredients carefully.',
  'Dry shake without ice first.',
  'Roll the mixture between tins.',
  'Float the spirit on top.',
  'Rim the glass with salt or sugar.',
]

export async function seedCocktails(trx: Kysely<Database>, refs: Ref) {
  const cocktailRows = []

  for (let i = 0; i < COUNTS.COCKTAILS; i++) {
    const adjective = faker.word.adjective()
    const noun = faker.word.noun()
    const name = `${adjective} ${noun} ${faker.helpers.arrayElement(['Sour', 'Mule', 'Fizz', 'Collins', 'Smash', 'Punch', 'Spritz', 'Daisy'])}`
    const titleName = name.replace(/\b\w/g, (c) => c.toUpperCase())

    cocktailRows.push({
      name: `${titleName} #${i + 1}`,
      slug: slugify(`${name}-${i + 1}`),
      description: faker.lorem.sentence({ min: 8, max: 16 }),
      intensity: faker.number.int({ min: 1, max: 5 }),
      difficulty: faker.number.int({ min: 1, max: 5 }),
      prep_time: faker.number.int({ min: 3, max: 15 }),
      glass_id: pickOne(refs.glasses).id,
      status: faker.helpers.arrayElement(STATUSES),
      created_by_id: pickOne(refs.users).id,
      bar_id: Math.random() > 0.7 ? pickOne(refs.bars).id : null,
    })
  }

  const cocktails = await trx
    .insertInto('cocktails')
    .values(cocktailRows)
    .returningAll()
    .execute()

  // Cocktail ingredients
  const ingredientRows = cocktails.flatMap((c) => {
    const count = faker.number.int({ min: 3, max: 6 })
    return pickRandom(refs.ingredients, count).map((ing) => ({
      cocktail_id: c.id,
      ingredient_id: ing.id,
      quantity: String(faker.number.int({ min: 10, max: 60 })),
      unit: faker.helpers.arrayElement(UNITS),
    }))
  })

  await trx.insertInto('cocktail_ingredients').values(ingredientRows).execute()

  // Preparation steps
  const stepRows = cocktails.flatMap((c) => {
    const count = faker.number.int({ min: 3, max: 6 })
    return Array.from({ length: count }, (_, idx) => ({
      cocktail_id: c.id,
      step_number: idx + 1,
      instruction: faker.helpers.arrayElement(STEP_TEMPLATES),
    }))
  })

  await trx.insertInto('preparation_steps').values(stepRows).execute()

  // Cocktail styles junction
  const styleRows = cocktails.flatMap((c) => {
    const count = faker.number.int({ min: 1, max: 3 })
    return pickRandom(refs.styles, count).map((s) => ({
      cocktail_id: c.id,
      style_id: s.id,
    }))
  })

  await trx.insertInto('cocktail_styles_junction').values(styleRows).execute()

  console.log(`  cocktails: ${cocktails.length}`)
  console.log(`  cocktail_ingredients: ${ingredientRows.length}`)
  console.log(`  preparation_steps: ${stepRows.length}`)
  console.log(`  cocktail_styles_junction: ${styleRows.length}`)

  return cocktails
}
