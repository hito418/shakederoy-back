import type {
  PartySession,
  PartySessionInsert,
  PartySessionUpdate,
} from '@repo/schemas/party-sessions'
import type {
  PartyParticipant,
  PartyParticipantInsert,
  PartyParticipantUpdate,
} from '@repo/schemas/party-participants'
import type {
  PartyParticipantStyle,
  PartyParticipantStyleInsert,
} from '@repo/schemas/party-participant-styles'
import type {
  PartyCocktailSelection,
  PartyCocktailSelectionInsert,
  PartyCocktailSelectionUpdate,
} from '@repo/schemas/party-cocktail-selections'
import type { ResultAsync } from 'neverthrow'
import { DbService, type PaginatedResult } from 'src/shared/db-service'
import { AppError } from 'src/shared/errors'

export type ScoredCocktail = {
  cocktail_id: string
  name: string
  description: string | null
  is_alcoholic: boolean
  intensity: number | null
  difficulty: string | null
  prep_time: number | null
  score: number
}

export type AggregatedIngredient = {
  ingredient_id: string
  name: string
  category: string
  is_alcoholic: boolean
  cocktail_count: number
  cocktails: string[]
  quantities: { cocktail: string; quantity: string | null; unit: string | null }[]
}

export type BarmanView = {
  cocktails: {
    id: string
    name: string
    description: string | null
    difficulty: string | null
    prep_time: number | null
    ingredients: {
      name: string
      quantity: string | null
      unit: string | null
      notes: string | null
    }[]
    steps: { step_number: number; instruction: string }[]
  }[]
  shopping_list: {
    ingredient_id: string
    name: string
    category: string
    is_alcoholic: boolean
    cocktail_count: number
    cocktails: string[]
  }[]
}

export class PartiesService {
  constructor(private db: DbService) {}

  // --- Party Sessions ---

  listSessions(
    page: number,
    pageSize: number
  ): ResultAsync<PaginatedResult<PartySession>, AppError> {
    return this.db.queryPaginated(
      (trx) =>
        trx
          .selectFrom('party_sessions')
          .select((eb) => eb.fn.countAll().as('count'))
          .where('is_active', '=', true)
          .execute(),
      (trx) =>
        trx
          .selectFrom('party_sessions')
          .selectAll()
          .where('is_active', '=', true)
          .limit(pageSize)
          .offset((page - 1) * pageSize)
          .orderBy('created_at', 'desc')
          .execute(),
      page,
      pageSize
    )
  }

  getSessionById(id: string): ResultAsync<PartySession, AppError> {
    return this.db.queryFirst(
      (db) =>
        db
          .selectFrom('party_sessions')
          .selectAll()
          .where('id', '=', id)
          .executeTakeFirst(),
      AppError.notFound('PartySession')
    )
  }

  getSessionByCode(code: string): ResultAsync<PartySession, AppError> {
    return this.db.queryFirst(
      (db) =>
        db
          .selectFrom('party_sessions')
          .selectAll()
          .where('code', '=', code)
          .executeTakeFirst(),
      AppError.notFound('PartySession')
    )
  }

  createSession(
    data: PartySessionInsert
  ): ResultAsync<PartySession, AppError> {
    return this.db.insert(
      (db) =>
        db
          .insertInto('party_sessions')
          .values({
            code: data.code,
            host_id: data.host_id,
            name: data.name,
            mode: data.mode,
            is_active: data.is_active,
            expires_at: data.expires_at,
          })
          .returningAll()
          .executeTakeFirst(),
      'Failed to create party session'
    )
  }

  updateSession(
    id: string,
    hostId: string,
    data: PartySessionUpdate
  ): ResultAsync<PartySession, AppError> {
    return this.db.update(
      (db) =>
        db
          .updateTable('party_sessions')
          .set(DbService.cleanUpdate(data))
          .where('id', '=', id)
          .where('host_id', '=', hostId)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('PartySession')
    )
  }

