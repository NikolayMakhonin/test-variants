import * as fs from 'fs'
import * as path from 'path'
import {type GenerateErrorVariantFilePathOptions, type Obj} from 'src/test-variants/types'

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

/** Generates default error variant file path: YYYY-MM-DD_HH-mm-ss.json (UTC) */
export function generateErrorVariantFilePath(options: GenerateErrorVariantFilePathOptions): string {
  return options.sessionDate.toISOString().substring(0, 19).replace('T', '_').replaceAll(':', '-') + '.json'
}

/** Saves error-causing args to a JSON file, overwrites if file exists */
export async function saveErrorVariantFile<Args extends Obj, SavedArgs>(
  args: Args,
  filePath: string,
  argsToJson?: null | ((args: Args) => string | SavedArgs),
): Promise<void> {
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

  await fs.promises.mkdir(path.dirname(filePath), {recursive: true})
  await fs.promises.writeFile(filePath, content, 'utf-8')
}
