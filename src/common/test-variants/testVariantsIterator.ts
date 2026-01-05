import type { Obj } from '@flemist/simple-utils'
import type {
  VariantsIterator,
  VariantsIteratorOptions,
} from './iterator/types'

/** Creates test variants iterator with limiting capabilities */
export function testVariantsIterator<Args extends Obj>(
  _options: VariantsIteratorOptions<Args>,
): VariantsIterator<Args> {
  throw new Error('Not implemented')
}
