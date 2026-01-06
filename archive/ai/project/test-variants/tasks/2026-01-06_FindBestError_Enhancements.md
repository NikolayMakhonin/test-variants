# FindBestError Enhancements

## Goal

Enhance findBestError with three capabilities:

1. **useToFindBestError**: Integrate saved error variants into findBestError cycle - use them to set initial limits instead of throwing on replay

2. **limitArgOnError**: Limit per-arg indexes to find simpler error cases faster

3. **Template Extension**: Automatically extend templates with missing values from saved error variants

---

## Core Concepts

### Lexicographic Comparison

Compare error combinations like numbers: `[0,0,0,0,1,...]` < `[0,0,0,3,0,...]` because at position 3: 0 < 3

- Compare from first arg to last (leftmost = highest priority)
- First differing position determines which combination is smaller
- Used when comparing errors to decide which one "wins" as the best (earliest) error

### argLimits (INCLUSIVE Upper Bounds)

Store actual error index as the limit:
- `argLimit = 0` → only index 0 allowed (1 value)
- `argLimit = 1` → indexes 0, 1 allowed (2 values)
- `argLimit = n` → indexes 0..n allowed (n+1 values)

**Index 0 is a valid limit.** It restricts the arg to exactly one value.

### Iteration Space

Iterate all combinations where each arg index <= corresponding argLimit, EXCLUDING the exact error variant itself (by default).

Example with `argLimits = [1, 2, 3]`:
- `[1, 2, 3]` - EXCLUDED (the error itself, unless `includeErrorVariant: true`)
- `[1, 2, 4]` - EXCLUDED (exceeds limit)
- `[2, 2, 3]` - EXCLUDED (exceeds limit)
- `[1, 2, 2]` - INCLUDED
- `[0, 2, 3]` - INCLUDED
- `[0, 0, 0]` - INCLUDED

### includeErrorVariant Option

Debug option to include the error variant in iteration:
- `false` (default): Error variant is excluded - iteration stops BEFORE the error variant
- `true`: Error variant is included - iteration includes the error variant

Use this to verify that iteration correctly reaches the error combination.

Example:
```typescript
const iterator = testVariantsIterator({
  argsTemplates: { a: [0, 1, 2], b: [0, 1, 2] },
  limitArgOnError: true,
  includeErrorVariant: true, // Include error variant for debugging
})

iterator.addLimit({ args: {a: 1, b: 1}, error: new Error('error') })
// With includeErrorVariant: true, iteration yields 4 variants: (0,0), (0,1), (1,0), (1,1)
// Without it: 3 variants (stops before error): (0,0), (0,1), (1,0)
```

### Purpose

Find if there exists an error at any combination with at least one arg index smaller than current best.

### Template Extension

When saved error variants contain values no longer present in templates (e.g., user removed a value from template array), the iterator automatically extends templates with missing values instead of ignoring the saved variant.

**Problem**: Without template extension, saved variants with removed values are silently ignored, causing full iteration space search instead of constrained search.

**Solution**: Store `extraValues` per arg in iterator state. When `addLimit({args})` is called, extend templates with any missing values from saved args. These extra values are appended to template values during iteration.

**Example**:
```typescript
// Template originally had iterations: [1, 2, 10], user later removed 10
const iterator = testVariantsIterator({
  argsTemplates: {
    a: [1, 2],
    iterations: [1, 2], // 10 was removed
  },
})

// Saved error variant has iterations: 10
iterator.addLimit({args: {a: 1, iterations: 10}})

// Template extended: iterations becomes [1, 2, 10]
// Limit applies correctly, constraining search space
```

**Implementation**:
- `extraValues: (any[] | null)[]` - per-arg extra values from saved variants
- `calcTemplateValues()` - appends extraValues to template values
- `extendTemplateWithValue()` - adds missing value to extraValues if not present
- `extendTemplatesForArgs()` - extends templates for all args in saved args

---

## API

### TestVariantsIterator

```typescript
type TestVariantsIterator<Args> = {
  readonly index: number
  readonly cycleIndex: number
  readonly count: number | null
  readonly limit: { args: Args; error?: unknown } | null
  addLimit(options?: null | { args?: null | Args; index?: null | number; error?: unknown }): void
  start(): void
  next(): Args | null
}

type TestVariantsIteratorOptions<Args> = {
  argsTemplates: TestVariantsTemplates<Args>
  equals?: null | Equals
  limitArgOnError?: null | boolean | LimitArgOnError
  /** When true, error variant is included in iteration (for debugging); default false excludes it */
  includeErrorVariant?: null | boolean
  getSeed?: null | ((params: GetSeedParams) => any)
  repeatsPerVariant?: null | number
}
```

### Comparison Function

