# Save Error Variants

## Initial Situation

`createTestVariants` iterates all parameter combinations and runs test function for each. When error occurs, `onError` callback is invoked. Currently there is no built-in mechanism to:
- Persist error-causing parameter combinations for later regression testing
- Replay previously failed combinations before running new test iterations

### Related Code

- `src/test-variants/createTestVariants.ts` - main entry point
- `src/test-variants/testVariantsRun.ts` - execution loop with `TestVariantsRunOptions`
- `src/test-variants/testVariantsCreateTestRun.ts` - test run wrapper with `onError` handling
- `src/test-variants/types.ts` - type definitions

### Background

User previously implemented this feature manually in test files. The new implementation should provide this as built-in functionality with proper error handling (the manual implementation silently swallowed some errors for convenience, which is unacceptable in library code).

## Goal

Add `saveErrorVariants` feature to `createTestVariants` that:
1. Persists error-causing args to JSON files for regression testing
2. Replays previously saved error variants before normal test iteration
3. Supports multiple retry attempts per variant (for flaky/random errors)

## LLM Task

Implement `saveErrorVariants` feature in `createTestVariants`

## Anchor Points

### Option Structure

```typescript
type SaveErrorVariantsOptions<Args> = {
  dir: string
  retriesPerVariant?: null | number
  argsToJson?: null | ((args: Args) => string | object)
  jsonToArgs?: null | ((json: object) => Args)
}

type TestVariantsRunOptions = {
  // ... existing options
  saveErrorVariants?: null | SaveErrorVariantsOptions<Args>
}
```

### Option Semantics

- `dir` - directory path for error variant files (required)
- `retriesPerVariant` - attempts per variant during replay (default: 1)
- `argsToJson` - transform args before JSON serialization (optional)
- `jsonToArgs` - transform parsed JSON back to args (optional)

### File Naming

- Format: `YYYY-MM-DD_HH-mm-ss.json` (OS-sortable by date-time)
- On collision: append suffix `_1`, `_2`, etc.

### Execution Flow

1. **Replay phase** (when `saveErrorVariants` enabled):
   - If `dir` doesn't exist: skip replay (no files to replay on first run)
   - Read all `.json` files from `dir`
   - Sort by filename descending (newest first)
   - For each file: run test `retriesPerVariant` times
   - On failure: throw immediately, no file writing
   - On success: continue to next file

2. **Normal iteration phase**:
   - Enumerate all parameter combinations as usual
   - On error: create `dir` if missing, write args to file immediately (prevent data loss)
   - `findBestError` works as before (unrelated to replay)

### Constraints

- Feature enabled when `saveErrorVariants` object provided
- Throw exception on any unexpected situation: invalid JSON, file read/write errors, directory access errors, invalid `argsToJson` return value, `jsonToArgs` errors, missing/invalid required params, etc.
- Never auto-delete files (regression testing purpose)
- `seed` must be preserved in saved args
- `logInterval` works same during replay
- No additional console output for replay phase
