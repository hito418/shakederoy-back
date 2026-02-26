import type { Database } from '@repo/schemas'
import type { BarPhoto, BarPhotoInsert } from '@repo/schemas/bar-photos'
import type { BarSignatureCocktailInsert } from '@repo/schemas/bar-signature-cocktails'
import type { BarInsert, BarUpdate } from '@repo/schemas/bars'
import type { Kysely } from 'kysely'
import { SelectQueryBuilder, sql } from 'kysely'
import { ResultAsync } from 'neverthrow'
import { cleanUpdate, dbQuery, dbQueryPaginated } from 'src/shared/db-helpers'
import { Errors, type AppError } from 'src/shared/errors'

type DB = Kysely<Database>

const UUID_PREFIX = /^[0-9a-f]{8}-/i

// --- Bars ---

export type BarListFilters = {
  city?: string
  style?: string
  search?: string
}

export function listBars(
  db: DB,
  page: number,
  pageSize: number,
  filters: BarListFilters = {}
) {
  const applyFilters = <T>(qb: SelectQueryBuilder<Database, 'bars', T>) => {
    if (filters.city) {
      qb.where('bars.city', '=', filters.city)
    }
    if (filters.style) {
      qb.where('bars.style', '=', filters.style)
    }
    if (filters.search) {
      qb.where('bars.name', 'ilike', `%${filters.search}%`)
    }

    return qb
  }

  return dbQueryPaginated(
    db,
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

export function getBarByIdOrSlug(
  db: DB,
  idOrSlug: string,
  userId: string | null
) {
  const isUuid = UUID_PREFIX.test(idOrSlug)

  return dbQuery(
    db.transaction().execute(async (trx) => {
      // Query 1: bar + aggregates + liked
      let barQuery = trx
        .selectFrom('bars')
        .leftJoin('users', 'bars.owner_id', 'users.id')
        .selectAll('bars')
        .select([
          'users.username as owner_username',
          (eb) =>
            eb
              .selectFrom('bar_likes')
              .select((eb2) => eb2.fn.countAll().as('cnt'))
              .whereRef('bar_likes.bar_id', '=', 'bars.id')
              .as('likes_count'),
          (eb) =>
            eb
              .selectFrom('bar_reviews')
              .select((eb2) => eb2.fn.avg('bar_reviews.rating').as('avg'))
              .whereRef('bar_reviews.bar_id', '=', 'bars.id')
              .as('average_rating'),
        ])
        .where('bars.deleted_at', 'is', null)

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

      if (isUuid) {
        barQuery = barQuery.where('bars.id', '=', idOrSlug)
      } else {
        barQuery = barQuery.where('bars.slug', '=', idOrSlug)
      }

      const bar = await barQuery.executeTakeFirst()
      if (!bar) throw new Error('Bar not found')

      // Query 2: photos + signature cocktails
      const [photos, signatureCocktails] = await Promise.all([
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

      const mapped = { bar }
      mapped.likesCount = Number(mapped.likesCount ?? 0)
      mapped.averageRating =
        mapped.averageRating != null ? Number(mapped.averageRating) : null
      mapped.liked = userId ? (mapped.liked ?? false) : null
      mapped.photos = snakeToCamelArray(photos as Record<string, unknown>[])
      mapped.signatureCocktails = snakeToCamelArray(
        signatureCocktails as Record<string, unknown>[]
      )

      return bar
    })
  )
}

export function createBar(
  db: DB,
  data: BarInsert,
  photos?: { url: string; altText?: string }[]
) {
  return withTransaction(db, async (trx) => {
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
            alt_text: p.altText,
            is_primary: true,
          }))
        )
        .returningAll()
        .execute()
    }

    const mapped = snakeToCamel(bar as Record<string, unknown>)
    mapped.ownerUsername = null
    mapped.photos = snakeToCamelArray(
      insertedPhotos as Record<string, unknown>[]
    )
    mapped.likesCount = 0
    mapped.averageRating = null
    mapped.signatureCocktails = []
    mapped.liked = null

    return mapped
  })
}

export function updateBar(
  db: DB,
  id: string,
  userId: string,
  data: BarUpdate
): ResultAsync<Record<string, unknown>, AppError> {
  return dbUpdate(
    () =>
      db
        .updateTable('bars')
        .set(cleanUpdate(data))
        .where('id', '=', id)
        .where('owner_id', '=', userId)
        .where('bars.deleted_at', 'is', null)
        .returningAll()
        .executeTakeFirst(),
    Errors.notFound('Bar')
  ).map((row) => snakeToCamel(row as Record<string, unknown>))
}

