import { type GenerateErrorVariantFilePathOptions, type Obj } from "./types";
/** Reads saved error variant files from directory, sorted by filename descending (newest first) */
export declare function readErrorVariantFiles(dir: string): Promise<string[]>;
/** Parses saved error variant file and transforms JSON to args */
export declare function parseErrorVariantFile<Args extends Obj, SavedArgs>(filePath: string, jsonToArgs?: null | ((json: SavedArgs) => Args)): Promise<Args>;
/** Generates default error variant file path: YYYY-MM-DD_HH-mm-ss.json (UTC) */
export declare function generateErrorVariantFilePath(options: GenerateErrorVariantFilePathOptions): string;
/** Saves error-causing args to a JSON file, overwrites if file exists */
export declare function saveErrorVariantFile<Args extends Obj, SavedArgs>(args: Args, filePath: string, argsToJson?: null | ((args: Args) => string | SavedArgs)): Promise<void>;
