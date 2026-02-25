import { type } from 'arktype'
import { env } from 'hono/adapter'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { HonoVar } from 'src/shared/hono'
import { isAuth } from 'src/features/auth/auth.middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import { errorResponses } from 'src/shared/response-schemas'
import {
  PartySessionSchema,
  PartySessionPaginatedSchema,
  PartyParticipantSchema,
  PartyParticipantStyleSchema,
  PartyCocktailSelectionSchema,
} from 'src/features/parties/parties.dto'
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
} from 'src/features/parties/parties.service'

const partiesRoute = new HonoVar().basePath('/parties')

// --- Sessions ---

partiesRoute
  .get(
    '/',
    describeRoute({
      tags: ['Party Sessions'],
      summary: 'List party sessions',
      responses: {
        200: {
          description: 'Paginated list of party sessions',
          content: { 'application/json': { schema: resolver(PartySessionPaginatedSchema) } },
        },
        ...errorResponses,
      },
    }),
    validator('query', type({ page: 'string.numeric.parse?' })),
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
    describeRoute({
      tags: ['Party Sessions'],
      summary: 'Get party session by code',
      responses: {
        200: {
          description: 'Party session found',
          content: { 'application/json': { schema: resolver(PartySessionSchema) } },
        },
        ...errorResponses,
      },
    }),
    validator('param', type({ code: 'string' })),
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
    describeRoute({
      tags: ['Party Sessions'],
      summary: 'Get party session by ID',
      responses: {
        200: {
          description: 'Party session found',
          content: { 'application/json': { schema: resolver(PartySessionSchema) } },
        },
        ...errorResponses,
      },
    }),
    validator('param', type({ id: 'string' })),
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
    describeRoute({
      tags: ['Party Sessions'],
      summary: 'Create party session',
      responses: {
        201: {
          description: 'Party session created',
          content: { 'application/json': { schema: resolver(PartySessionSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator(
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
    describeRoute({
      tags: ['Party Sessions'],
      summary: 'Update party session',
      responses: {
        200: {
          description: 'Party session updated',
          content: { 'application/json': { schema: resolver(PartySessionSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    validator(
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
    describeRoute({
      tags: ['Party Sessions'],
      summary: 'Delete party session',
      responses: {
        200: {
          description: 'Party session deleted',
          content: { 'application/json': { schema: resolver(PartySessionSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
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
    describeRoute({
      tags: ['Party Participants'],
      summary: 'List party participants',
      responses: {
        200: {
          description: 'List of party participants',
          content: { 'application/json': { schema: resolver(PartyParticipantSchema.array()) } },
        },
        ...errorResponses,
      },
    }),
    validator('param', type({ sessionId: 'string' })),
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
    describeRoute({
      tags: ['Party Participants'],
      summary: 'Add party participant',
      responses: {
        201: {
          description: 'Party participant added',
          content: { 'application/json': { schema: resolver(PartyParticipantSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ sessionId: 'string' })),
    validator(
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
    describeRoute({
      tags: ['Party Participants'],
      summary: 'Update party participant',
      responses: {
        200: {
          description: 'Party participant updated',
          content: { 'application/json': { schema: resolver(PartyParticipantSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    validator(
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
    describeRoute({
      tags: ['Party Participants'],
      summary: 'Remove party participant',
      responses: {
        200: {
          description: 'Party participant removed',
          content: { 'application/json': { schema: resolver(PartyParticipantSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
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
    describeRoute({
      tags: ['Participant Styles'],
      summary: 'List participant styles',
      responses: {
        200: {
          description: 'List of participant styles',
          content: { 'application/json': { schema: resolver(PartyParticipantStyleSchema.array()) } },
        },
        ...errorResponses,
      },
    }),
    validator('param', type({ participantId: 'string' })),
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
    describeRoute({
      tags: ['Participant Styles'],
      summary: 'Add participant style',
      responses: {
        201: {
          description: 'Participant style added',
          content: { 'application/json': { schema: resolver(PartyParticipantStyleSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ participantId: 'string' })),
    validator('json', type({ styleId: 'string' })),
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
    describeRoute({
      tags: ['Participant Styles'],
      summary: 'Remove participant style',
      responses: {
        200: {
          description: 'Participant style removed',
          content: { 'application/json': { schema: resolver(PartyParticipantStyleSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
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
    describeRoute({
      tags: ['Party Selections'],
      summary: 'List party selections',
      responses: {
        200: {
          description: 'List of party selections',
          content: { 'application/json': { schema: resolver(PartyCocktailSelectionSchema.array()) } },
        },
        ...errorResponses,
      },
    }),
    validator('param', type({ sessionId: 'string' })),
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
    describeRoute({
      tags: ['Party Selections'],
      summary: 'Add party selection',
      responses: {
        201: {
          description: 'Party selection added',
          content: { 'application/json': { schema: resolver(PartyCocktailSelectionSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ sessionId: 'string' })),
    validator(
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
    describeRoute({
      tags: ['Party Selections'],
      summary: 'Update party selection',
      responses: {
        200: {
          description: 'Party selection updated',
          content: { 'application/json': { schema: resolver(PartyCocktailSelectionSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    validator(
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
    describeRoute({
      tags: ['Party Selections'],
      summary: 'Remove party selection',
      responses: {
        200: {
          description: 'Party selection removed',
          content: { 'application/json': { schema: resolver(PartyCocktailSelectionSchema) } },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
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
