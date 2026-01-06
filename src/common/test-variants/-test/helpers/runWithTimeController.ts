import type { TimeControllerMock } from '@flemist/time-controller'
import { isPromiseLike, waitTimeControllerMock } from '@flemist/async-utils'
import { TestError } from './TestError'

export type AwaitResult<T> = {
  result: T | null
  thrownError: TestError | null
}

export async function runWithTimeController<T>(
  timeController: TimeControllerMock,
  func: () => T | Promise<T>,
): Promise<AwaitResult<T>> {
  let result: T | null = null
  let thrownError: TestError | null = null
  try {
    const resultPromise = func()
    if (isPromiseLike(resultPromise)) {
      result = await waitTimeControllerMock(timeController, resultPromise)
    } else {
      result = resultPromise
    }
  } catch (err) {
    if (!(err instanceof TestError)) {
      throw err
    }
    thrownError = err
  }
  return { result, thrownError }
}
