import {isPromiseLike, type PromiseOrValue} from '@flemist/async-utils'
import {Obj} from 'src/test-variants/types'
import {nextPrime} from 'src/test-variants/prime'

export type TestVariantsFindBestErrorOptions = {
  groupSize?: null | number
}

export type TestVariantsFindBestErrorResult = {
  index: null | number,
  args: null | Obj,
  iterations: number,
  error: any,
}

function isObject(value: any): value is object {
  return value != null && typeof value === 'object'
}

export async function testVariantsFindBestError<Args extends Obj>(
  test: (index: number, args: Args) => PromiseOrValue<any>,
  variants: Args[],
  options?: null | TestVariantsFindBestErrorOptions,
): Promise<TestVariantsFindBestErrorResult> {
  if (variants.length === 0) {
    throw new Error(`[test-variants][testVariantsFindBestError] Variants is empty`)
  }
  const groupSize = options?.groupSize ?? 1
  const countInitial = Math.ceil(variants.length / groupSize)
  let count = countInitial
  let iterations = 0
  const resultsMap = new Map<number, number | { error: any, groupIndex: number }>()

  function _test(index: number) {
    const groupIndex = resultsMap.get(index)
    if (isObject(groupIndex)) {
      return false
    }
    if ((groupIndex ?? 0) >= groupSize) {
      return true
    }
    const variantIndex = index * groupSize + (groupIndex ?? 0)
    if (variantIndex >= variants.length) {
      return true
    }
    const args = variants[variantIndex]
    try {
      const promiseOrValue = test(variantIndex, args)
      if (isPromiseLike(promiseOrValue)) {
        return promiseOrValue.then((newIterations) => {
          iterations += typeof newIterations === 'number' ? newIterations : 1
          const newGroupIndex = (groupIndex ?? 0) + 1
          resultsMap.set(index, newGroupIndex)
          return newGroupIndex >= groupSize ? true : null
        }, error => {
          resultsMap.set(index, { error, groupIndex: groupIndex ?? 0 })
          return false
        })
      }
      const newIterations = promiseOrValue
      iterations += typeof newIterations === 'number' ? newIterations : 1
      const newGroupIndex = (groupIndex ?? 0) + 1
      resultsMap.set(index, newGroupIndex)
      return newGroupIndex >= groupSize ? true : null
    }
    catch (error) {
      resultsMap.set(index, { error, groupIndex: groupIndex ?? 0 })
      return false
    }
  }

  function createResult(index: number): TestVariantsFindBestErrorResult {
    if (index >= countInitial) {
      return {
        index: null,
        args : null,
        iterations,
        error: null,
      }
    }

    const result = resultsMap.get(index)
    if (result == null || !isObject(result)) {
      throw new Error(`[test-variants][testVariantsFindBestError] Unexpected behavior. result: ${JSON.stringify(result)}`)
    }

    const variantIndex = index * groupSize + result.groupIndex
    
    return {
      index: variantIndex,
      args : variants[variantIndex],
      iterations,
      error: result.error,
    }
  }

  // For pseudo random based on prime numbers
  // this guarantees that all generated numbers will be unique until we circle back to start
  const prime = nextPrime(count >> 1)
  let index = 0
  let completedFromIndex: number | null = null

  while (true) {
    const result = await _test(index)
    if (result === false) {
      completedFromIndex = null
      count = index
      if (count === 0) {
        break
      }
    }
    else if (result === true) {
      if (completedFromIndex == null) {
        completedFromIndex = index
      }
    }
    else {
      completedFromIndex = null
    }

    index = (index + prime) % count
    // If all indices are completed and we have started to circle back, we end the loop
    if (index === completedFromIndex) {
      break
    }
  }

  return createResult(count)
}
