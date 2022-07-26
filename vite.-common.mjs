import babel from '@rollup/plugin-babel'
import path from 'path'
import { fileURLToPath } from 'url'
import multiInput from 'rollup-plugin-multi-input'
import multiEntry from '@rollup/plugin-multi-entry'
import {createFilter} from '@rollup/pluginutils'
import del from 'rollup-plugin-delete'
import inject from '@rollup/plugin-inject'
import polyfills from 'rollup-plugin-node-polyfills'
import istanbul from 'rollup-plugin-istanbul'
import nycrc from './nyc.config.mjs'
import typescript from '@rollup/plugin-typescript'
import resolve from '@rollup/plugin-node-resolve'
import tsTransformPaths from '@zerollup/ts-transform-paths'
import commonjs from '@rollup/plugin-commonjs'

// region helpers

const dirname = path.dirname(fileURLToPath(import.meta.url))

const onwarnRollup = (warning, onwarn) => {
  // prevent warn: (!) `this` has been rewritten to `undefined`
  // if ( warning.code === 'THIS_IS_UNDEFINED' ) {
  //   return false
  // }
  // if ( warning.code === 'EVAL' ) {
  //   return false
  // }
  // if ( warning.code === 'SOURCEMAP_ERROR' ) {
  //   return false
  // }
  // if ( warning.plugin === 'typescript' && /Rollup 'sourcemap' option must be set to generate source maps/.test(warning.message)) {
  //   return false
  // }

  console.warn('onwarnRollup',
    [
      `${warning.code}: ${warning.message}`,
      warning.loc && `${warning.loc.file}:${warning.loc.line}:${warning.loc.column}`,
      warning.plugin && `plugin: ${warning.plugin}`,
      warning.pluginCode && `pluginCode: ${warning.pluginCode}`,
      warning.hook && `hook: ${warning.hook}`,
      warning.frame,
    ]
      .map(o => o?.toString()?.trim())
      .filter(o => o)
      .join('\r\n') + '\r\n',
  )

  return false
}

/** @type { import('vite').ESBuildOptions } */
export const esbuildForBrowser = {
  // docs: https://esbuild.github.io/api/#target
  target: ['es6', 'chrome51', 'safari11'],
  format: 'esm',
}

/** @type { import('vite').Terser.MinifyOptions } */
export const terser = {
  module  : true,
  ecma    : 5,
  safari10: true,
  mangle  : false,
  format  : {
    comments    : false,
    max_line_len: 50,
  },
}

/** @type { import('vite').AliasOptions } */
export const alias = {
  src: path.resolve(dirname, './src'),
  '~': path.resolve(dirname),
}

/** @type { import('@rollup/plugin-typescript').CustomTransformerFactories } */
export const typeScriptDeclarationTransformers = {
  before: [
    {
      type   : 'program',
      factory: (program) => {
        return tsTransformPaths(program).before
      },
    },
  ],
  afterDeclarations: [
    {
      type   : 'program',
      factory: (program) => {
        return tsTransformPaths(program).afterDeclarations
      },
    },
  ],
}

/** @type {(opts?: { fs: boolean, crypto: boolean }) => { [key: string]: string }} */
function nodePolyfillsAliases(opts = {}) {
  // from: https://github.com/ionic-team/rollup-plugin-node-polyfills/blob/master/src/modules.ts
  const _ = 'rollup-plugin-node-polyfills/polyfills/'
  const empty = _ + 'empty.js'
  return {
    process            : _ + 'process-es6',
    buffer             : _ + 'buffer-es6',
    util               : _ + 'util',
    sys                : _ + 'util',
    events             : _ + 'events',
    stream             : _ + 'stream',
    path               : _ + 'path',
    querystring        : _ + 'qs',
    punycode           : _ + 'punycode',
    url                : _ + 'url',
    string_decoder     : _ + 'string-decoder',
    http               : _ + 'http',
    https              : _ + 'http',
    os                 : _ + 'os',
    assert             : _ + 'assert',
    constants          : _ + 'constants',
    _stream_duplex     : _ + 'readable-stream/duplex',
    _stream_passthrough: _ + 'readable-stream/passthrough',
    _stream_readable   : _ + 'readable-stream/readable',
    _stream_writable   : _ + 'readable-stream/writable',
    _stream_transform  : _ + 'readable-stream/transform',
    timers             : _ + 'timers',
    console            : _ + 'console',
    vm                 : _ + 'vm',
    zlib               : _ + 'zlib',
    tty                : _ + 'tty',
    domain             : _ + 'domain',
    // not shimmed
    dns                : empty,
    dgram              : empty,
    child_process      : empty,
    cluster            : empty,
    module             : empty,
    net                : empty,
    readline           : empty,
    repl               : empty,
    tls                : empty,
    fs                 : opts.fs
      ? _ + 'browserify-fs'
      : empty,
    crypto: opts.crypto
      ? _ + 'crypto-browserify'
      : empty,
  }
}

export const rollupPlugins = {
  /** @type {(opts?: import('@rollup/plugin-babel').RollupBabelInputPluginOptions) => import('rollup').Plugin} */
  babel: (opts = {}) => babel.default({
    configFile  : path.resolve(dirname, '.babelrc.cjs'), // enable babel for node_modules
    extensions  : ['', '.ts', '.js', '.cjs', '.mjs', '.svelte', '.html'],
    babelHelpers: 'runtime',
    exclude     : [
      // '**/node_modules/rollup*/**',
      '**/node_modules/@babel/**',
      '**/node_modules/core-js*/**',
      '**/.svelte-kit/runtime/server/**',
    ],
    ...opts,
  }),
  /** @type {(opts?: import('@rollup/plugin-typescript').RollupTypescriptPluginOptions) => import('rollup').Plugin} */
  typescript: (opts = {}) => typescript({
    declaration : false,
    transformers: typeScriptDeclarationTransformers,
    ...opts,
  }),
}

