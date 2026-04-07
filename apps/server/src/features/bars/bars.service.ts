import type { Database } from '@repo/schemas'
import type { BarPhoto, BarPhotoInsert } from '@repo/schemas/bar-photos'
import type { BarSignatureCocktailInsert } from '@repo/schemas/bar-signature-cocktails'
import type { Bar, BarInsert, BarUpdate } from '@repo/schemas/bars'
import type { SelectQueryBuilder } from 'kysely'
import { sql } from 'kysely'
import { ResultAsync } from 'neverthrow'
import { DbService } from 'src/shared/db-service'
import { AppError } from 'src/shared/errors'

export type BarListFilters = {
  city?: string
  style?: Bar['style']
  search?: string
  ownerId?: string
}

export class BarsService {
  constructor(private db: DbService) {}

  // --- Bars ---

  list(page: number, pageSize: number, filters: BarListFilters = {}) {
    const applyFilters = <T>(qb: SelectQueryBuilder<Database, 'bars', T>) => {
      let query = qb
      if (filters.city) {
        query = query.where('bars.city', '=', filters.city)
      }
      if (filters.style) {
        query = query.where('bars.style', '=', filters.style)
      }
      if (filters.search) {
        query = query.where('bars.name', 'ilike', `%${filters.search}%`)
      }
      if (filters.ownerId) {
        query = query.where('bars.owner_id', '=', filters.ownerId)
      }
      return query
    }

    return this.db.queryPaginated(
      (trx) =>
        trx
          .selectFrom('bars')
          .select((eb) => eb.fn.countAll().as('count'))
          .$call(applyFilters)
          .where('bars.deleted_at', 'is', null)
          .execute(),
      (trx) =>
        trx
          .selectFrom('bars')
          .leftJoin('bar_likes', 'bars.id', 'bar_likes.bar_id')
          .leftJoin('bar_reviews', 'bars.id', 'bar_reviews.bar_id')
          .leftJoinLateral(
            (eb) =>
              eb
                .selectFrom('bar_photos')
                .select(['url', 'alt_text', 'bar_id'])
                .whereRef('bar_photos.bar_id', '=', 'bars.id')
                .orderBy('is_primary', 'desc')
                .limit(1)
                .as('primary_photo'),
            (join) => join.onTrue()
          )
          .leftJoin('users', 'bars.owner_id', 'users.id')
          .selectAll('bars')
          .select([
            'users.username as owner_username',
            'primary_photo.url as photo_url',
            'primary_photo.alt_text as photo_alt_text',
            (eb) => eb.fn.count('bar_likes.id').as('likes_count'),
            (eb) => eb.fn.avg('bar_reviews.rating').as('average_rating'),
          ])
          .groupBy('bars.id')
          .groupBy('users.id')
          .groupBy('primary_photo.url')
          .groupBy('primary_photo.alt_text')
          .orderBy('bars.updated_at', 'desc')
          .where('bars.deleted_at', 'is', null)
          .$call(applyFilters)
          .limit(pageSize)
          .offset((page - 1) * pageSize)
          .execute(),
      page,
      pageSize
    )
  }

