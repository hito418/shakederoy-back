import type { Database } from '@repo/schemas'
import type { Kysely } from 'kysely'

const COCKTAIL_STYLES = [
  { name: 'Sour', description: 'Spirit, citrus, and sweetener' },
  { name: 'Fizz', description: 'Shaken cocktail topped with soda' },
  { name: 'Tiki', description: 'Tropical, rum-based, often multi-spirit' },
  { name: 'Highball', description: 'Spirit lengthened with a carbonated mixer' },
  { name: 'Stirred', description: 'Spirit-forward, stirred over ice' },
  { name: 'Frozen', description: 'Blended with ice into a slushy texture' },
  { name: 'Hot', description: 'Warm or heated cocktails' },
  { name: 'Punch', description: 'Batch-style with fruit and spice' },
  { name: 'Spritz', description: 'Wine or aperitif with sparkling water' },
  { name: 'Smash', description: 'Muddled fruit or herbs with spirit' },
]

export async function seedCocktailStyles(trx: Kysely<Database>) {
  const inserted = await trx
    .insertInto('cocktail_styles')
    .values(COCKTAIL_STYLES)
    .returningAll()
    .execute()

  console.log(`  cocktail_styles: ${inserted.length}`)
  return inserted
}