  deleteSession(
    id: string,
    hostId: string
  ): ResultAsync<PartySession, AppError> {
    return this.db.delete(
      (db) =>
        db
          .deleteFrom('party_sessions')
          .where('id', '=', id)
          .where('host_id', '=', hostId)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('PartySession')
    )
  }

  // --- Party Participants ---

  listParticipants(
    sessionId: string
  ): ResultAsync<PartyParticipant[], AppError> {
    return this.db.queryMany((db) =>
      db
        .selectFrom('party_participants')
        .selectAll()
        .where('session_id', '=', sessionId)
        .orderBy('created_at', 'asc')
        .execute()
    )
  }

  createParticipant(
    data: PartyParticipantInsert
  ): ResultAsync<PartyParticipant, AppError> {
    return this.db.insert(
      (db) =>
        db
          .insertInto('party_participants')
          .values({
            session_id: data.session_id,
            user_id: data.user_id,
            guest_name: data.guest_name,
            prefers_alcoholic: data.prefers_alcoholic,
            max_intensity: data.max_intensity,
          })
          .returningAll()
          .executeTakeFirst(),
      'Failed to add participant'
    )
  }

  updateParticipant(
    id: string,
    data: PartyParticipantUpdate
  ): ResultAsync<PartyParticipant, AppError> {
    return this.db.update(
      (db) =>
        db
          .updateTable('party_participants')
          .set(DbService.cleanUpdate(data))
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('PartyParticipant')
    )
  }

  deleteParticipant(
    id: string
  ): ResultAsync<PartyParticipant, AppError> {
    return this.db.delete(
      (db) =>
        db
          .deleteFrom('party_participants')
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('PartyParticipant')
    )
  }

  // --- Party Participant Styles ---

  listParticipantStyles(
    participantId: string
  ): ResultAsync<PartyParticipantStyle[], AppError> {
    return this.db.queryMany((db) =>
      db
        .selectFrom('party_participant_styles')
        .selectAll()
        .where('participant_id', '=', participantId)
        .execute()
    )
  }

  addParticipantStyle(
    data: PartyParticipantStyleInsert
  ): ResultAsync<PartyParticipantStyle, AppError> {
    return this.db.insert(
      (db) =>
        db
          .insertInto('party_participant_styles')
          .values({
            participant_id: data.participant_id,
            style_id: data.style_id,
          })
          .returningAll()
          .executeTakeFirst(),
      'Failed to add participant style'
    )
  }

  removeParticipantStyle(
    id: string
  ): ResultAsync<PartyParticipantStyle, AppError> {
    return this.db.delete(
      (db) =>
        db
          .deleteFrom('party_participant_styles')
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('PartyParticipantStyle')
    )
  }

  // --- Party Cocktail Selections ---

  listSelections(
    sessionId: string
  ): ResultAsync<PartyCocktailSelection[], AppError> {
    return this.db.queryMany((db) =>
      db
        .selectFrom('party_cocktail_selections')
        .selectAll()
        .where('session_id', '=', sessionId)
        .orderBy('vote_count', 'desc')
        .execute()
    )
  }

  createSelection(
    data: PartyCocktailSelectionInsert
  ): ResultAsync<PartyCocktailSelection, AppError> {
    return this.db.insert(
      (db) =>
        db
          .insertInto('party_cocktail_selections')
          .values({
            session_id: data.session_id,
            cocktail_id: data.cocktail_id,
            vote_count: data.vote_count,
            is_selected: data.is_selected,
          })
          .returningAll()
          .executeTakeFirst(),
      'Failed to create party selection'
    )
  }

  updateSelection(
    id: string,
    data: PartyCocktailSelectionUpdate
  ): ResultAsync<PartyCocktailSelection, AppError> {
    return this.db.update(
      (db) =>
        db
          .updateTable('party_cocktail_selections')
          .set(DbService.cleanUpdate(data))
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('PartyCocktailSelection')
    )
  }

  deleteSelection(
    id: string
  ): ResultAsync<PartyCocktailSelection, AppError> {
    return this.db.delete(
      (db) =>
        db
          .deleteFrom('party_cocktail_selections')
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst(),
      AppError.notFound('PartyCocktailSelection')
    )
  }

