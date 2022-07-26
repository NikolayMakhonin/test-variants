import {browserTestConfig} from './vite.-common.mjs'

const config = browserTestConfig({
  input: [
    'node_modules/@flemist/test-utils/dist/lib/register/show-useragent.mjs',
    'node_modules/@flemist/test-utils/dist/lib/register/register.mjs',
    'src/**/*.test.ts',
  ],
  outputDir : 'dist/bundle',
  outputFile: 'browser.test.js',
  sourcemap : 'inline',
  minify    : false,
})

export default config
