import type { Database } from '@repo/schemas'
import type { Kysely } from 'kysely'

type AlcoholType = { id: string; name: string }

type IngredientDef = {
  name: string
  category: 'spirit' | 'liqueur' | 'wine' | 'beer' | 'mixer' | 'juice' | 'syrup' | 'bitter' | 'garnish' | 'dairy' | 'other'
  is_alcoholic: boolean
  alcohol_type?: string // matches AlcoholType.name
  description?: string
}

const INGREDIENTS: IngredientDef[] = [
  // Spirits
  { name: 'Vodka', category: 'spirit', is_alcoholic: true, alcohol_type: 'Vodka' },
  { name: 'London Dry Gin', category: 'spirit', is_alcoholic: true, alcohol_type: 'Gin' },
  { name: 'White Rum', category: 'spirit', is_alcoholic: true, alcohol_type: 'Rum' },
  { name: 'Dark Rum', category: 'spirit', is_alcoholic: true, alcohol_type: 'Rum' },
  { name: 'Blanco Tequila', category: 'spirit', is_alcoholic: true, alcohol_type: 'Tequila' },
  { name: 'Reposado Tequila', category: 'spirit', is_alcoholic: true, alcohol_type: 'Tequila' },
  { name: 'Bourbon', category: 'spirit', is_alcoholic: true, alcohol_type: 'Whiskey' },
  { name: 'Rye Whiskey', category: 'spirit', is_alcoholic: true, alcohol_type: 'Whiskey' },
  { name: 'Cognac', category: 'spirit', is_alcoholic: true, alcohol_type: 'Brandy' },
  { name: 'Mezcal', category: 'spirit', is_alcoholic: true, alcohol_type: 'Mezcal' },
  { name: 'Absinthe', category: 'spirit', is_alcoholic: true, alcohol_type: 'Absinthe' },

  // Liqueurs
  { name: 'Triple Sec', category: 'liqueur', is_alcoholic: true, description: 'Orange-flavored liqueur' },
  { name: 'Campari', category: 'liqueur', is_alcoholic: true, description: 'Bitter Italian aperitif' },
  { name: 'Amaretto', category: 'liqueur', is_alcoholic: true, description: 'Almond-flavored liqueur' },
  { name: 'Kahlua', category: 'liqueur', is_alcoholic: true, description: 'Coffee liqueur' },
  { name: 'Maraschino Liqueur', category: 'liqueur', is_alcoholic: true },

  // Mixers
  { name: 'Tonic Water', category: 'mixer', is_alcoholic: false },
  { name: 'Soda Water', category: 'mixer', is_alcoholic: false },
  { name: 'Ginger Beer', category: 'mixer', is_alcoholic: false },
  { name: 'Cola', category: 'mixer', is_alcoholic: false },

  // Juices
  { name: 'Lime Juice', category: 'juice', is_alcoholic: false },
  { name: 'Lemon Juice', category: 'juice', is_alcoholic: false },
  { name: 'Orange Juice', category: 'juice', is_alcoholic: false },
  { name: 'Cranberry Juice', category: 'juice', is_alcoholic: false },
  { name: 'Pineapple Juice', category: 'juice', is_alcoholic: false },

  // Syrups
  { name: 'Simple Syrup', category: 'syrup', is_alcoholic: false },
  { name: 'Grenadine', category: 'syrup', is_alcoholic: false },
  { name: 'Honey Syrup', category: 'syrup', is_alcoholic: false },

  // Bitters
  { name: 'Angostura Bitters', category: 'bitter', is_alcoholic: true },

  // Garnishes
  { name: 'Mint Leaves', category: 'garnish', is_alcoholic: false },
  { name: 'Lime Wedge', category: 'garnish', is_alcoholic: false },

  // Dairy
  { name: 'Coconut Cream', category: 'dairy', is_alcoholic: false },
]

export async function seedIngredients(trx: Kysely<Database>, alcoholTypes: AlcoholType[]) {
  const typeMap = new Map(alcoholTypes.map((t) => [t.name, t.id]))

  const rows = INGREDIENTS.map(({ alcohol_type, ...rest }) => ({
    ...rest,
    alcohol_type_id: alcohol_type ? typeMap.get(alcohol_type) ?? null : null,
  }))

  const inserted = await trx
    .insertInto('ingredients')
    .values(rows)
    .returningAll()
    .execute()

  console.log(`  ingredients: ${inserted.length}`)
  return inserted
}
