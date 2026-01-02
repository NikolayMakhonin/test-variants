import { type ILocker, Locker } from '@flemist/async-utils'
import { poolRunWait } from '@flemist/time-limits'
import { poolFs } from './pools'
import { pathNormalize } from './pathNormalize'

const fileLockers = new Map<string, ILocker>()

/** Get or create locker for normalized file path */
function getFileLocker(filePath: string): ILocker {
  const normalizedPath = pathNormalize(filePath)
  let locker = fileLockers.get(normalizedPath)
  if (locker == null) {
    locker = new Locker()
    fileLockers.set(normalizedPath, locker)
  }
  return locker
}

/** @deprecated Use @flemist/simple-utils */
export type FileLockOptions<Result> = {
  filePath: string
  func: () => Promise<Result>
}

/**
 * @deprecated Use @flemist/simple-utils
 * Execute func with exclusive file access and limited parallel file operations
 */
export function fileLock<Result>(
  options: FileLockOptions<Result>,
): Promise<Result> {
  const { filePath, func } = options

  const locker = getFileLocker(filePath)
  return locker.lock(() =>
    poolRunWait({
      pool : poolFs,
      count: 1,
      func,
    }) as any)
}
