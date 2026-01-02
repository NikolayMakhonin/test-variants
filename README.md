[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Build Status][github-image]][github-url]
<!-- [![Test Coverage][coveralls-image]][coveralls-url] -->

# @flemist/test-variants

TypeScript library for combinatorial randomized testing - runs a test function with all possible parameter combinations

## Terms

- `test` - function being tested with different parameter combinations
- `createTestVariants` - function that creates the testVariants function
- `testVariants` - function that runs the test iterating through parameter combinations
- `variant` - specific combination of parameters for the test
- `parameter template` - object where each test parameter corresponds to an array of possible values
- `seed` - value for initializing the pseudo-random generator inside the test, for reproducibility of randomized tests
- `iteration` - single test run with a specific parameter combination
- `iterating` - traversing parameter combinations (forward, backward, random)
- `async iteration` - iteration where the test function returns Promise
- `sync iteration` - iteration where the test function returns void or a value
- `iteration mode` - method of traversing variants (forward, backward, random)
- `full pass` - when all possible variants within constraints have been used at least once (possible only for forward and backward iteration modes)
- `variant attempts` - number of test runs with the same parameter variant before moving to the next variant
- `cycle` - full pass through all parameter variants
- `best error` - error that occurred on the lexicographically smallest parameter variant, i.e., the most convenient for debugging
- `IAbortSignalFast` - interface for aborting async operations (see @flemist/abort-controller-fast)

## Public API

