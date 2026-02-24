import type { Database } from '@repo/schemas'
import type { Kysely } from 'kysely'

const ALCOHOL_TYPES = [
  { name: 'Vodka', description: 'Clear, neutral spirit distilled from grains or potatoes', abv_range_min: '35', abv_range_max: '50' },
  { name: 'Gin', description: 'Juniper-flavored spirit with botanicals', abv_range_min: '37', abv_range_max: '47' },
  { name: 'Rum', description: 'Spirit distilled from sugarcane or molasses', abv_range_min: '37', abv_range_max: '50' },
  { name: 'Tequila', description: 'Agave-based spirit from Mexico', abv_range_min: '35', abv_range_max: '55' },
  { name: 'Whiskey', description: 'Barrel-aged grain spirit', abv_range_min: '40', abv_range_max: '65' },
  { name: 'Brandy', description: 'Spirit distilled from wine or fruit', abv_range_min: '35', abv_range_max: '60' },
  { name: 'Mezcal', description: 'Smoky agave spirit from Mexico', abv_range_min: '38', abv_range_max: '55' },
  { name: 'Absinthe', description: 'Anise-flavored spirit with wormwood', abv_range_min: '45', abv_range_max: '74' },
]

export async function seedAlcoholTypes(trx: Kysely<Database>) {
  const inserted = await trx
    .insertInto('alcohol_types')
    .values(ALCOHOL_TYPES)
    .returningAll()
    .execute()

  console.log(`  alcohol_types: ${inserted.length}`)
  return inserted
}