export function deleteBar(
  db: DB,
  id: string,
  userId: string
): ResultAsync<Record<string, unknown>, AppError> {
  return dbUpdate(
    () =>
      db
        .updateTable('bars')
        .set({ deleted_at: new Date() })
        .where('id', '=', id)
        .where('owner_id', '=', userId)
        .where('bars.deleted_at', 'is', null)
        .returningAll()
        .executeTakeFirst(),
    Errors.notFound('Bar')
  ).map((row) => snakeToCamel(row as Record<string, unknown>))
}

// --- Bar Photos ---

export function listBarPhotos(
  db: DB,
  barId: string
): ResultAsync<Record<string, unknown>[], AppError> {
  return dbQueryMany(() =>
    db
      .selectFrom('bar_photos')
      .selectAll()
      .where('bar_id', '=', barId)
      .orderBy('created_at', 'desc')
      .execute()
  ).map((rows) => snakeToCamelArray(rows as Record<string, unknown>[]))
}

export function createBarPhoto(
  db: DB,
  data: BarPhotoInsert,
  userId: string
): ResultAsync<Record<string, unknown>, AppError> {
  return withTransaction(db, async (trx) => {
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
    return snakeToCamel(photo as Record<string, unknown>)
  })
}

export function deleteBarPhoto(
  db: DB,
  barId: string,
  id: string,
  userId: string
): ResultAsync<Record<string, unknown>, AppError> {
  return dbDelete(
    () =>
      db
        .deleteFrom('bar_photos')
        .where('id', '=', id)
        .where('bar_id', '=', barId)
        .where(
          'bar_id',
          'in',
          db.selectFrom('bars').select('id').where('owner_id', '=', userId)
        )
        .returningAll()
        .executeTakeFirst(),
    Errors.notFound('Bar photo')
  ).map((row) => snakeToCamel(row as Record<string, unknown>))
}

// --- Bar Signature Cocktails ---

export function listBarSignatureCocktails(
  db: DB,
  barId: string
): ResultAsync<Record<string, unknown>[], AppError> {
  return dbQueryMany(() =>
    db
      .selectFrom('bar_signature_cocktails')
      .selectAll()
      .where('bar_id', '=', barId)
      .orderBy('created_at', 'desc')
      .execute()
  ).map((rows) => snakeToCamelArray(rows as Record<string, unknown>[]))
}

export function createBarSignatureCocktail(
  db: DB,
  data: BarSignatureCocktailInsert,
  userId: string
): ResultAsync<Record<string, unknown>, AppError> {
  return withTransaction(db, async (trx) => {
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
    if (!cocktail) throw new Error('Failed to create bar signature cocktail')
    return snakeToCamel(cocktail as Record<string, unknown>)
  })
}

export function deleteBarSignatureCocktail(
  db: DB,
  barId: string,
  id: string,
  userId: string
): ResultAsync<Record<string, unknown>, AppError> {
  return dbDelete(
    () =>
      db
        .deleteFrom('bar_signature_cocktails')
        .where('id', '=', id)
        .where('bar_id', '=', barId)
        .where(
          'bar_id',
          'in',
          db.selectFrom('bars').select('id').where('owner_id', '=', userId)
        )
        .returningAll()
        .executeTakeFirst(),
    Errors.notFound('Bar signature cocktail')
  ).map((row) => snakeToCamel(row as Record<string, unknown>))
}

// --- Bar Likes ---

export function listBarLikes(
  db: DB,
  barId: string,
  page: number,
  pageSize: number
) {
  return dbQueryPaginated(
    db,
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
  ).map((result) => ({
    ...result,
    data: snakeToCamelArray(result.data as Record<string, unknown>[]),
  }))
}

export function toggleBarLike(
  db: DB,
  barId: string,
  userId: string
): ResultAsync<{ liked: boolean }, AppError> {
  return withTransaction(db, async (trx) => {
    const existing = await trx
      .selectFrom('bar_likes')
      .selectAll()
      .where('bar_id', '=', barId)
      .where('user_id', '=', userId)
      .executeTakeFirst()

    if (existing) {
      await trx.deleteFrom('bar_likes').where('id', '=', existing.id).execute()
      return { liked: false }
    }

    await trx
      .insertInto('bar_likes')
      .values({ bar_id: barId, user_id: userId })
      .execute()
    return { liked: true }
  })
}
