import { resetLog } from 'src/common/helpers/log'
import { isPromiseLike } from '@flemist/async-utils'

export let logEnabled = false

export function isLogEnabled() {
  return logEnabled
}

export function runWithLogs<T>(func: () => T): T {
  logEnabled = true
  resetLog()
  try {
    const result = func()
    if (isPromiseLike(result)) {
      return result.then(
        o => {
          logEnabled = false
          return o
        },
        err => {
          logEnabled = false
          throw err
        },
      ) as any
    }
    return result
  } finally {
    logEnabled = false
  }
}
