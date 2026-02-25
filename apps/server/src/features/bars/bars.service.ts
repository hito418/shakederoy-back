import type { Database } from '@repo/schemas'
import type { Bar, BarInsert, BarUpdate } from '@repo/schemas/bars'
import type { BarPhoto, BarPhotoInsert } from '@repo/schemas/bar-photos'
import type {
  BarSignatureCocktail,
  BarSignatureCocktailInsert,
} from '@repo/schemas/bar-signature-cocktails'
import type { BarLike } from '@repo/schemas/bar-likes'
import type { Kysely } from 'kysely'
import { ResultAsync } from 'neverthrow'
import {
  cleanUpdate,
  dbDelete,
  dbInsert,
  dbQueryFirst,
  dbQueryMany,
  dbQueryPaginated,
  dbUpdate,
  withTransaction,
  type PaginatedResult,
} from 'src/shared/db-helpers'
import { Errors, type AppError } from 'src/shared/errors'

type DB = Kysely<Database>

// --- Bars ---

type BarJoint = Bar & {
  owner_username: string | null
  photo_url: string | null
  photo_alt_text: string | null
  likes_count: string | number | bigint
  average_rating: string | number
}

export function listBars(
  db: DB,
  page: number,
  pageSize: number
): ResultAsync<PaginatedResult<BarJoint>, AppError> {
  return dbQueryPaginated(
    db,
    (trx) =>
      trx
        .selectFrom('bars')
        .select((eb) => eb.fn.countAll().as('count'))
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
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .orderBy('updated_at', 'desc')
        .groupBy('bars.id')
        .groupBy('users.id')
        .groupBy('primary_photo.url')
        .groupBy('primary_photo.alt_text')
        .groupBy('bar_reviews.id')
        .groupBy('bar_likes.id')
        .execute(),
    page,
    pageSize
  )
}

export function getBarById(db: DB, id: string): ResultAsync<Bar, AppError> {
  return dbQueryFirst(
    () =>
      db.selectFrom('bars').selectAll().where('id', '=', id).executeTakeFirst(),
    Errors.notFound('Bar')
  )
}

export function createBar(db: DB, data: BarInsert): ResultAsync<Bar, AppError> {
  return dbInsert(
    () =>
      db
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
        .executeTakeFirst(),
    'Failed to create bar'
  )
}

export function updateBar(
  db: DB,
  id: string,
  userId: string,
  data: BarUpdate
): ResultAsync<Bar, AppError> {
  return dbUpdate(
    () =>
      db
        .updateTable('bars')
        .set(cleanUpdate(data))
        .where('id', '=', id)
        .where('owner_id', '=', userId)
        .returningAll()
        .executeTakeFirst(),
    Errors.notFound('Bar')
  )
}

export function deleteBar(
  db: DB,
  id: string,
  userId: string
): ResultAsync<Bar, AppError> {
  return dbDelete(
    () =>
      db
        .deleteFrom('bars')
        .where('id', '=', id)
        .where('owner_id', '=', userId)
        .returningAll()
        .executeTakeFirst(),
    Errors.notFound('Bar')
  )
}

// --- Bar Photos ---

export function listBarPhotos(
  db: DB,
  barId: string
): ResultAsync<BarPhoto[], AppError> {
  return dbQueryMany(() =>
    db
      .selectFrom('bar_photos')
      .selectAll()
      .where('bar_id', '=', barId)
      .orderBy('created_at', 'desc')
      .execute()
  )
}

export function createBarPhoto(
  db: DB,
  data: BarPhotoInsert,
  userId: string
): ResultAsync<BarPhoto, AppError> {
  return withTransaction(db, async (trx) => {
    const bar = await trx
      .selectFrom('bars')
      .select('id')
      .where('id', '=', data.bar_id)
      .where('owner_id', '=', userId)
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
}

export function deleteBarPhoto(
  db: DB,
  id: string,
  userId: string
): ResultAsync<BarPhoto, AppError> {
  return dbDelete(
    () =>
      db
        .deleteFrom('bar_photos')
        .where('id', '=', id)
        .where(
          'bar_id',
          'in',
          db.selectFrom('bars').select('id').where('owner_id', '=', userId)
        )
        .returningAll()
        .executeTakeFirst(),
    Errors.notFound('Bar photo')
  )
}

// --- Bar Signature Cocktails ---

export function listBarSignatureCocktails(
  db: DB,
  barId: string
): ResultAsync<BarSignatureCocktail[], AppError> {
  return dbQueryMany(() =>
    db
      .selectFrom('bar_signature_cocktails')
      .selectAll()
      .where('bar_id', '=', barId)
      .orderBy('created_at', 'desc')
      .execute()
  )
}

export function createBarSignatureCocktail(
  db: DB,
  data: BarSignatureCocktailInsert,
  userId: string
): ResultAsync<BarSignatureCocktail, AppError> {
  return withTransaction(db, async (trx) => {
    const bar = await trx
      .selectFrom('bars')
      .select('id')
      .where('id', '=', data.bar_id)
      .where('owner_id', '=', userId)
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
    return cocktail
  })
}

export function deleteBarSignatureCocktail(
  db: DB,
  id: string,
  userId: string
): ResultAsync<BarSignatureCocktail, AppError> {
  return dbDelete(
    () =>
      db
        .deleteFrom('bar_signature_cocktails')
        .where('id', '=', id)
        .where(
          'bar_id',
          'in',
          db.selectFrom('bars').select('id').where('owner_id', '=', userId)
        )
        .returningAll()
        .executeTakeFirst(),
    Errors.notFound('Bar signature cocktail')
  )
}

// --- Bar Likes ---

export function listBarLikes(
  db: DB,
  barId: string,
  page: number,
  pageSize: number
): ResultAsync<PaginatedResult<BarLike>, AppError> {
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
  )
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
