import {nodeConfig} from './vite.-common.mjs'

const config = nodeConfig({
  input    : ['src/**/*.ts'],
  outputDir: 'dist/lib',
  relative : 'src',
  format   : 'es',
  extension: 'mjs',
})

export default config
