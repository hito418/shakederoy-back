import type { Database } from '@repo/schemas'
import type { Kysely } from 'kysely'
import { faker } from '@faker-js/faker'
import { COUNTS } from './config'
import { pickOne } from './helpers'

type Ref = {
  users: Array<{ id: string }>
  cocktails: Array<{ id: string }>
}

export async function seedSocial(trx: Kysely<Database>, refs: Ref) {
  // Collections
  const collectionRows = Array.from({ length: COUNTS.COLLECTIONS }, () => ({
    user_id: pickOne(refs.users).id,
    name: faker.lorem.words({ min: 2, max: 4 }),
    description: faker.lorem.sentence(),
    is_public: Math.random() > 0.4,
  }))

  const collections = await trx
    .insertInto('collections')
    .values(collectionRows)
    .returningAll()
    .execute()

  // Collection cocktails — 3-8 cocktails per collection
  const collCocktailRows = collections.flatMap((col) => {
    const count = faker.number.int({ min: 3, max: 8 })
    const picked = new Set<string>()
    const rows = []
    for (let i = 0; i < count; i++) {
      const cocktail = pickOne(refs.cocktails)
      if (!picked.has(cocktail.id)) {
        picked.add(cocktail.id)
        rows.push({ collection_id: col.id, cocktail_id: cocktail.id })
      }
    }
    return rows
  })

  await trx.insertInto('collection_cocktails').values(collCocktailRows).execute()

  // Favorites — unique user-cocktail pairs
  const favSet = new Set<string>()
  const favRows = []
  while (favRows.length < COUNTS.FAVORITES) {
    const userId = pickOne(refs.users).id
    const cocktailId = pickOne(refs.cocktails).id
    const key = `${userId}:${cocktailId}`
    if (!favSet.has(key)) {
      favSet.add(key)
      favRows.push({ user_id: userId, cocktail_id: cocktailId })
    }
  }

  await trx.insertInto('user_favorites').values(favRows).execute()

  // Votes — unique user-cocktail pairs
  const voteSet = new Set<string>()
  const voteRows = []
  while (voteRows.length < COUNTS.VOTES) {
    const userId = pickOne(refs.users).id
    const cocktailId = pickOne(refs.cocktails).id
    const key = `${userId}:${cocktailId}`
    if (!voteSet.has(key)) {
      voteSet.add(key)
      voteRows.push({
        user_id: userId,
        cocktail_id: cocktailId,
        vote_type: faker.helpers.arrayElement(['upvote', 'downvote'] as const),
      })
    }
  }

  await trx.insertInto('cocktail_votes').values(voteRows).execute()

  console.log(`  collections: ${collections.length}`)
  console.log(`  collection_cocktails: ${collCocktailRows.length}`)
  console.log(`  user_favorites: ${favRows.length}`)
  console.log(`  cocktail_votes: ${voteRows.length}`)
}
