import { db } from '../../shared/db'
import { ADMIN_PASSWORD, USER_PASSWORD } from './config'
import { seedAlcoholTypes } from './seed-alcohol-types'
import { seedGlasses } from './seed-glasses'
import { seedCocktailStyles } from './seed-cocktail-styles'
import { seedIngredients } from './seed-ingredients'
import { seedUsers } from './seed-users'
import { seedBars } from './seed-bars'
import { seedCocktails } from './seed-cocktails'
import { seedSocial } from './seed-social'

async function seed() {
  try {
    console.log('Seeding database...\n')

    await db.transaction().execute(async (trx) => {
      const alcoholTypes = await seedAlcoholTypes(trx)
      const glasses = await seedGlasses(trx)
      const styles = await seedCocktailStyles(trx)
      const ingredients = await seedIngredients(trx, alcoholTypes)
      const users = await seedUsers(trx)
      const bars = await seedBars(trx, users)
      const cocktails = await seedCocktails(trx, { users, glasses, bars, ingredients, styles })
      await seedSocial(trx, { users, cocktails })
    })

    console.log('\nSeeding completed!')
    console.log('\nAdmin credentials:')
    console.log(`  Email:    admin@shakederoy.com`)
    console.log(`  Password: ${ADMIN_PASSWORD}`)
    console.log(`\nUser password: ${USER_PASSWORD}`)
  } catch (error) {
    console.error('Seeding failed:', error)
    process.exit(1)
  } finally {
    await db.destroy()
  }
}

seed()
