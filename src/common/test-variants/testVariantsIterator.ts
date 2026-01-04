import type { Obj } from '@flemist/simple-utils'
import type {
  TestVariantsIterator,
  TestVariantsIteratorOptions,
} from './iterator/types'

/** Creates test variants iterator with limiting capabilities */
export function testVariantsIterator<Args extends Obj>(
  options: TestVariantsIteratorOptions<Args>,
): TestVariantsIterator<Args> {
  // TODO
}
