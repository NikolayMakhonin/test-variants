import type { Obj } from '@flemist/simple-utils'
import type {
  VariantsIterator,
  TestVariantsIteratorOptions,
} from './iterator/types'

/** Creates test variants iterator with limiting capabilities */
export function testVariantsIterator<Args extends Obj>(
  _options: TestVariantsIteratorOptions<Args>,
): VariantsIterator<Args> {
  throw new Error('Not implemented')
}