  // --- Soirée Mode ---

  generateRecommendations(
    sessionId: string,
    limit: number = 5
  ): ResultAsync<ScoredCocktail[], AppError> {
    const safeLimit = Math.min(Math.max(limit, 1), 20)

    return this.db.transaction(async (trx) => {
      const session = await trx
        .selectFrom('party_sessions')
        .select('id')
        .where('id', '=', sessionId)
        .where('is_active', '=', true)
        .executeTakeFirst()

      if (!session) return AppError.notFound('PartySession')

      const participants = await trx
        .selectFrom('party_participants')
        .selectAll()
        .where('session_id', '=', sessionId)
        .execute()

      if (participants.length === 0) return []

      const participantStyles = await trx
        .selectFrom('party_participant_styles')
        .selectAll()
        .where(
          'participant_id',
          'in',
          participants.map((p) => p.id)
        )
        .execute()

      const stylesByParticipant = new Map<string, Set<string>>()
      for (const ps of participantStyles) {
        const set = stylesByParticipant.get(ps.participant_id) ?? new Set()
        set.add(ps.style_id)
        stylesByParticipant.set(ps.participant_id, set)
      }

      const allPreferNonAlcoholic = participants.every(
        (p) => p.prefers_alcoholic === false
      )

      let cocktailQuery = trx
        .selectFrom('cocktails')
        .selectAll()
        .where('status', '=', 'approved')
        .where('deleted_at', 'is', null)

      if (allPreferNonAlcoholic) {
        cocktailQuery = cocktailQuery.where('is_alcoholic', '=', false)
      }

      const cocktails = await cocktailQuery.execute()

      if (cocktails.length === 0) return []

      const cocktailIds = cocktails.map((c) => c.id)

      const cocktailStyleRows = await trx
        .selectFrom('cocktail_styles_junction')
        .selectAll()
        .where('cocktail_id', 'in', cocktailIds)
        .execute()

      const stylesByCocktail = new Map<string, Set<string>>()
      for (const cs of cocktailStyleRows) {
        const set = stylesByCocktail.get(cs.cocktail_id) ?? new Set()
        set.add(cs.style_id)
        stylesByCocktail.set(cs.cocktail_id, set)
      }

      const ingredientRows = await trx
        .selectFrom('cocktail_ingredients')
        .select(['cocktail_id', 'ingredient_id'])
        .where('cocktail_id', 'in', cocktailIds)
        .execute()

      const ingredientsByCocktail = new Map<string, Set<string>>()
      for (const ci of ingredientRows) {
        const set = ingredientsByCocktail.get(ci.cocktail_id) ?? new Set()
        set.add(ci.ingredient_id)
        ingredientsByCocktail.set(ci.cocktail_id, set)
      }

      type Candidate = {
        id: string
        name: string
        description: string | null
        is_alcoholic: boolean
        main_alcohol_id: string | null
        intensity: number | null
        difficulty: string | null
        prep_time: number | null
        score: number
        ingredient_ids: Set<string>
      }

      const scored: Candidate[] = cocktails.map((c) => {
        let score = 0
        const cStyles = stylesByCocktail.get(c.id) ?? new Set<string>()

        for (const p of participants) {
          if (p.prefers_alcoholic !== null) {
            score += c.is_alcoholic === p.prefers_alcoholic ? 2 : -3
          }
          if (p.max_intensity !== null) {
            if (c.intensity === null) {
              score -= 1
            } else {
              score += c.intensity <= p.max_intensity ? 1 : -1
            }
          }
          const pStyles = stylesByParticipant.get(p.id)
          if (pStyles && pStyles.size > 0 && cStyles.size > 0) {
            let matches = 0
            for (const s of pStyles) {
              if (cStyles.has(s)) matches++
            }
            score += matches / pStyles.size
          }
        }

        return {
          id: c.id,
          name: c.name,
          description: c.description,
          is_alcoholic: c.is_alcoholic,
          main_alcohol_id: c.main_alcohol_id,
          intensity: c.intensity,
          difficulty: c.difficulty,
          prep_time: c.prep_time,
          score,
          ingredient_ids: ingredientsByCocktail.get(c.id) ?? new Set<string>(),
        }
      })

      const viable = scored.filter((c) => c.score >= 0)
      viable.sort((a, b) => b.score - a.score)
      const candidates = viable.slice(0, Math.max(safeLimit * 4, 20))
      const selected: Candidate[] = []

      while (selected.length < safeLimit && candidates.length > 0) {
        if (selected.length === 0) {
          selected.push(candidates.shift()!)
          continue
        }

        let bestIdx = 0
        let bestAdjusted = -Infinity

        for (let i = 0; i < candidates.length; i++) {
          const c = candidates[i]
          let bonus = 0
          for (const s of selected) {
            let overlap = 0
            for (const id of c.ingredient_ids) {
              if (s.ingredient_ids.has(id)) overlap++
            }
            bonus += overlap * 0.5
            if (
              c.main_alcohol_id &&
              c.main_alcohol_id === s.main_alcohol_id
            ) {
              bonus += 1
            }
          }
          const cappedBonus = Math.min(bonus, Math.max(c.score * 0.5, 1))
          const adjusted = c.score + cappedBonus
          if (adjusted > bestAdjusted) {
            bestAdjusted = adjusted
            bestIdx = i
          }
        }

        selected.push(candidates.splice(bestIdx, 1)[0])
      }

      await trx
        .deleteFrom('party_cocktail_selections')
        .where('session_id', '=', sessionId)
        .execute()

      if (selected.length > 0) {
        await trx
          .insertInto('party_cocktail_selections')
          .values(
            selected.map((c) => ({
              session_id: sessionId,
              cocktail_id: c.id,
              vote_count: 0,
              is_selected: 1,
            }))
          )
          .execute()
      }

      return selected.map((c) => ({
        cocktail_id: c.id,
        name: c.name,
        description: c.description,
        is_alcoholic: c.is_alcoholic,
        intensity: c.intensity,
        difficulty: c.difficulty,
        prep_time: c.prep_time,
        score: c.score,
      }))
    })
  }

