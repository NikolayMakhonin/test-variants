import * as fs from 'fs'
import * as path from 'path'
import {type Obj, type SaveErrorVariantsOptions} from 'src/test-variants/types'

/** Reads saved error variant files from directory, sorted by filename descending (newest first) */
export async function readErrorVariantFiles(dir: string): Promise<string[]> {
  const stat = await fs.promises.stat(dir).catch(() => null)
  if (stat == null) {
    return []
  }
  if (!stat.isDirectory()) {
    throw new Error(`[saveErrorVariants] path is not a directory: ${dir}`)
  }

  const files = await fs.promises.readdir(dir)
  const jsonFiles = files
    .filter(file => file.endsWith('.json'))
    .sort((a, b) => a > b ? -1 : a < b ? 1 : 0)

  return jsonFiles.map(file => path.join(dir, file))
}

/** Parses saved error variant file and transforms JSON to args */
export async function parseErrorVariantFile<Args extends Obj, SavedArgs>(
  filePath: string,
  jsonToArgs?: null | ((json: SavedArgs) => Args),
): Promise<Args> {
  const content = await fs.promises.readFile(filePath, 'utf-8')
  let json: SavedArgs
  try {
    json = JSON.parse(content)
  }
  catch (err) {
    throw new Error(`[saveErrorVariants] invalid JSON in file: ${filePath}`)
  }

  if (jsonToArgs) {
    try {
      return jsonToArgs(json)
    }
    catch (err) {
      throw new Error(`[saveErrorVariants] jsonToArgs failed for file: ${filePath}`)
    }
  }

  return json as unknown as Args
}

/** Generates unique filename with format YYYY-MM-DD_HH-mm-ss.json (UTC) */
async function generateUniqueFilename(dir: string): Promise<string> {
  const baseName = new Date().toISOString().substring(0, 19).replace('T', '_').replaceAll(':', '-')
  let filename = `${baseName}.json`
  let filePath = path.join(dir, filename)

  let suffix = 0
  while (await fs.promises.stat(filePath).catch(() => null) != null) {
    suffix++
    filename = `${baseName}_${suffix}.json`
    filePath = path.join(dir, filename)
  }

  return filePath
}

/** Saves error-causing args to a JSON file */
export async function saveErrorVariantFile<Args extends Obj, SavedArgs>(
  args: Args,
  options: SaveErrorVariantsOptions<Args, SavedArgs>,
): Promise<void> {
  const {dir, argsToJson} = options

  let content: string
  if (argsToJson) {
    const result = argsToJson(args)
    if (typeof result === 'string') {
      content = result
    }
    else {
      content = JSON.stringify(result, null, 2)
    }
  }
  else {
    content = JSON.stringify(args, null, 2)
  }

  await fs.promises.mkdir(dir, {recursive: true})
  const filePath = await generateUniqueFilename(dir)
  await fs.promises.writeFile(filePath, content, 'utf-8')
}
