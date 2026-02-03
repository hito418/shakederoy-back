import { defineConfig } from 'tsdown'

export default defineConfig({
  format: ['esm'],
  external: ["drizzle-orm"],
  outDir: 'dist',
  clean: true,
  dts: { sourcemap: true, emitDtsOnly: true },
  unbundle: true,
})
