import { Random } from '@flemist/simple-utils'
import { generateLimit } from './primitives'
import { StressTestArgs } from '../types'

export function generateErrorVariantIndex(
  rnd: Random,
  options: StressTestArgs,
  variantsCount: number,
): number | null {
  if (variantsCount === 0) {
    return null
  }
  if (options.errorVariantIndex === 'none') {
    return null
  }
  if (options.errorVariantIndex === 0) {
    return 0
  }
  if (options.errorVariantIndex === 1) {
    return 1
  }
  if (options.errorVariantIndex === 'last') {
    return variantsCount - 1
  }
  if (options.errorVariantIndex === 'after-last') {
    return variantsCount
  }

  return generateLimit(rnd, variantsCount)
}