  getById(id: string, userId: string | null) {
    return this.db.transaction(async (trx) => {
      let barQuery = trx
        .selectFrom('bars')
        .leftJoin('users', 'bars.owner_id', 'users.id')
        .leftJoin('bar_likes', 'bars.id', 'bar_likes.bar_id')
        .leftJoin('bar_reviews', 'bars.id', 'bar_reviews.bar_id')
        .selectAll('bars')
        .select([
          'users.username as owner_username',
          (eb) => eb.fn.count('bar_likes.id').as('likes_count'),
          (eb) => eb.fn.avg('bar_reviews.rating').as('average_rating'),
        ])
        .where('bars.deleted_at', 'is', null)
        .where('bars.id', '=', id)

      if (userId) {
        barQuery = barQuery.select((eb) =>
          eb
            .selectFrom('bar_likes')
            .select(sql<boolean>`true`.as('exists'))
            .whereRef('bar_likes.bar_id', '=', 'bars.id')
            .where('bar_likes.user_id', '=', userId)
            .as('liked')
        )
      }

      const bar = await barQuery.executeTakeFirst()
      if (!bar) return AppError.notFound('Bar')

      const [photos, signature_cocktails] = await Promise.all([
        trx
          .selectFrom('bar_photos')
          .selectAll()
          .where('bar_id', '=', bar.id)
          .orderBy('is_primary', 'desc')
          .orderBy('created_at', 'desc')
          .execute(),
        trx
          .selectFrom('bar_signature_cocktails')
          .leftJoin(
            'cocktails',
            'bar_signature_cocktails.cocktail_id',
            'cocktails.id'
          )
          .selectAll('bar_signature_cocktails')
          .select('cocktails.name as cocktail_name')
          .where('bar_signature_cocktails.bar_id', '=', bar.id)
          .orderBy('bar_signature_cocktails.created_at', 'desc')
          .execute(),
      ])

      return {
        ...bar,
        liked: userId ? ((bar as any).liked ?? false) : null,
        photos,
        signature_cocktails,
      }
    })
  }

  create(
    data: BarInsert,
    photos?: { url: string; alt_text?: string }[]
  ) {
    return this.db.query((db) =>
      db.transaction().execute(async (trx) => {
        const bar = await trx
          .insertInto('bars')
          .values({
            name: data.name,
            slug: data.slug,
            description: data.description,
            address: data.address,
            city: data.city,
            postal_code: data.postal_code,
            country: data.country,
            latitude: data.latitude,
            longitude: data.longitude,
            phone: data.phone,
            website: data.website,
            style: data.style,
            owner_id: data.owner_id,
          })
          .returningAll()
          .executeTakeFirst()
        if (!bar) throw new Error('Failed to create bar')

        let insertedPhotos: BarPhoto[] = []
        if (photos && photos.length > 0) {
          insertedPhotos = await trx
            .insertInto('bar_photos')
            .values(
              photos.map((p) => ({
                bar_id: bar.id,
                url: p.url,
                alt_text: p.alt_text,
                is_primary: true,
              }))
            )
            .returningAll()
            .execute()
        }

        return {
          ...bar,
          owner_username: null,
          photos: insertedPhotos,
          likes_count: 0,
          average_rating: null,
          signature_cocktails: [],
          liked: null,
        }
      })
    )
  }

  update(id: string, userId: string, data: BarUpdate) {
    return this.db.query((db) =>
      db
        .updateTable('bars')
        .set(DbService.cleanUpdate(data))
        .where('id', '=', id)
        .where('owner_id', '=', userId)
        .where('bars.deleted_at', 'is', null)
        .returningAll()
        .executeTakeFirst()
        .then((row) => {
          if (!row) throw new Error('Bar not found')
          return row
        })
    )
  }

  delete(id: string, userId: string) {
    return this.db
      .query((db) =>
        db
          .updateTable('bars')
          .set({ deleted_at: new Date() })
          .where('id', '=', id)
          .where('owner_id', '=', userId)
          .where('bars.deleted_at', 'is', null)
          .returningAll()
          .executeTakeFirst()
      )
      .andThen(DbService.guard())
  }

  // --- Bar Photos ---

  listPhotos(barId: string) {
    return this.db.query((db) =>
      db
        .selectFrom('bar_photos')
        .selectAll()
        .where('bar_id', '=', barId)
        .orderBy('created_at', 'desc')
        .execute()
    )
  }

  createPhoto(data: BarPhotoInsert, userId: string) {
    return this.db.query((db) =>
      db.transaction().execute(async (trx) => {
        const bar = await trx
          .selectFrom('bars')
          .select('id')
          .where('id', '=', data.bar_id)
          .where('owner_id', '=', userId)
          .where('bars.deleted_at', 'is', null)
          .executeTakeFirst()
        if (!bar) throw new Error('Bar not found')

        const photo = await trx
          .insertInto('bar_photos')
          .values({
            bar_id: data.bar_id,
            url: data.url,
            alt_text: data.alt_text,
            is_primary: data.is_primary,
          })
          .returningAll()
          .executeTakeFirst()
        if (!photo) throw new Error('Failed to create bar photo')
        return photo
      })
    )
  }

