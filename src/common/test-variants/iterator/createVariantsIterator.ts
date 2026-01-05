import type { Obj } from '@flemist/simple-utils'
import type { VariantsIterator, VariantsIteratorOptions } from './types'

/** Creates test variants iterator with limiting capabilities */
export function createVariantsIterator<Args extends Obj>(
  _options: VariantsIteratorOptions<Args>,
): VariantsIterator<Args> {
  throw new Error('Not implemented')
}