```ts
// Creates a function for running tests with all parameter combinations
// The test function is passed as parameter, it can be: sync, async, or hybrid
const testVariants = createTestVariants(async (
  // test parameters that will be iterated
  {
    arg1,
    arg2,
    arg3,
    seed,
  }: {
    arg1: Type1,
    arg2: Type2,
    arg3: Type3,
    // seed is generated automatically or by getSeed function,
    // can be any type: number, string, object, function, etc.
    // intended for pseudo-random generator and reproducibility of randomized tests
    seed?: number | null,
  },
  abortSignal: IAbortSignalFast,
) => {
  // test body

  // Returns: void | number | { iterationsAsync: number, iterationsSync: number }
  // Return iterationsAsync and iterationsSync if you need to count the total number
  // of async and sync iterations inside the test
  // number is equivalent to iterationsSync
})

const result = await testVariants({
  // parameter templates
  arg1: [value1, value2, value3],
  arg2: (args) => [valueA, valueB],  // args: { arg1 } - already assigned parameters
  arg3: [valueX],
})({
  // All parameters are optional
  // Missing values or null mean default value is used

  // Automatic garbage collection after N iterations or after time interval
  // Useful for preventing timeout in karma for sync tests,
  // or preventing hangs in Node.js due to Promise bugs
  GC_Iterations: number,      // default: 1000000
  GC_IterationsAsync: number, // default: 10000
  GC_Interval: number,        // default: 1000 (milliseconds)

  // Console output parameters, default: true
  log: true, // all console output parameters default
  log: boolean | {
    // message about test start
    start: boolean,           // default: true
    // every N milliseconds shows progress info and statistics
    progressInterval: number, // default: 5000 (milliseconds)
    // message about test completion
    completed: boolean,       // default: true
    // full error log with stack trace
    error: boolean,           // default: true
    // message about iteration mode change, with info about current mode
    modeChange: boolean,      // default: true
    // debug logging for internal behavior
    debug: boolean,           // default: false
  },

  // for aborting async operations inside the test
  abortSignal: IAbortSignalFast,

  // Parallel execution (for async tests)
  parallel: boolean | number, // default: 1 - no parallel
  parallel: true,             // all parallel
  parallel: 4,                // maximum 4 parallel
  parallel: false | 1,        // sequential

  // Global limits
  // Maximum total number of tests run (including attemptsPerVariant)
  limitTests: number,         // default: null - unlimited
  // Maximum total runtime of testVariants
  limitTime: number,          // default: null - unlimited, (milliseconds)
  // Test terminates if the following conditions are met for all iteration modes:
  // 1) for `forward` and `backward` - number of full passes of all variants reached cycles
  // 2) for `random` - number of picked variants reached cycles (without counting attemptsPerVariant)
  // Until these conditions are met, iteration modes will switch in a circle
  // If in the last pass any mode executed zero tests,
  // it is not counted in termination condition check
  // If none of the modes executed any test in the last pass,
  // the cycle terminates
  cycles: 3,

  // Iteration modes (variant traversal), default: forward
  // All modes preserve their current positions between mode switches,
  // so with multiple executions, they will eventually traverse all variants
  // When traversal reaches the last variant and no termination conditions are met,
  // traversal starts over
  iterationModes: [
    {
      // Lexicographic traversal of variants (like numeric counting)
      // from first (the very last argument in template)
      // to last (the very first argument in template) or until limits reached
      mode: 'forward',
      // number of tests for each variant before moving to the next variant
      attemptsPerVariant: number, // default: 1
      // maximum number of attempted full passes of all variants, before mode switch
      cycles: number,             // default: 1
      // maximum runtime before mode switch
      limitTime: number,          // default: null - unlimited, (milliseconds)
      // maximum number of tests run before mode switch (including attemptsPerVariant)
      limitTests: number,         // default: null - unlimited
    },
    {
      // Lexicographic traversal of variants in reverse order
      // from the last possible or from current constraint to the first variant
      // Same parameters as for 'forward'
      mode: 'backward',
      cycles: number,
      attemptsPerVariant: number,
      limitTime: number,
      limitTests: number,
    },
    {
      // Random traversal of variants within current constraints
      mode: 'random',
      limitTime: 10000,
      limitTests: 1000,
    },
  ],

  // Iteration modes are best used in tandem with best error search
  // Best error is the error that occurred on the lexicographically smallest variant
  // Ideally the best error will be a variant with all argument values
  // equal to the first value in the template
  // Search is performed by repeated iteration and introducing new constraints
  // when an error is found, thus the number of variants constantly decreases,
  // and tests run faster
  findBestError: {
    equals: (a, b) => boolean,
    // Additional constraint on top of the main lexicographic one
    // Specifies that each argument value must not exceed
    // the argument value of the last variant that caused an error
    limitArgOnError: boolean | Function,  // default: false
    limitArgOnError: true,                // rule applies to all arguments
    // Custom rule, whether to limit argument value
    limitArgOnError: ({
      name,          // argument name
      valueIndex,    // argument value index in template for current error
      values,        // all possible argument values in template
      maxValueIndex, // current max value index limit for this arg; null if no limit
    }) => boolean,
    // the following is equivalent to limitArgOnError: true
    limitArgOnError: () => true,

    // Option intended only for system verification
    // If true, iteration will include the last error variant
    includeErrorVariant: boolean, // default: false

    // If true, when testVariants completes, if an error was found,
    // no exception will be thrown, instead
    // all error info will be returned in the result
    dontThrowIfError: boolean, // default: false
  },

  // Seed generation for pseudo-random generator
  // Seed will be set in test parameters as seed field, even if it's null or undefined
  // This seed will be used for exact reproduction of pseudo-random behavior inside the test
  getSeed: ({ // default: null - seed disabled, not set in test arguments
    // total number of tests run
    tests,
    // number of full passes of all variants
    cycles,
    // number of repeats of current variant
    repeats,
  }) => any,
  getSeed: () => Math.random() * 0xFFFFFFFF, // example - random numeric seed

  // Saving error variants to files for subsequent checks
  // or continuing best error search
  // Before iterating all variants, saved variants from files will be checked first
  // in descending order of their save date (newest first)
  saveErrorVariants: {
    dir: './error-variants',
    // Maximum number of checks for each saved variant
    // Useful when error doesn't reproduce on first try
    // due to factors independent of parameters or random generator
    // If error is found, exception is thrown by default and testVariants terminates
    attemptsPerVariant: 1, // default: 1
    // Custom file path generation for saving variant
    // Either relative to dir folder, or absolute path
    // default: 2025-12-30_12-34-37_vw3h626wg7m.json
    getFilePath: ({ sessionDate }) => string | null,
    // Custom serialization, in case arguments are class instances
    argsToJson: (args) => string | SavedArgs,
    // Custom deserialization
    jsonToArgs: (json) => Args,
    // If true and findBestError is enabled, all files are checked,
    // all errors from them are collected and used as initial constraints for findBestError
    // Useful when you need to continue best error search after testVariants restart
    useToFindBestError: false,
  },

  // Called when an error occurs in the test
  // before logging and throwing exception
  onError: ({
    error,  // the error caught via try..catch
    args,   // test parameters that caused the error
    tests,  // number of tests run before the error (including attemptsPerVariant)
  }) => void | Promise<void>,

  // Time controller for all internal delays, timeouts and getting current time
  // Used inside testVariants instead of direct setTimeout, Date.now calls, etc
  // Intended only for testing and debugging the test-variants library itself
  timeController: ITimeController, // default: null - use timeControllerDefault
})

// Result:
{
  iterations: number,
  // Best error found during testing; set when findBestError is enabled and an error occurred
  // If dontThrowIfError is true, error is returned here instead of thrown
  bestError: null | {
    error: any, // the error caught via try..catch
    args: { // test parameters that caused the error
      arg1: Type1,
      arg2: Type2,
      arg3: Type3,
      seed?: number | null,
    },
    tests: number, // number of tests run before the error (including attemptsPerVariant)
  },
}
```

### Logs format
```
[test-variants] start, memory: 139MB
[test-variants] mode[0]: random
[test-variants] cycle: 3, variant: 65 (1.0s), tests: 615 (5.0s), async: 12, memory: 148MB (+8.8MB)
[test-variants] mode[1]: backward, limitTests=10
[test-variants] cycle: 5, variant: 65/100 (2.0s), tests: 615 (6.0s), async: 123, memory: 139MB (-8.8MB)
[test-variants] mode[2]: forward, limitTests=100, limitTime=10.9m
[test-variants] end, tests: 815 (7.0s), async: 123, memory: 138MB (-1.0MB)
...
```

# License

[Unlimited Free](LICENSE)

[npm-image]: https://img.shields.io/npm/v/@flemist/test-variants.svg
[npm-url]: https://npmjs.org/package/@flemist/test-variants
[downloads-image]: https://img.shields.io/npm/dm/@flemist/test-variants.svg
[downloads-url]: https://npmjs.org/package/@flemist/test-variants
[github-image]: https://github.com/NikolayMakhonin/test-variants/actions/workflows/test.yml/badge.svg
[github-url]: https://github.com/NikolayMakhonin/test-variants/actions
[coveralls-image]: https://coveralls.io/repos/github/NikolayMakhonin/test-variants/badge.svg
[coveralls-url]: https://coveralls.io/github/NikolayMakhonin/test-variants
