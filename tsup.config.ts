import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./src/fast-check-bun-test.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  outDir: 'dist',
  noExternal: [],
  external: ['fast-check', 'bun:test'],
  esbuildOptions(options) {
    options.conditions = ['bun', 'import'];
  },
}); 