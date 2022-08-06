import {browserTestConfig} from './vite.-common.mjs'

const config = browserTestConfig({
  input: [
    'node_modules/@flemist/test-utils/dist/lib/register/show-useragent.mjs',
    'node_modules/@flemist/test-utils/dist/lib/register/register.mjs',
    // 'src/test.test.ts',
    'src/**/*.test.ts',
  ],
  outputDir : 'dist/bundle',
  outputFile: 'browser.test.js',
  sourcemap : false, // TODO: 'inline',
  minify    : false,
})

export default config
