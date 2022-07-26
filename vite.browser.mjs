import {browserConfig} from './vite.-common.mjs'

const config = browserConfig({
  name      : 'testVariants',
  input     : 'src/index.ts',
  outputDir : 'dist/bundle',
  outputFile: 'browser',
  formats   : ['iife', 'umd'],
  sourcemap : false,
  minify    : 'esbuild',
})

export default config
