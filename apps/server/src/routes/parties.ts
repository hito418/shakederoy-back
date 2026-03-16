import { type } from 'arktype'
import { env } from 'hono/adapter'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { isAuth } from 'src/features/auth/auth.middleware'
import { errorToHttpStatus } from 'src/shared/errors'
import { dto, errResponse } from 'src/shared/response-schemas'
import {
  PartySessionSchema,
  PartySessionPaginatedSchema,
  PartyParticipantSchema,
  PartyParticipantListSchema,
  PartyParticipantStyleSchema,
  PartyParticipantStyleListSchema,
  PartyCocktailSelectionSchema,
  PartyCocktailSelectionListSchema,
} from 'src/features/parties/parties.dto'
import { Hono } from 'hono'
import { partiesService } from 'src/container'
import { provide } from 'src/shared/provide'

const partiesRoute = new Hono()
  .basePath('/parties')
  .use(provide('parties', partiesService))

// --- Sessions ---

partiesRoute
  .get(
    '/',
    describeRoute({
      tags: ['Party Sessions'],
      summary: 'List party sessions',
      description: 'Returns a paginated list of all party sessions.',
      responses: {
        200: {
          description: 'Paginated list of party sessions',
          content: {
            'application/json': {
              schema: resolver(PartySessionPaginatedSchema),
            },
          },
        },
        500: errResponse('Database error'),
      },
    }),
    validator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await ctx.get('parties').listSessions(page, pageSize)

      return result
        .andThen((data) => dto(PartySessionPaginatedSchema, data))
        .match(
          (sessions) => ctx.json(sessions, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .get(
    '/code/:code',
    describeRoute({
      tags: ['Party Sessions'],
      summary: 'Get party session by code',
      description: 'Looks up a party session by its unique join code.',
      responses: {
        200: {
          description: 'Party session found',
          content: {
            'application/json': { schema: resolver(PartySessionSchema) },
          },
        },
        404: errResponse('Party session not found'),
        500: errResponse('Database error'),
      },
    }),
    validator('param', type({ code: 'string' })),
    async (ctx) => {
      const { code } = ctx.req.valid('param')

      const result = await ctx.get('parties').getSessionByCode(code)

      return result
        .andThen((data) => dto(PartySessionSchema, data))
        .match(
          (session) => ctx.json(session, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .get(
    '/:id',
    describeRoute({
      tags: ['Party Sessions'],
      summary: 'Get party session by ID',
      description: 'Returns a single party session by its ID.',
      responses: {
        200: {
          description: 'Party session found',
          content: {
            'application/json': { schema: resolver(PartySessionSchema) },
          },
        },
        404: errResponse('Party session not found'),
        500: errResponse('Database error'),
      },
    }),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const result = await ctx.get('parties').getSessionById(id)

      return result
        .andThen((data) => dto(PartySessionSchema, data))
        .match(
          (session) => ctx.json(session, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .post(
    '/create',
    describeRoute({
      tags: ['Party Sessions'],
      summary: 'Create party session',
      description: 'Creates a new party session with a unique code and optional name and mode. The authenticated user becomes the host.',
      responses: {
        201: {
          description: 'Party session created',
          content: {
            'application/json': { schema: resolver(PartySessionSchema) },
          },
        },
        401: errResponse('Missing or invalid session cookie'),
        500: errResponse('Database error'),
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
      const { code, name, mode } = ctx.req.valid('json')
      const payload = ctx.get('userPayload')

      const result = await ctx.get('parties').createSession({
        code,
        host_id: payload.sub.id,
        name,
        mode,
      })

      return result
        .andThen((data) => dto(PartySessionSchema, data))
        .match(
          (session) => ctx.json(session, 201),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .put(
    '/:id',
    describeRoute({
      tags: ['Party Sessions'],
      summary: 'Update party session',
      description: 'Updates a party session. Only the session host can perform this action.',
      responses: {
        200: {
          description: 'Party session updated',
          content: {
            'application/json': { schema: resolver(PartySessionSchema) },
          },
        },
        401: errResponse('Missing or invalid session cookie'),
        404: errResponse('Party session not found or not owned by current user'),
        500: errResponse('Database error'),
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
      const { id } = ctx.req.valid('param')
      const { name, mode, isActive } = ctx.req.valid('json')

      const payload = ctx.get('userPayload')

      const result = await ctx.get('parties').updateSession(id, payload.sub.id, {
        name,
        mode,
        is_active: isActive,
      })

      return result
        .andThen((data) => dto(PartySessionSchema, data))
        .match(
          (session) => ctx.json(session, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .delete(
    '/:id',
    describeRoute({
      tags: ['Party Sessions'],
      summary: 'Delete party session',
      description: 'Deletes a party session. Only the session host can perform this action.',
      responses: {
        200: {
          description: 'Party session deleted',
          content: {
            'application/json': { schema: resolver(PartySessionSchema) },
          },
        },
        401: errResponse('Missing or invalid session cookie'),
        404: errResponse('Party session not found or not owned by current user'),
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const payload = ctx.get('userPayload')

      const result = await ctx.get('parties').deleteSession(id, payload.sub.id)

      return result
        .andThen((data) => dto(PartySessionSchema, data))
        .match(
          (session) => ctx.json(session, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )

  // --- Participants ---

  .get(
    '/:sessionId/participants',
    describeRoute({
      tags: ['Party Participants'],
      summary: 'List party participants',
      description: 'Returns all participants of a given party session.',
      responses: {
        200: {
          description: 'List of party participants',
          content: {
            'application/json': {
              schema: resolver(PartyParticipantListSchema),
            },
          },
        },
        500: errResponse('Database error'),
      },
    }),
    validator('param', type({ sessionId: 'string' })),
    async (ctx) => {
      const { sessionId } = ctx.req.valid('param')

      const result = await ctx.get('parties').listParticipants(sessionId)

      return result
        .andThen((data) => dto(PartyParticipantListSchema, data))
        .match(
          (participants) => ctx.json(participants, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .post(
    '/:sessionId/participants',
    describeRoute({
      tags: ['Party Participants'],
      summary: 'Add party participant',
      description: 'Adds a participant to a party session. Can be a registered user or a guest with preferences.',
      responses: {
        201: {
          description: 'Party participant added',
          content: {
            'application/json': { schema: resolver(PartyParticipantSchema) },
          },
        },
        401: errResponse('Missing or invalid session cookie'),
        500: errResponse('Database error'),
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
      const { sessionId } = ctx.req.valid('param')
      const { userId, guestName, prefersAlcoholic, maxIntensity } =
        ctx.req.valid('json')

      const result = await ctx.get('parties').createParticipant({
        session_id: sessionId,
        user_id: userId,
        guest_name: guestName,
        prefers_alcoholic: prefersAlcoholic,
        max_intensity: maxIntensity,
      })

      return result
        .andThen((data) => dto(PartyParticipantSchema, data))
        .match(
          (participant) => ctx.json(participant, 201),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .put(
    '/participants/:id',
    describeRoute({
      tags: ['Party Participants'],
      summary: 'Update party participant',
      description: 'Updates a participant\'s preferences. Requires authentication.',
      responses: {
        200: {
          description: 'Party participant updated',
          content: {
            'application/json': { schema: resolver(PartyParticipantSchema) },
          },
        },
        401: errResponse('Missing or invalid session cookie'),
        404: errResponse('Party participant not found'),
        500: errResponse('Database error'),
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
      const { id } = ctx.req.valid('param')
      const { guestName, prefersAlcoholic, maxIntensity } =
        ctx.req.valid('json')

      const result = await ctx.get('parties').updateParticipant(id, {
        guest_name: guestName,
        prefers_alcoholic: prefersAlcoholic,
        max_intensity: maxIntensity,
      })

      return result
        .andThen((data) => dto(PartyParticipantSchema, data))
        .match(
          (participant) => ctx.json(participant, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .delete(
    '/participants/:id',
    describeRoute({
      tags: ['Party Participants'],
      summary: 'Remove party participant',
      description: 'Removes a participant from a party session. Requires authentication.',
      responses: {
        200: {
          description: 'Party participant removed',
          content: {
            'application/json': { schema: resolver(PartyParticipantSchema) },
          },
        },
        401: errResponse('Missing or invalid session cookie'),
        404: errResponse('Party participant not found'),
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const result = await ctx.get('parties').deleteParticipant(id)

      return result
        .andThen((data) => dto(PartyParticipantSchema, data))
        .match(
          (participant) => ctx.json(participant, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )

  // --- Participant Styles ---

  .get(
    '/participants/:participantId/styles',
    describeRoute({
      tags: ['Participant Styles'],
      summary: 'List participant styles',
      description: 'Returns all cocktail style preferences for a given participant.',
      responses: {
        200: {
          description: 'List of participant styles',
          content: {
            'application/json': {
              schema: resolver(PartyParticipantStyleListSchema),
            },
          },
        },
        500: errResponse('Database error'),
      },
    }),
    validator('param', type({ participantId: 'string' })),
    async (ctx) => {
      const { participantId } = ctx.req.valid('param')

      const result = await ctx.get('parties').listParticipantStyles(participantId)

      return result
        .andThen((data) => dto(PartyParticipantStyleListSchema, data))
        .match(
          (styles) => ctx.json(styles, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .post(
    '/participants/:participantId/styles',
    describeRoute({
      tags: ['Participant Styles'],
      summary: 'Add participant style',
      description: 'Adds a cocktail style preference to a participant. Requires authentication.',
      responses: {
        201: {
          description: 'Participant style added',
          content: {
            'application/json': {
              schema: resolver(PartyParticipantStyleSchema),
            },
          },
        },
        401: errResponse('Missing or invalid session cookie'),
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator('param', type({ participantId: 'string' })),
    validator('json', type({ styleId: 'string' })),
    async (ctx) => {
      const { participantId } = ctx.req.valid('param')
      const { styleId } = ctx.req.valid('json')

      const result = await ctx.get('parties').addParticipantStyle({
        participant_id: participantId,
        style_id: styleId,
      })

      return result
        .andThen((data) => dto(PartyParticipantStyleSchema, data))
        .match(
          (style) => ctx.json(style, 201),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .delete(
    '/participant-styles/:id',
    describeRoute({
      tags: ['Participant Styles'],
      summary: 'Remove participant style',
      description: 'Removes a cocktail style preference from a participant. Requires authentication.',
      responses: {
        200: {
          description: 'Participant style removed',
          content: {
            'application/json': {
              schema: resolver(PartyParticipantStyleSchema),
            },
          },
        },
        401: errResponse('Missing or invalid session cookie'),
        404: errResponse('Participant style not found'),
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const result = await ctx.get('parties').removeParticipantStyle(id)

      return result
        .andThen((data) => dto(PartyParticipantStyleSchema, data))
        .match(
          (style) => ctx.json(style, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )

  // --- Cocktail Selections ---

  .get(
    '/:sessionId/selections',
    describeRoute({
      tags: ['Party Selections'],
      summary: 'List party selections',
      description: 'Returns all cocktail selections for a given party session.',
      responses: {
        200: {
          description: 'List of party selections',
          content: {
            'application/json': {
              schema: resolver(PartyCocktailSelectionListSchema),
            },
          },
        },
        500: errResponse('Database error'),
      },
    }),
    validator('param', type({ sessionId: 'string' })),
    async (ctx) => {
      const { sessionId } = ctx.req.valid('param')

      const result = await ctx.get('parties').listSelections(sessionId)

      return result
        .andThen((data) => dto(PartyCocktailSelectionListSchema, data))
        .match(
          (selections) => ctx.json(selections, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .post(
    '/:sessionId/selections',
    describeRoute({
      tags: ['Party Selections'],
      summary: 'Add party selection',
      description: 'Adds a cocktail to a party session\'s selection list with optional vote count and selection status.',
      responses: {
        201: {
          description: 'Party selection added',
          content: {
            'application/json': {
              schema: resolver(PartyCocktailSelectionSchema),
            },
          },
        },
        401: errResponse('Missing or invalid session cookie'),
        500: errResponse('Database error'),
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
      const { sessionId } = ctx.req.valid('param')
      const { cocktailId, voteCount, isSelected } = ctx.req.valid('json')

      const result = await ctx.get('parties').createSelection({
        session_id: sessionId,
        cocktail_id: cocktailId,
        vote_count: voteCount,
        is_selected: isSelected,
      })

      return result
        .andThen((data) => dto(PartyCocktailSelectionSchema, data))
        .match(
          (selection) => ctx.json(selection, 201),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .put(
    '/selections/:id',
    describeRoute({
      tags: ['Party Selections'],
      summary: 'Update party selection',
      description: 'Updates a party selection\'s vote count or selection status. Requires authentication.',
      responses: {
        200: {
          description: 'Party selection updated',
          content: {
            'application/json': {
              schema: resolver(PartyCocktailSelectionSchema),
            },
          },
        },
        401: errResponse('Missing or invalid session cookie'),
        404: errResponse('Party selection not found'),
        500: errResponse('Database error'),
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
      const { id } = ctx.req.valid('param')
      const { voteCount, isSelected } = ctx.req.valid('json')

      const result = await ctx.get('parties').updateSelection(id, {
        vote_count: voteCount,
        is_selected: isSelected,
      })

      return result
        .andThen((data) => dto(PartyCocktailSelectionSchema, data))
        .match(
          (selection) => ctx.json(selection, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )
  .delete(
    '/selections/:id',
    describeRoute({
      tags: ['Party Selections'],
      summary: 'Remove party selection',
      description: 'Removes a cocktail from a party session\'s selection list. Requires authentication.',
      responses: {
        200: {
          description: 'Party selection removed',
          content: {
            'application/json': {
              schema: resolver(PartyCocktailSelectionSchema),
            },
          },
        },
        401: errResponse('Missing or invalid session cookie'),
        404: errResponse('Party selection not found'),
        500: errResponse('Database error'),
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const result = await ctx.get('parties').deleteSelection(id)

      return result
        .andThen((data) => dto(PartyCocktailSelectionSchema, data))
        .match(
          (selection) => ctx.json(selection, 200),
          (error) =>
            ctx.json({ message: error.message }, errorToHttpStatus(error))
        )
    }
  )

export default partiesRoute
