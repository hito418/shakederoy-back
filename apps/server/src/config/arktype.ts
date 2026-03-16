import { configure } from 'arktype/config'

configure({
  toJsonSchema: {
    fallback: {
      morph: (ctx) => ({
        ...ctx.base,
      }),
      predicate: (ctx) => ({ ...ctx.base }),
    },
  },
})
