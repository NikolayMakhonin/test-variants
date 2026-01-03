import type { Obj } from '@flemist/simple-utils'
import { isPromiseLike } from '@flemist/async-utils'
import type {
  TestVariantsIterator,
  SaveErrorVariantsOptions,
} from 'src/common/test-variants/types'
import type { TestVariantsTestRun } from 'src/common/test-variants/testVariantsCreateTestRun'
import {
  parseErrorVariantFile,
  readErrorVariantFiles,
} from 'src/common/test-variants/saveErrorVariants'

/** Options for replaying saved error variants */
export type ReplayErrorVariantsOptions<Args extends Obj, SavedArgs> = {
  /** Test run function */
  testRun: TestVariantsTestRun<Args>
  /** Iterator to add limits to */
  variants: TestVariantsIterator<Args>
  /** Save error variants configuration */
  saveErrorVariants: SaveErrorVariantsOptions<Args, SavedArgs>
  /** Whether to use replayed errors for findBestError mode */
  useToFindBestError?: null | boolean
  /** Whether findBestError is enabled */
  findBestErrorEnabled?: null | boolean
}

/**
 * Replay previously saved error variants before normal iteration.
 * If error occurs during replay:
 * - In findBestError mode: adds limit and continues to next file
 * - Otherwise: throws the error
 */
export async function replayErrorVariants<Args extends Obj, SavedArgs = Args>(
  options: ReplayErrorVariantsOptions<Args, SavedArgs>,
): Promise<void> {
  const {
    testRun,
    variants,
    saveErrorVariants,
    useToFindBestError,
    findBestErrorEnabled,
  } = options
  const attemptsPerVariant = saveErrorVariants.attemptsPerVariant ?? 1

  const files = await readErrorVariantFiles(saveErrorVariants.dir)
  for (
    let fileIndex = 0, filesLen = files.length;
    fileIndex < filesLen;
    fileIndex++
  ) {
    const filePath = files[fileIndex]
    const args = await parseErrorVariantFile<Args, SavedArgs>(
      filePath,
      saveErrorVariants.jsonToArgs,
    )
    for (let retry = 0; retry < attemptsPerVariant; retry++) {
      try {
        // During replay, no regular tests have run yet, so tests count is 0
        const promiseOrResult = testRun(args, 0, null as any)
        if (isPromiseLike(promiseOrResult)) {
          await promiseOrResult
        }
      } catch (error) {
        if (useToFindBestError && findBestErrorEnabled) {
          // Store as pending limit for findBestError cycle
          variants.addLimit({ args, error })
          break // Exit retry loop, continue to next file
        } else {
          throw error
        }
      }
    }
    // If no error occurred during replays, the saved variant is no longer reproducible
    // (templates may have changed) - silently skip
  }
}
