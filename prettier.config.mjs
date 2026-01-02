// docs: https://prettier.io/docs/en/options

// /** @type {import("prettier").Config} */
const config = {
  semi: false,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'all',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  htmlWhitespaceSensitivity: 'strict',

  pluginSearchDirs: ['.'],
  // docs: https://www.npmjs.com/package/prettier-plugin-svelte
  // plugins: ['prettier-plugin-svelte'],
  // overrides: [{ files: '*.svelte', options: { parser: 'svelte' } }],
  // svelteStrictMode: false,
  // svelteAllowShorthand: true,
  // svelteSelfCloseElements: 'never',
  // svelteSelfCloseComponents: 'always',
  // svelteIndentScriptAndStyle: true,
}

export default config
