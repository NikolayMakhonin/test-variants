import {nodeConfig} from './vite.-common.mjs'

const config = nodeConfig({
  input    : ['src/**/*.ts'],
  outputDir: 'dist/lib',
  relative : 'src',
  outputs  : [{
    format   : 'cjs',
    extension: 'cjs',
  }, {
    format   : 'es',
    extension: 'mjs',
  }],
  sourcemap: false,
})

export default config
