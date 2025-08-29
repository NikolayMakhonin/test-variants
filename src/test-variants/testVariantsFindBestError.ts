import {isPromiseLike, type PromiseOrValue} from '@flemist/async-utils'
import {Obj} from 'src/test-variants/types'

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
  const groupSize = options?.groupSize ?? 1
  let count = Math.ceil(variants.length / groupSize)
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
          resultsMap.set(index, (groupIndex ?? 0) + 1)
          return null
        }, error => {
          resultsMap.set(index, { error, groupIndex: variantIndex })
          return false
        })
      }
      const newIterations = promiseOrValue
      iterations += typeof newIterations === 'number' ? newIterations : 1
      resultsMap.set(index, (groupIndex ?? 0) + 1)
      return null
    }
    catch (error) {
      resultsMap.set(index, { error, groupIndex: variantIndex })
      return false
    }
  }

  function createResult(index: number | null): TestVariantsFindBestErrorResult {
    if (index == null) {
      return {
        index: null,
        args : null,
        iterations,
        error: null,
      }
    }

    const result = resultsMap.get(index)
    if (result == null || !isObject(result)) {
      throw new Error('[test-variants][testVariantsFindBestError] Unexpected behavior')
    }

    const variantIndex = index * groupSize + result.groupIndex
    
    return {
      index: variantIndex,
      args : variants[variantIndex],
      iterations,
      error: result.error,
    }
  }

  if (await _test(0) === false) {
    return createResult(0)
  }

  while (true) {
    const result = await _test(count - 1)
    if (result === true) {
      return createResult(null)
    }
    if (result === false) {
      count = count - 1
      break
    }
  }

  while (count > 0) {
    let min = 0
    let max = count - 1
    while (min + 1 < max) {
      const mid = (min + max) >> 1
      let resultOrPromise = _test(mid)
      if (isPromiseLike(resultOrPromise)) {
        resultOrPromise = await resultOrPromise
      }
      if (resultOrPromise === false) {
        max = mid
      }
      else {
        min = mid
      }
    }

    while (true) {
      const result = await _test(min)
      if (result === true) {
        return createResult(null)
      }
      if (result === false) {
        count = min
        break
      }
    }
  }

  return createResult(count)
}
