import * as path from 'path'
import {
  deepEqualJsonLike,
  isPromiseLike,
  type Obj,
} from '@flemist/simple-utils'
import { fileLock } from '@flemist/simple-utils/node'
import type {
  ArgsWithSeed,
  SaveErrorVariantsOptions,
} from 'src/common/test-variants/types'
import type {
  SaveErrorVariantsStore,
  SaveErrorVariantsStoreReplayOptions,
} from 'src/common/test-variants/run/types'
import {
  generateErrorVariantFilePath,
  parseErrorVariantFile,
  readErrorVariantFiles,
  saveErrorVariantFile,
} from './saveErrorVariants'
import { compareLexicographic } from 'src/common/test-variants/iterator/helpers/compareLexicographic'
import { getMemoryUsage } from 'src/common/test-variants/log/getMemoryUsage'
import {
  formatBytes,
  formatTestStats,
} from 'src/common/test-variants/log/format'

/** Node.js implementation of SaveErrorVariantsStore using file system */
class SaveErrorVariantsStoreNode<Args extends Obj, SavedArgs = Args>
  implements SaveErrorVariantsStore<Args>
{
  private readonly options: SaveErrorVariantsOptions<Args, SavedArgs>
  private readonly filePath: string
  private lastSavedArgs: ArgsWithSeed<Args> | null = null

  constructor(options: SaveErrorVariantsOptions<Args, SavedArgs>) {
    this.options = options
    const sessionDate = new Date()
    this.filePath = path.resolve(
      options.dir,
      options.getFilePath?.({ sessionDate }) ??
        generateErrorVariantFilePath({ sessionDate }),
    )
  }

  async save(args: ArgsWithSeed<Args>): Promise<void> {
    if (deepEqualJsonLike(args, this.lastSavedArgs)) {
      return
    }
    this.lastSavedArgs = { ...args }
    await fileLock({
      filePath: this.filePath,
      func: () =>
        saveErrorVariantFile(args, this.filePath, this.options.argsToJson),
    })
  }

  async replay(
    options: SaveErrorVariantsStoreReplayOptions<Args>,
  ): Promise<void> {
    const {
      testRun,
      variantsIterator,
      testOptions,
      findBestErrorEnabled,
      state,
      logOptions,
      timeControllerInternal,
    } = options
    const useToFindBestError = this.options.useToFindBestError
    const limitArg = this.options.limitArg ?? false
    const extendTemplates = this.options.extendTemplates ?? false
    const attemptsPerVariant = this.options.attemptsPerVariant ?? 1

    const indexesCache = new Map<ArgsWithSeed<Args>, number[] | null>()
    function getIndexes(args: ArgsWithSeed<Args>): number[] | null {
      let indexes = indexesCache.get(args)
      if (indexes === undefined) {
        // Otherwise the last file by save date will just be selected.
        // There's no point in that here.
        indexes = variantsIterator.calcIndexes(args, {
          includeLimit: false,
          limitArg,
        })
        indexesCache.set(args, indexes)
      }
      return indexes
    }

    const files = await readErrorVariantFiles(this.options.dir)
    if (files.length === 0) {
      return
    }

    const filesArgs: ArgsWithSeed<Args>[] = []
    for (
      let fileIndex = 0, filesLen = files.length;
      fileIndex < filesLen;
      fileIndex++
    ) {
      const filePath = files[fileIndex]
      const args = await parseErrorVariantFile<Args, SavedArgs>(
        filePath,
        this.options.jsonToArgs,
      )
      if (extendTemplates) {
        variantsIterator.extendTemplates(args)
      }
      if (getIndexes(args) != null) {
        filesArgs.push(args)
      } else {
        if (logOptions.replay) {
          logOptions.func(
            'replay',
            `[test-variants] replay skipped, args not in template; file: ${filePath}`,
          )
        }
      }
    }

    if (filesArgs.length === 0) {
      return
    }

    const logReplay = logOptions.replay
    const progressInterval = logOptions.replay && logOptions.progress
    const replayStartTime = timeControllerInternal.now()
    const startTests = state.tests
    const startIterationsAsync = state.iterationsAsync
    const startMemory = getMemoryUsage()

    if (logReplay) {
      let startMsg = `[test-variants] replay, files: ${filesArgs.length}/${files.length}`
      if (startMemory != null) {
        startMsg += `, memory: ${formatBytes(startMemory)}`
      }
      logOptions.func('replay', startMsg)
    }

    function compareArgs(a: ArgsWithSeed<Args>, b: ArgsWithSeed<Args>): number {
      // getIndexes returns cached non-null values since we filter before sorting
      return compareLexicographic(getIndexes(a)!, getIndexes(b)!)
    }

    // Sort by lexicographic order to replay best (smallest) variants first
    // Sorting in ES2018 preserves the order for equal elements.
    // Therefore, equal elements will still be in the order of the save date,
    // specified in the file name.
    filesArgs.sort(compareArgs)

    let prevProgressTime = replayStartTime
    let prevProgressMemory = startMemory

    for (
      let argsIndex = 0, len = filesArgs.length;
      argsIndex < len;
      argsIndex++
    ) {
      const args = filesArgs[argsIndex]
      for (let retry = 0; retry < attemptsPerVariant; retry++) {
        if (progressInterval) {
          const now = timeControllerInternal.now()
          if (now - prevProgressTime >= progressInterval) {
            prevProgressTime = now
            const elapsed = now - replayStartTime
            const stats = formatTestStats(
              state.tests - startTests,
              elapsed,
              state.maxTestDuration,
              state.iterationsAsync - startIterationsAsync,
              prevProgressMemory,
            )
            if (stats.memory != null) {
              prevProgressMemory = stats.memory
            }
            logOptions.func(
              'progress',
              `[test-variants] replay, ${stats.message}`,
            )
          }
        }

        try {
          const tests = state.tests
          state.tests++
          const promiseOrResult = testRun(args, tests, testOptions)
          if (isPromiseLike(promiseOrResult)) {
            await promiseOrResult
          }
        } catch (error) {
          if (useToFindBestError && findBestErrorEnabled) {
            variantsIterator.addLimit({
              args,
              error,
            })
            break
          }
          throw error
        }
      }
    }

    if (logReplay) {
      const elapsed = timeControllerInternal.now() - replayStartTime
      const stats = formatTestStats(
        state.tests - startTests,
        elapsed,
        state.maxTestDuration,
        state.iterationsAsync - startIterationsAsync,
        startMemory,
      )
      logOptions.func('replay', `[test-variants] replay end, ${stats.message}`)
    }
  }
}

/** Creates SaveErrorVariantsStore for Node.js environment */
export function createSaveErrorVariantsStore<
  Args extends Obj,
  SavedArgs = Args,
>(
  options: SaveErrorVariantsOptions<Args, SavedArgs>,
): SaveErrorVariantsStore<Args> {
  return new SaveErrorVariantsStoreNode(options)
}
