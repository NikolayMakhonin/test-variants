export type ObjectValue = {
  value: number
}
export type TemplateValue = number | ObjectValue
export type TemplateArray = readonly TemplateValue[]
export type TestArgs = Record<string, TemplateValue>
export type TemplateFunc = (args: TestArgs) => TemplateArray
export type Template = Record<string, TemplateArray | TemplateFunc>
export type StressTestArgs = {
  argType: 'static' | 'dynamic' | null
  argValueType: 'primitive' | 'object' | null
  argsCountMax: number
  argValuesCountMax: number
  argValueMax: number
  errorVariantIndex: 'none' | 0 | 1 | 'last' | 'after-last' | null
  retriesToErrorMax: number
  findBestError: boolean | null
  limitArgOnError: false | true | 'func' | null
  includeErrorVariant: boolean | null
  dontThrowIfError: boolean | null
  withSeed: boolean | null
  attemptsPerVariantMax: number
  completionCounts: number
  modeType: 'forward' | 'backward' | 'random' | null
  modeCyclesMax: number
  modeAttemptsMax: number
  modesCountMax: number
  withEquals: boolean | null
  parallel: number | boolean | null
  async: boolean | null
  withDelay: boolean | null
  withLog: boolean | null
  seed: number
}
