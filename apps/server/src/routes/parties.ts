import { sValidator } from '@hono/standard-validator'
import { type } from 'arktype'
import { env } from 'hono/adapter'
import { HonoVar } from 'src/shared/hono'
import { isAuth } from 'src/features/auth/middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import {
  listPartySessions,
  getPartySessionById,
  getPartySessionByCode,
  createPartySession,
  updatePartySession,
  deletePartySession,
  listPartyParticipants,
  createPartyParticipant,
  updatePartyParticipant,
  deletePartyParticipant,
  listParticipantStyles,
  addParticipantStyle,
  removeParticipantStyle,
  listPartySelections,
  createPartySelection,
  updatePartySelection,
  deletePartySelection,
} from 'src/features/parties/service'

const partiesRoute = new HonoVar().basePath('/parties')

// --- Sessions ---

partiesRoute
  .get(
    '/',
    sValidator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await listPartySessions(db, page, pageSize)

      return result.match(
        (sessions) => ctx.json(sessions, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .get(
    '/code/:code',
    sValidator('param', type({ code: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { code } = ctx.req.valid('param')

      const result = await getPartySessionByCode(db, code)

      return result.match(
        (session) => ctx.json(session, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .get(
    '/:id',
    sValidator('param', type({ id: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')

      const result = await getPartySessionById(db, id)

      return result.match(
        (session) => ctx.json(session, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .post(
    '/create',
    isAuth(),
    sValidator(
      'json',
      type({
        code: 'string >= 4',
        name: 'string?',
        mode: "'voting'|'host_picks'|'random'?",
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { code, name, mode } = ctx.req.valid('json')
      const payload = ctx.get('userPayload')

      const result = await createPartySession(db, {
        code,
        host_id: payload.sub.id,
        name,
        mode,
      })

      return result.match(
        (session) => ctx.json(session, 201),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .put(
    '/:id',
    isAuth(),
    sValidator('param', type({ id: 'string' })),
    sValidator(
      'json',
      type({
        name: 'string?',
        mode: "'voting'|'host_picks'|'random'?",
        isActive: 'boolean?',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')
      const { name, mode, isActive } = ctx.req.valid('json')

      const payload = ctx.get('userPayload')

      const result = await updatePartySession(db, id, payload.sub.id, {
        name,
        mode,
        is_active: isActive,
      })

      return result.match(
        (session) => ctx.json(session, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .delete(
    '/:id',
    isAuth(),
    sValidator('param', type({ id: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')

      const payload = ctx.get('userPayload')

      const result = await deletePartySession(db, id, payload.sub.id)

      return result.match(
        (session) => ctx.json(session, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

// --- Participants ---

  .get(
    '/:sessionId/participants',
    sValidator('param', type({ sessionId: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { sessionId } = ctx.req.valid('param')

      const result = await listPartyParticipants(db, sessionId)

      return result.match(
        (participants) => ctx.json(participants, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .post(
    '/:sessionId/participants',
    isAuth(),
    sValidator('param', type({ sessionId: 'string' })),
    sValidator(
      'json',
      type({
        userId: 'string?',
        guestName: 'string?',
        prefersAlcoholic: 'boolean?',
        maxIntensity: 'number?',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { sessionId } = ctx.req.valid('param')
      const { userId, guestName, prefersAlcoholic, maxIntensity } = ctx.req.valid('json')

      const result = await createPartyParticipant(db, {
        session_id: sessionId,
        user_id: userId,
        guest_name: guestName,
        prefers_alcoholic: prefersAlcoholic,
        max_intensity: maxIntensity,
      })

      return result.match(
        (participant) => ctx.json(participant, 201),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .put(
    '/participants/:id',
    isAuth(),
    sValidator('param', type({ id: 'string' })),
    sValidator(
      'json',
      type({
        guestName: 'string?',
        prefersAlcoholic: 'boolean?',
        maxIntensity: 'number?',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')
      const { guestName, prefersAlcoholic, maxIntensity } = ctx.req.valid('json')

      const result = await updatePartyParticipant(db, id, {
        guest_name: guestName,
        prefers_alcoholic: prefersAlcoholic,
        max_intensity: maxIntensity,
      })

      return result.match(
        (participant) => ctx.json(participant, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .delete(
    '/participants/:id',
    isAuth(),
    sValidator('param', type({ id: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')

      const result = await deletePartyParticipant(db, id)

      return result.match(
        (participant) => ctx.json(participant, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

// --- Participant Styles ---

  .get(
    '/participants/:participantId/styles',
    sValidator('param', type({ participantId: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { participantId } = ctx.req.valid('param')

      const result = await listParticipantStyles(db, participantId)

      return result.match(
        (styles) => ctx.json(styles, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .post(
    '/participants/:participantId/styles',
    isAuth(),
    sValidator('param', type({ participantId: 'string' })),
    sValidator('json', type({ styleId: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { participantId } = ctx.req.valid('param')
      const { styleId } = ctx.req.valid('json')

      const result = await addParticipantStyle(db, {
        participant_id: participantId,
        style_id: styleId,
      })

      return result.match(
        (style) => ctx.json(style, 201),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .delete(
    '/participant-styles/:id',
    isAuth(),
    sValidator('param', type({ id: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')

      const result = await removeParticipantStyle(db, id)

      return result.match(
        (style) => ctx.json(style, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

// --- Cocktail Selections ---

  .get(
    '/:sessionId/selections',
    sValidator('param', type({ sessionId: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { sessionId } = ctx.req.valid('param')

      const result = await listPartySelections(db, sessionId)

      return result.match(
        (selections) => ctx.json(selections, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .post(
    '/:sessionId/selections',
    isAuth(),
    sValidator('param', type({ sessionId: 'string' })),
    sValidator(
      'json',
      type({
        cocktailId: 'string',
        voteCount: 'number?',
        isSelected: '0 | 1?',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { sessionId } = ctx.req.valid('param')
      const { cocktailId, voteCount, isSelected } = ctx.req.valid('json')

      const result = await createPartySelection(db, {
        session_id: sessionId,
        cocktail_id: cocktailId,
        vote_count: voteCount,
        is_selected: isSelected,
      })

      return result.match(
        (selection) => ctx.json(selection, 201),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .put(
    '/selections/:id',
    isAuth(),
    sValidator('param', type({ id: 'string' })),
    sValidator(
      'json',
      type({
        voteCount: 'number?',
        isSelected: '0 | 1?',
      })
    ),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')
      const { voteCount, isSelected } = ctx.req.valid('json')

      const result = await updatePartySelection(db, id, {
        vote_count: voteCount,
        is_selected: isSelected,
      })

      return result.match(
        (selection) => ctx.json(selection, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )
  .delete(
    '/selections/:id',
    isAuth(),
    sValidator('param', type({ id: 'string' })),
    async (ctx) => {
      const db = ctx.get('database')
      const { id } = ctx.req.valid('param')

      const result = await deletePartySelection(db, id)

      return result.match(
        (selection) => ctx.json(selection, 200),
        (error) => ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

export default partiesRoute
