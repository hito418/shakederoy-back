import { type } from 'arktype'
import { env } from 'hono/adapter'
import { describeRoute, resolver, validator } from 'hono-openapi'
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
      responses: {
        200: {
          description: 'Paginated list of party sessions',
          content: {
            'application/json': {
              schema: resolver(PartySessionPaginatedSchema),
            },
          },
        },
        ...errorResponses,
      },
    }),
    validator('query', type({ page: 'string.numeric.parse?' })),
    async (ctx) => {
      const { page = 1 } = ctx.req.valid('query')
      const pageSize = Number(env(ctx).PAGE_SIZE)

      const result = await ctx.get('parties').listSessions(page, pageSize)

      return result.match(
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
      responses: {
        200: {
          description: 'Party session found',
          content: {
            'application/json': { schema: resolver(PartySessionSchema) },
          },
        },
        ...errorResponses,
      },
    }),
    validator('param', type({ code: 'string' })),
    async (ctx) => {
      const { code } = ctx.req.valid('param')

      const result = await ctx.get('parties').getSessionByCode(code)

      return result.match(
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
      responses: {
        200: {
          description: 'Party session found',
          content: {
            'application/json': { schema: resolver(PartySessionSchema) },
          },
        },
        ...errorResponses,
      },
    }),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const result = await ctx.get('parties').getSessionById(id)

      return result.match(
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
      responses: {
        201: {
          description: 'Party session created',
          content: {
            'application/json': { schema: resolver(PartySessionSchema) },
          },
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
      const { code, name, mode } = ctx.req.valid('json')
      const payload = ctx.get('userPayload')

      const result = await ctx.get('parties').createSession({
        code,
        host_id: payload.sub.id,
        name,
        mode,
      })

      return result.match(
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
      responses: {
        200: {
          description: 'Party session updated',
          content: {
            'application/json': { schema: resolver(PartySessionSchema) },
          },
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
      const { id } = ctx.req.valid('param')
      const { name, mode, isActive } = ctx.req.valid('json')

      const payload = ctx.get('userPayload')

      const result = await ctx.get('parties').updateSession(id, payload.sub.id, {
        name,
        mode,
        is_active: isActive,
      })

      return result.match(
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
      responses: {
        200: {
          description: 'Party session deleted',
          content: {
            'application/json': { schema: resolver(PartySessionSchema) },
          },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const payload = ctx.get('userPayload')

      const result = await ctx.get('parties').deleteSession(id, payload.sub.id)

      return result.match(
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
      responses: {
        200: {
          description: 'List of party participants',
          content: {
            'application/json': {
              schema: resolver(PartyParticipantSchema.array()),
            },
          },
        },
        ...errorResponses,
      },
    }),
    validator('param', type({ sessionId: 'string' })),
    async (ctx) => {
      const { sessionId } = ctx.req.valid('param')

      const result = await ctx.get('parties').listParticipants(sessionId)

      return result.match(
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
      responses: {
        201: {
          description: 'Party participant added',
          content: {
            'application/json': { schema: resolver(PartyParticipantSchema) },
          },
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

      return result.match(
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
      responses: {
        200: {
          description: 'Party participant updated',
          content: {
            'application/json': { schema: resolver(PartyParticipantSchema) },
          },
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
      const { id } = ctx.req.valid('param')
      const { guestName, prefersAlcoholic, maxIntensity } =
        ctx.req.valid('json')

      const result = await ctx.get('parties').updateParticipant(id, {
        guest_name: guestName,
        prefers_alcoholic: prefersAlcoholic,
        max_intensity: maxIntensity,
      })

      return result.match(
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
      responses: {
        200: {
          description: 'Party participant removed',
          content: {
            'application/json': { schema: resolver(PartyParticipantSchema) },
          },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const result = await ctx.get('parties').deleteParticipant(id)

      return result.match(
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
      responses: {
        200: {
          description: 'List of participant styles',
          content: {
            'application/json': {
              schema: resolver(PartyParticipantStyleSchema.array()),
            },
          },
        },
        ...errorResponses,
      },
    }),
    validator('param', type({ participantId: 'string' })),
    async (ctx) => {
      const { participantId } = ctx.req.valid('param')

      const result = await ctx.get('parties').listParticipantStyles(participantId)

      return result.match(
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
      responses: {
        201: {
          description: 'Participant style added',
          content: {
            'application/json': {
              schema: resolver(PartyParticipantStyleSchema),
            },
          },
        },
        ...errorResponses,
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

      return result.match(
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
      responses: {
        200: {
          description: 'Participant style removed',
          content: {
            'application/json': {
              schema: resolver(PartyParticipantStyleSchema),
            },
          },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const result = await ctx.get('parties').removeParticipantStyle(id)

      return result.match(
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
      responses: {
        200: {
          description: 'List of party selections',
          content: {
            'application/json': {
              schema: resolver(PartyCocktailSelectionSchema.array()),
            },
          },
        },
        ...errorResponses,
      },
    }),
    validator('param', type({ sessionId: 'string' })),
    async (ctx) => {
      const { sessionId } = ctx.req.valid('param')

      const result = await ctx.get('parties').listSelections(sessionId)

      return result.match(
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
      responses: {
        201: {
          description: 'Party selection added',
          content: {
            'application/json': {
              schema: resolver(PartyCocktailSelectionSchema),
            },
          },
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
      const { sessionId } = ctx.req.valid('param')
      const { cocktailId, voteCount, isSelected } = ctx.req.valid('json')

      const result = await ctx.get('parties').createSelection({
        session_id: sessionId,
        cocktail_id: cocktailId,
        vote_count: voteCount,
        is_selected: isSelected,
      })

      return result.match(
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
      responses: {
        200: {
          description: 'Party selection updated',
          content: {
            'application/json': {
              schema: resolver(PartyCocktailSelectionSchema),
            },
          },
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
      const { id } = ctx.req.valid('param')
      const { voteCount, isSelected } = ctx.req.valid('json')

      const result = await ctx.get('parties').updateSelection(id, {
        vote_count: voteCount,
        is_selected: isSelected,
      })

      return result.match(
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
      responses: {
        200: {
          description: 'Party selection removed',
          content: {
            'application/json': {
              schema: resolver(PartyCocktailSelectionSchema),
            },
          },
        },
        ...errorResponses,
      },
    }),
    isAuth(),
    validator('param', type({ id: 'string' })),
    async (ctx) => {
      const { id } = ctx.req.valid('param')

      const result = await ctx.get('parties').deleteSelection(id)

      return result.match(
        (selection) => ctx.json(selection, 200),
        (error) =>
          ctx.json({ message: error.message }, errorToHttpStatus(error))
      )
    }
  )

export default partiesRoute
