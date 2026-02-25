import { configure } from "arktype/config";

configure({toJsonSchema:{fallback: {
  morph: (ctx) => {
    console.log(ctx)
    return {
      ...ctx.base,
      
    }
  },
  predicate: (ctx) => {
    console.log(ctx)
    return {...ctx.base}}
}}})