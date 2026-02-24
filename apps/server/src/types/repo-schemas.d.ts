declare module '@repo/schemas' {
  export interface Database {
    users: {
      id: string
      username: string
      email: string
      password: string
      role: 'admin' | 'user'
      profile_pic: string | null
      is_bar_owner: boolean
      created_at: Date
      updated_at: Date
      deleted_at: Date | null
    }
    sessions: {
      id: string
      user_id: string
      expires_at: Date
      created_at: Date
    }
    cocktails: {
      id: string
      name: string
      slug: string
      description: string | null
      intensity: number | null
      difficulty: number | null
      prep_time: number | null
      glass_id: string | null
      status: 'draft' | 'pending' | 'approved' | 'rejected'
      created_by_id: string | null
      variant_of_id: string | null
      bar_id: string | null
      created_at: Date
      updated_at: Date
      deleted_at: Date | null
    }
    ingredients: {
      id: string
      name: string
      description: string | null
      category:
        | 'spirit'
        | 'liqueur'
        | 'wine'
        | 'beer'
        | 'mixer'
        | 'juice'
        | 'syrup'
        | 'bitter'
        | 'garnish'
        | 'dairy'
        | 'other'
      is_alcoholic: boolean
      alcohol_type_id: string | null
      image_url: string | null
      created_at: Date
      updated_at: Date
      deleted_at: Date | null
    }
    cocktail_ingredients: {
      id: string
      cocktail_id: string
      ingredient_id: string
      quantity: string | null
      unit: string | null
      notes: string | null
      created_at: Date
      updated_at: Date
    }
    cocktail_styles: {
      id: string
      name: string
      description: string | null
      created_at: Date
      updated_at: Date
    }
    cocktail_styles_junction: {
      id: string
      cocktail_id: string
      style_id: string
      created_at: Date
      updated_at: Date
    }
    preparation_steps: {
      id: string
      cocktail_id: string
      step_number: number
      instruction: string
      image_url: string | null
      created_at: Date
      updated_at: Date
    }
    cocktail_photos: {
      id: string
      cocktail_id: string
      url: string
      alt_text: string | null
      is_primary: boolean
      created_at: Date
      updated_at: Date
    }
    user_favorites: {
      id: string
      user_id: string
      cocktail_id: string
      created_at: Date
      updated_at: Date
    }
  }
}

declare module '@repo/schemas/users' {
  export interface User {
    id: string
    username: string
    email: string
    password: string
    role: 'admin' | 'user'
    profile_pic: string | null
    is_bar_owner: boolean
    created_at: Date
    updated_at: Date
    deleted_at: Date | null
  }

  export interface UserUpdate {
    username?: string
    email?: string
    password?: string
    profile_pic?: string | null
    is_bar_owner?: boolean
  }
}