```typescript
/** Compare indexes lexicographically (like numbers: 1999 < 2000)
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
function compareLexicographic(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const ai = a[i] ?? 0
    const bi = b[i] ?? 0
    if (ai < bi) return -1
    if (ai > bi) return 1
  }
  return 0
}
```

### argLimits Update Logic

When new error is added:
1. Calculate indexes for new error args
2. Compare lexicographically with current best error's indexes
3. If new < current: replace entirely (new becomes the best, update all argLimits from new error's indexes)
4. If new >= current: reject (don't update anything)

### getMaxIndex Function

```typescript
function getMaxIndex(argLimit: number, templateLength: number): number {
  // argLimit is INCLUSIVE upper bound
  // Return exclusive upper bound for iteration
  return Math.min(argLimit + 1, templateLength)
}
```

---

## Test Example

### Template

```typescript
const argsTemplates = {
  returnReadableResolved: [false, true, null],
  dependencyFactory: [false, true],
  returnObservable: ({ dependencyFactory }) => {
    return dependencyFactory ? [true] : [false, true]
  },
  injectorInjectionsMax: [0, 1, 2, 3],
  injectorValueStoresMax: [0, 1, 2, 3],
  valueStoresMax: [0, 1, 2, 3],
  changesPerIterationMax: [0, 1],
  dependencyValueStore: [false, true],
  dependencyObservable: [false, true],
  useInjectorDefault: [false, true, null],
  injectorsMax: [1, 2, 3],
  injectorDependenciesMax: [0, 1, 2, 3],
  injectionsMax: [1, 2, 3],
  factoriesMax: [0, 1, 2, 3],
  injectorFactoriesMax: [0, 1, 2, 3],
  dependencyCountMax: [0, 1, 2, 3],
  checksPerIterationMax: [1],
  iterations: [1, 2, 10],
}
```

### Error Files

**File 1:**
```json
{
  "returnReadableResolved": false,
  "dependencyFactory": false,
  "returnObservable": false,
  "injectorInjectionsMax": 3,
  "injectorValueStoresMax": 1,
  "valueStoresMax": 2,
  "changesPerIterationMax": 1,
  "dependencyValueStore": true,
  "dependencyObservable": true,
  "useInjectorDefault": false,
  "injectorsMax": 3,
  "injectorDependenciesMax": 3,
  "injectionsMax": 2,
  "factoriesMax": 3,
  "injectorFactoriesMax": 2,
  "dependencyCountMax": 1,
  "checksPerIterationMax": 1,
  "iterations": 10
}
```
Indexes: `[0, 0, 0, 3, 1, 2, 1, 1, 1, 0, 2, 3, 1, 3, 2, 1, 0, 2]`

**File 2:**
```json
{
  "returnReadableResolved": false,
  "dependencyFactory": false,
  "returnObservable": false,
  "injectorInjectionsMax": 0,
  "injectorValueStoresMax": 1,
  "valueStoresMax": 0,
  "changesPerIterationMax": 1,
  "dependencyValueStore": false,
  "dependencyObservable": true,
  "useInjectorDefault": false,
  "injectorsMax": 3,
  "injectorDependenciesMax": 1,
  "injectionsMax": 2,
  "factoriesMax": 3,
  "injectorFactoriesMax": 3,
  "dependencyCountMax": 3,
  "checksPerIterationMax": 1,
  "iterations": 10
}
```
Indexes: `[0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 2, 1, 1, 3, 3, 3, 0, 2]`

**File 3:**
```json
{
  "returnReadableResolved": false,
  "dependencyFactory": false,
  "returnObservable": false,
  "injectorInjectionsMax": 0,
  "injectorValueStoresMax": 2,
  "valueStoresMax": 3,
  "changesPerIterationMax": 1,
  "dependencyValueStore": false,
  "dependencyObservable": true,
  "useInjectorDefault": false,
  "injectorsMax": 3,
  "injectorDependenciesMax": 1,
  "injectionsMax": 1,
  "factoriesMax": 3,
  "injectorFactoriesMax": 3,
  "dependencyCountMax": 1,
  "checksPerIterationMax": 1,
  "iterations": 10
}
```
Indexes: `[0, 0, 0, 0, 2, 3, 1, 0, 1, 0, 2, 1, 0, 3, 3, 1, 0, 2]`

### Expected Result

**Lexicographic comparison:**
- File 1 vs File 2: At position 3: 3 vs 0 → File 2 < File 1
- File 2 vs File 3: At position 4: 1 vs 2 → File 2 < File 3

**Winner: File 2** (lexicographically smallest)

**argLimits from File 2 (INCLUSIVE):**

| Arg | Index | Allowed Count |
|-----|-------|---------------|
| returnReadableResolved | 0 | 1 |
| dependencyFactory | 0 | 1 |
| returnObservable | 0 | 1 |
| injectorInjectionsMax | 0 | 1 |
| injectorValueStoresMax | 1 | 2 |
| valueStoresMax | 0 | 1 |
| changesPerIterationMax | 1 | 2 |
| dependencyValueStore | 0 | 1 |
| dependencyObservable | 1 | 2 |
| useInjectorDefault | 0 | 1 |
| injectorsMax | 2 | 3 |
| injectorDependenciesMax | 1 | 2 |
| injectionsMax | 1 | 2 |
| factoriesMax | 3 | 4 |
| injectorFactoriesMax | 3 | 4 |
| dependencyCountMax | 3 | 4 |
| checksPerIterationMax | 0 | 1 |
| iterations | 2 | 3 |

**Total:** 1×1×1×1×2×1×2×1×2×1×3×2×2×4×4×4×1×3 = **18432**

**Minus error variant:** 18432 - 1 = **18431 iterations**

### Test Code

```typescript
it('lexicographic comparison with 3 error files', async function () {
  const file1Args = {
    returnReadableResolved: false,
    dependencyFactory: false,
    returnObservable: false,
    injectorInjectionsMax: 3,
    injectorValueStoresMax: 1,
    valueStoresMax: 2,
    changesPerIterationMax: 1,
    dependencyValueStore: true,
    dependencyObservable: true,
    useInjectorDefault: false,
    injectorsMax: 3,
    injectorDependenciesMax: 3,
    injectionsMax: 2,
    factoriesMax: 3,
    injectorFactoriesMax: 2,
    dependencyCountMax: 1,
    checksPerIterationMax: 1,
    iterations: 10,
  }

  const file2Args = {
    returnReadableResolved: false,
    dependencyFactory: false,
    returnObservable: false,
    injectorInjectionsMax: 0,
    injectorValueStoresMax: 1,
    valueStoresMax: 0,
    changesPerIterationMax: 1,
    dependencyValueStore: false,
    dependencyObservable: true,
    useInjectorDefault: false,
    injectorsMax: 3,
    injectorDependenciesMax: 1,
    injectionsMax: 2,
    factoriesMax: 3,
    injectorFactoriesMax: 3,
    dependencyCountMax: 3,
    checksPerIterationMax: 1,
    iterations: 10,
  }

  const file3Args = {
    returnReadableResolved: false,
    dependencyFactory: false,
    returnObservable: false,
    injectorInjectionsMax: 0,
    injectorValueStoresMax: 2,
    valueStoresMax: 3,
    changesPerIterationMax: 1,
    dependencyValueStore: false,
    dependencyObservable: true,
    useInjectorDefault: false,
    injectorsMax: 3,
    injectorDependenciesMax: 1,
    injectionsMax: 1,
    factoriesMax: 3,
    injectorFactoriesMax: 3,
    dependencyCountMax: 1,
    checksPerIterationMax: 1,
    iterations: 10,
  }

  const iterator = testVariantsIterator({
    argsTemplates: {
      returnReadableResolved: [false, true, null],
      dependencyFactory: [false, true],
      returnObservable: ({ dependencyFactory }) => {
        return dependencyFactory ? [true] : [false, true]
      },
      injectorInjectionsMax: [0, 1, 2, 3],
      injectorValueStoresMax: [0, 1, 2, 3],
      valueStoresMax: [0, 1, 2, 3],
      changesPerIterationMax: [0, 1],
      dependencyValueStore: [false, true],
      dependencyObservable: [false, true],
      useInjectorDefault: [false, true, null],
      injectorsMax: [1, 2, 3],
      injectorDependenciesMax: [0, 1, 2, 3],
      injectionsMax: [1, 2, 3],
      factoriesMax: [0, 1, 2, 3],
      injectorFactoriesMax: [0, 1, 2, 3],
      dependencyCountMax: [0, 1, 2, 3],
      checksPerIterationMax: [1],
      iterations: [1, 2, 10],
    },
    limitArgOnError: true,
  })

  // Add all 3 files - order doesn't matter, lexicographically smallest wins
  iterator.addLimit({ args: file1Args, error: new Error('file1') })
  iterator.addLimit({ args: file2Args, error: new Error('file2') })
  iterator.addLimit({ args: file3Args, error: new Error('file3') })

  // File 2 should win (lexicographically smallest)
  assert.strictEqual((iterator.limit.error as Error).message, 'file2')

  // Iterate and count
  iterator.start()
  let count = 0
  while (iterator.next() != null) {
    count++
  }

  // 18432 total - 1 error variant = 18431
  assert.strictEqual(count, 18431)
})
```

---

## Sequential Error Reduction

When `findBestError` discovers lexicographically smaller errors across multiple cycles, argLimits must be updated correctly to reduce the iteration space.

### Scenario

1. Initial limit from saved error file: argLimits constrain iteration to 18432 variants
2. First new error found with smaller `injectorFactoriesMax` (4→2 values) and `dependencyCountMax` (4→2 values)
   - Reduction: 4x smaller → 4608 variants
3. Second new error found with smaller `injectionsMax` (2→1 values)
   - Reduction: 2x smaller → 2304 variants

### Bug Fixed

When `addLimit()` without args found a lexicographically smaller error, it updated argLimits but didn't add a pending limit. This caused subsequent cycles to use incorrect count values based on the old index space.

**Fix**: When `updateArgLimits` returns true (lexicographically smaller), add the limit to `pendingLimits`. The pending limit fires in subsequent cycles at the correct position in the constrained space, ensuring count is updated accurately.

### Test Code

```typescript
it('real findBestError scenario with saved error files and sequential reduction', async function () {
  const iterator = testVariantsIterator({
    argsTemplates: {
      returnReadableResolved   : [false, true, null],
      dependencyFactory        : [false, true],
      returnObservable         : ({dependencyFactory}) => {
        return dependencyFactory ? [true] : [false, true]
      },
      injectorInjectionsMax    : [0, 1, 2, 3],
      injectorValueStoresMax   : [0, 1, 2, 3],
      valueStoresMax           : [0, 1, 2, 3],
      changesPerIterationMax   : [0, 1],
      dependencyValueStore     : [false, true],
      dependencyObservable     : [false, true],
      useInjectorDefault       : [false, true, null],
      injectorsMax             : [1, 2, 3],
      injectorDependenciesMax  : [0, 1, 2, 3],
      injectionsMax            : [1, 2, 3],
      factoriesMax             : [0, 1, 2, 3],
      injectorFactoriesMax     : [0, 1, 2, 3],
      dependencyCountMax       : [0, 1, 2, 3],
      checksPerIterationMax    : [1],
      iterations               : [1, 2, 10],
    },
    limitArgOnError: true,
  })

  // Load three saved error files
  iterator.addLimit({ args: file1Args, error: new Error('error1') })
  iterator.addLimit({ args: file2Args, error: new Error('error2') }) // Wins
  iterator.addLimit({ args: file3Args, error: new Error('error3') })

  // Initial: 18432 - 1 = 18431 variants
  iterator.start()
  let count1 = 0
  while (iterator.next() != null) count1++
  assert.strictEqual(count1, 18431)

  // First reduction: injectorFactoriesMax 3→1, dependencyCountMax 3→1
  iterator.addLimit({ args: error4Args, error: new Error('error4') })
  iterator.start()
  let count2 = 0
  while (iterator.next() != null) count2++
  assert.strictEqual(count2, 4607) // 18432 / 4 - 1

  // Second reduction: injectionsMax 2→1
  iterator.addLimit({ args: error5Args, error: new Error('error5') })
  iterator.start()
  let count3 = 0
  while (iterator.next() != null) count3++
  assert.strictEqual(count3, 2303) // 4608 / 2 - 1
})
```

---

## Implementation Status

**COMPLETED**

### Files Modified

1. `src/test-variants/testVariantsIterator.ts`
   - Replaced component-wise comparison with lexicographic comparison (`compareLexicographic` function)
   - Changed argLimits to INCLUSIVE upper bounds (index 0 is valid, not null)
   - Added `includeErrorVariant` option for debugging
   - Fixed `addLimit()` without args to add pending limit when lexicographically smaller error found
   - Ensures correct count updates across cycles with changing argLimits
   - Added template extension: `extraValues` field, `calcTemplateValues()` updated, `extendTemplateWithValue()`, `extendTemplatesForArgs()`
   - Removed `validateStaticArgsValues()` - replaced with template extension

2. `src/test-variants/testVariantsRun.ts`
   - Added `includeErrorVariant` to `TestVariantsFindBestErrorOptions` (public API)
   - Fixed `bestError.index` computation when `includeErrorVariant` is true

3. `src/test-variants/createTestVariants.ts`
   - Pass `includeErrorVariant` from `findBestError` options to `testVariantsIterator`

4. `src/test-variants/testVariantsIterator.test.ts`
   - Added lexicographic comparison tests
   - Added 3-file test (18431 iterations)
   - Added `includeErrorVariant` tests
   - Added `addLimit() updates argLimits when lexicographically smaller error found at later index` test
   - Added `sequential error reduction like real findBestError scenario` test
   - Added `real findBestError scenario with saved error files and sequential reduction` test (full 18-param template)
   - Updated `limitArgOnError limits per-arg indexes` test to expect correct error variant exclusion
   - Updated `addLimit({args}) discards if value not in static template` → `addLimit({args}) extends template with missing value`
   - Updated `addLimit({args, index}) always applies index even if args invalid` → `addLimit({args, index}) applies both index and limit with template extension`
   - Added `addLimit({args}) extends dynamic template with missing value` test