  deletePhoto(barId: string, id: string, userId: string) {
    return this.db
      .query((db) =>
        db
          .deleteFrom('bar_photos')
          .where('id', '=', id)
          .where('bar_id', '=', barId)
          .where(
            'bar_id',
            'in',
            db
              .selectFrom('bars')
              .select('id')
              .where('owner_id', '=', userId)
          )
          .returningAll()
          .executeTakeFirst()
          .then((row) => {
            if (!row) throw new Error('Bar photo not found')
            return row
          })
      )
  }

  // --- Bar Signature Cocktails ---

  listSignatureCocktails(barId: string) {
    return this.db.query((db) =>
      db
        .selectFrom('bar_signature_cocktails')
        .selectAll()
        .where('bar_id', '=', barId)
        .orderBy('created_at', 'desc')
        .execute()
    )
  }

  createSignatureCocktail(
    data: BarSignatureCocktailInsert,
    userId: string
  ) {
    return this.db.query((db) =>
      db.transaction().execute(async (trx) => {
        const bar = await trx
          .selectFrom('bars')
          .select('id')
          .where('id', '=', data.bar_id)
          .where('owner_id', '=', userId)
          .where('bars.deleted_at', 'is', null)
          .executeTakeFirst()
        if (!bar) throw new Error('Bar not found')

        const cocktail = await trx
          .insertInto('bar_signature_cocktails')
          .values({
            bar_id: data.bar_id,
            cocktail_id: data.cocktail_id,
            price: data.price,
            currency: data.currency,
            is_available: data.is_available,
          })
          .returningAll()
          .executeTakeFirst()
        if (!cocktail)
          throw new Error('Failed to create bar signature cocktail')
        return cocktail
      })
    )
  }

  deleteSignatureCocktail(
    barId: string,
    id: string,
    userId: string
  ) {
    return this.db.query((db) =>
      db
        .deleteFrom('bar_signature_cocktails')
        .where('id', '=', id)
        .where('bar_id', '=', barId)
        .where(
          'bar_id',
          'in',
          db
            .selectFrom('bars')
            .select('id')
            .where('owner_id', '=', userId)
        )
        .returningAll()
        .executeTakeFirst()
        .then((row) => {
          if (!row) throw new Error('Bar signature cocktail not found')
          return row
        })
    )
  }

  // --- Bar Likes ---

  listLikes(barId: string, page: number, pageSize: number) {
    return this.db.queryPaginated(
      (trx) =>
        trx
          .selectFrom('bar_likes')
          .select((eb) => eb.fn.countAll().as('count'))
          .where('bar_id', '=', barId)
          .execute(),
      (trx) =>
        trx
          .selectFrom('bar_likes')
          .selectAll()
          .where('bar_id', '=', barId)
          .limit(pageSize)
          .offset((page - 1) * pageSize)
          .orderBy('created_at', 'desc')
          .execute(),
      page,
      pageSize
    )
  }

  toggleLike(
    barId: string,
    userId: string
  ): ResultAsync<{ liked: boolean }, AppError> {
    return this.db.query((db) =>
      db.transaction().execute(async (trx) => {
        const existing = await trx
          .selectFrom('bar_likes')
          .selectAll()
          .where('bar_id', '=', barId)
          .where('user_id', '=', userId)
          .executeTakeFirst()

        if (existing) {
          await trx
            .deleteFrom('bar_likes')
            .where('id', '=', existing.id)
            .execute()
          return { liked: false }
        }

        await trx
          .insertInto('bar_likes')
          .values({ bar_id: barId, user_id: userId })
          .execute()
        return { liked: true }
      })
    )
  }
}