  getAggregatedIngredients(
    sessionId: string
  ): ResultAsync<AggregatedIngredient[], AppError> {
    return this.db.query(
      async (db) => {
        const session = await db
          .selectFrom('party_sessions')
          .select('id')
          .where('id', '=', sessionId)
          .executeTakeFirst()

        if (!session) throw AppError.notFound('PartySession')

        const selections = await db
          .selectFrom('party_cocktail_selections')
          .innerJoin(
            'cocktails',
            'cocktails.id',
            'party_cocktail_selections.cocktail_id'
          )
          .select([
            'party_cocktail_selections.cocktail_id',
            'cocktails.name as cocktail_name',
          ])
          .where('party_cocktail_selections.session_id', '=', sessionId)
          .where('party_cocktail_selections.is_selected', '=', 1)
          .execute()

        if (selections.length === 0) return []

        const cocktailIds = selections.map((s) => s.cocktail_id)
        const cocktailNamesById = new Map(
          selections.map((s) => [s.cocktail_id, s.cocktail_name])
        )

        const rows = await db
          .selectFrom('cocktail_ingredients')
          .innerJoin(
            'ingredients',
            'ingredients.id',
            'cocktail_ingredients.ingredient_id'
          )
          .select([
            'ingredients.id',
            'ingredients.name',
            'ingredients.category',
            'ingredients.is_alcoholic',
            'cocktail_ingredients.cocktail_id',
            'cocktail_ingredients.quantity',
            'cocktail_ingredients.unit',
          ])
          .where('cocktail_ingredients.cocktail_id', 'in', cocktailIds)
          .execute()

        const aggregated = new Map<string, AggregatedIngredient>()
        for (const row of rows) {
          const cocktailName = cocktailNamesById.get(row.cocktail_id) ?? ''
          const existing = aggregated.get(row.id)

          if (existing) {
            existing.cocktail_count++
            existing.cocktails.push(cocktailName)
            existing.quantities.push({
              cocktail: cocktailName,
              quantity: row.quantity,
              unit: row.unit,
            })
          } else {
            aggregated.set(row.id, {
              ingredient_id: row.id,
              name: row.name,
              category: row.category,
              is_alcoholic: row.is_alcoholic,
              cocktail_count: 1,
              cocktails: [cocktailName],
              quantities: [
                {
                  cocktail: cocktailName,
                  quantity: row.quantity,
                  unit: row.unit,
                },
              ],
            })
          }
        }

        return Array.from(aggregated.values()).sort(
          (a, b) => b.cocktail_count - a.cocktail_count
        )
      },
      (e) => (e instanceof AppError ? e : AppError.databaseError())
    )
  }

