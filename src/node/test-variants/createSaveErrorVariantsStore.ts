import * as path from 'path'
import { isPromiseLike } from '@flemist/async-utils'
import { deepEqualJsonLike, type Obj } from '@flemist/simple-utils'
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
    const { testRun, variants, testOptions, findBestErrorEnabled } = options
    const useToFindBestError = this.options.useToFindBestError
    const attemptsPerVariant = this.options.attemptsPerVariant ?? 1

    const files = await readErrorVariantFiles(this.options.dir)
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
      for (let retry = 0; retry < attemptsPerVariant; retry++) {
        try {
          const promiseOrResult = testRun(args, 0, testOptions)
          if (isPromiseLike(promiseOrResult)) {
            await promiseOrResult
          }
        } catch (error) {
          if (useToFindBestError && findBestErrorEnabled) {
            variants.addLimit({ args, error })
            break
          } else {
            throw error
          }
        }
      }
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
