import type { Database } from '@repo/schemas'
import type { Kysely } from 'kysely'

const GLASSES = [
  { name: 'Highball', description: 'Tall, narrow glass for long drinks', capacity: 350 },
  { name: 'Rocks', description: 'Short tumbler for spirits on ice', capacity: 300 },
  { name: 'Coupe', description: 'Broad, shallow bowl on a stem', capacity: 180 },
  { name: 'Martini', description: 'Iconic V-shaped cocktail glass', capacity: 200 },
  { name: 'Collins', description: 'Taller, slimmer highball glass', capacity: 400 },
  { name: 'Copper Mug', description: 'Traditional mug for Moscow Mules', capacity: 350 },
  { name: 'Hurricane', description: 'Curved glass for tropical cocktails', capacity: 450 },
  { name: 'Champagne Flute', description: 'Narrow glass preserving bubbles', capacity: 180 },
  { name: 'Nick & Nora', description: 'Elegant rounded bowl on a stem', capacity: 150 },
  { name: 'Shot', description: 'Small glass for straight spirits', capacity: 45 },
]

export async function seedGlasses(trx: Kysely<Database>) {
  const inserted = await trx
    .insertInto('glasses')
    .values(GLASSES)
    .returningAll()
    .execute()

  console.log(`  glasses: ${inserted.length}`)
  return inserted
}