  getBarmanView(sessionId: string): ResultAsync<BarmanView, AppError> {
    return this.db.query(
      async (db) => {
        const session = await db
          .selectFrom('party_sessions')
          .select('id')
          .where('id', '=', sessionId)
          .executeTakeFirst()

        if (!session) throw AppError.notFound('PartySession')

        const selections = await db
          .selectFrom('party_cocktail_selections')
          .innerJoin(
            'cocktails',
            'cocktails.id',
            'party_cocktail_selections.cocktail_id'
          )
          .select([
            'cocktails.id',
            'cocktails.name',
            'cocktails.description',
            'cocktails.difficulty',
            'cocktails.prep_time',
          ])
          .where('party_cocktail_selections.session_id', '=', sessionId)
          .where('party_cocktail_selections.is_selected', '=', 1)
          .orderBy('cocktails.name', 'asc')
          .execute()

        if (selections.length === 0) {
          return { cocktails: [], shopping_list: [] }
        }

        const cocktailIds = selections.map((s) => s.id)
        const cocktailNamesById = new Map(
          selections.map((s) => [s.id, s.name])
        )

        const ingredientRows = await db
          .selectFrom('cocktail_ingredients')
          .innerJoin(
            'ingredients',
            'ingredients.id',
            'cocktail_ingredients.ingredient_id'
          )
          .select([
            'cocktail_ingredients.cocktail_id',
            'ingredients.id',
            'ingredients.name',
            'ingredients.category',
            'ingredients.is_alcoholic',
            'cocktail_ingredients.quantity',
            'cocktail_ingredients.unit',
            'cocktail_ingredients.notes',
          ])
          .where('cocktail_ingredients.cocktail_id', 'in', cocktailIds)
          .execute()

        const stepRows = await db
          .selectFrom('preparation_steps')
          .select(['cocktail_id', 'step_number', 'instruction'])
          .where('cocktail_id', 'in', cocktailIds)
          .orderBy('step_number', 'asc')
          .execute()

        const cocktails = selections.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          difficulty: c.difficulty,
          prep_time: c.prep_time,
          ingredients: ingredientRows
            .filter((i) => i.cocktail_id === c.id)
            .map((i) => ({
              name: i.name,
              quantity: i.quantity,
              unit: i.unit,
              notes: i.notes,
            })),
          steps: stepRows
            .filter((s) => s.cocktail_id === c.id)
            .map((s) => ({
              step_number: s.step_number,
              instruction: s.instruction,
            })),
        }))

        const shoppingMap = new Map<
          string,
          BarmanView['shopping_list'][number]
        >()

        for (const row of ingredientRows) {
          const cocktailName = cocktailNamesById.get(row.cocktail_id) ?? ''
          const existing = shoppingMap.get(row.id)

          if (existing) {
            existing.cocktail_count++
            existing.cocktails.push(cocktailName)
          } else {
            shoppingMap.set(row.id, {
              ingredient_id: row.id,
              name: row.name,
              category: row.category,
              is_alcoholic: row.is_alcoholic,
              cocktail_count: 1,
              cocktails: [cocktailName],
            })
          }
        }

        const shopping_list = Array.from(shoppingMap.values()).sort(
          (a, b) => b.cocktail_count - a.cocktail_count
        )

        return { cocktails, shopping_list }
      },
      (e) => (e instanceof AppError ? e : AppError.databaseError())
    )
  }
}