export const vitePlugins = {
  /** @type {() => import('vite').Plugin} */
  babel: () => ({
    name: 'vite-plugin-babel',
    config(config, config_env) {
      return {
        build: {
          rollupOptions: {
            plugins: [
              rollupPlugins.babel(),
            ],
          },
        },
      }
    },
  }),
  /** @type {(opts?: import('rollup-plugin-node-polyfills').NodePolyfillsOptions) => import('vite').Plugin} */
  nodePolyfills: (opts = {}) => ({
    name: 'vite-plugin-node-polyfills',
    config(config, config_env) {
      return {
        alias: {
          ...nodePolyfillsAliases(opts),
        },
        build: {
          rollupOptions: {
            plugins: [
              polyfills(opts),
            ],
          },
        },
      }
    },
  }),
}

// endregion

// region nodeConfig

/** @type {(opts: {
 *   input: import('rollup').InputOption,
 *   outputDir: string,
 *   relative: string,
 *   outputs: {
 *     format: import('rollup').ModuleFormat,
 *     extension: string,
 *   }[],
 *   sourcemap: import('rollup').OutputOptions['sourcemap'],
 * }) => import('vite').UserConfig} */
export const nodeConfig = ({
  input,
  outputDir,
  relative,
  outputs,
  sourcemap,
}) => {
  return {
    esbuild: false,
    build  : {
      emptyOutDir    : false,
      outDir         : outputDir,
      minify         : false,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      rollupOptions: {
        input,
        preserveEntrySignatures: 'exports-only',
        output                 : outputs.map(output => ({
          format        : output.format,
          exports       : 'named',
          entryFileNames: '[name].' + output.extension,
          chunkFileNames: '[name].' + output.extension,
          sourcemap,
        })),
        plugins: [
          multiInput.default({relative}),
          resolve(),
          rollupPlugins.typescript({
            sourceMap     : !!sourcemap,
            declarationDir: outputDir,
            declaration   : true,
          }),
        ],
        onwarn  : onwarnRollup,
        // external: (source) => {
        //   console.log('external: ' + source)
        //   return false
        // },
        external: createFilter([
          'src/**/*.{js,cjs,mjs}',
          /^(?!(src|~)([\\/]|$))[^\\/.:]+[^:]+$/, // all modules except aliases
        ]),
      },
    },
    resolve: {
      alias,
    },
  }
}

// endregion

// region browserConfig

/** @type {(opts: {
 *   name: string,
 *   input: string,
 *   outputDir: string,
 *   outputFile: string,
 *   formats: import('vite').LibraryFormats[],
 *   sourcemap: import('vite').UserConfig['build']['sourcemap'],
 *   useBabel: boolean,
 *   minify: import('vite').UserConfig['build']['minify'],
 * }) => import('vite').UserConfig} */
export const browserConfig = ({
  name,
  input,
  outputDir,
  outputFile,
  formats,
  sourcemap,
  useBabel,
  minify,
}) => {
  return {
    esbuild: false,
    build  : {
      minify,
      sourcemap,
      emptyOutDir: false,
      outDir     : outputDir,
      lib        : {
        name,
        entry   : path.resolve(dirname, input),
        fileName: outputFile,
        formats,
      },
      rollupOptions: {
        plugins: [
          del({ targets: path.join(outputDir, outputFile) }),
          rollupPlugins.typescript({
            sourceMap      : !!sourcemap,
            compilerOptions: {
              target: 'es5',
            },
          }),
        ],
        onwarn: onwarnRollup,
      },
    },
    resolve: {
      alias,
    },
    plugins: [
      useBabel && vitePlugins.babel(),
    ],
  }
}

// endregion

// region browserTestConfig

/** @type {(opts: {
 *   name: string,
 *   input: import('rollup').InputOption,
 *   outputDir: string,
 *   outputFile: string,
 *   sourcemap: import('vite').UserConfig['build']['sourcemap'],
 *   minify: import('vite').UserConfig['build']['minify'],
 * }) => import('vite').UserConfig} */
export const browserTestConfig = ({
  name,
  input,
  outputDir,
  outputFile,
  sourcemap,
  minify,
}) => {
  return {
    esbuild: false,
    build  : {
      minify,
      sourcemap,
      emptyOutDir  : false,
      outDir       : outputDir,
      rollupOptions: {
        input,
        output: {
          format : 'iife',
          exports: 'named',
          name,
        },
        plugins: [
          multiEntry({
            entryFileName: outputFile,
          }),
          resolve({
            browser       : true,
            preferBuiltins: false,
          }),
          commonjs({
            transformMixedEsModules: true,
          }),
          inject({
            global : path.resolve('./node_modules/rollup-plugin-node-polyfills/polyfills/global.js'),
            exclude: ['**/node_modules/rollup-plugin-node-polyfills/polyfills/global.js'],
          }),
          // polyfills(),
          rollupPlugins.typescript({
            sourceMap      : !!sourcemap,
            compilerOptions: {
              target: 'es5',
            },
          }),
          // istanbul({
          //   ...nycrc,
          // }),
          // rollupPlugins.babel(),
        ],
      },
    },
    resolve: {
      alias,
    },
    plugins: [
      vitePlugins.nodePolyfills(),
      // vitePlugins.babel(),
    ],
  }
}

// endregion
