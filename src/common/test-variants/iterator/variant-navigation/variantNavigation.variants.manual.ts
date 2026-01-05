import { assert, describe, it } from 'vitest'
import {
  advanceVariantNavigation,
  randomVariantNavigation,
  resetVariantNavigation,
  retreatVariantNavigation,
} from 'src/common/test-variants/iterator/variant-navigation/variantNavigation'
import type { LimitArgOnError } from 'src/common'
import { createTestVariants } from '@flemist/test-variants'
import { parseLimits } from 'src/common/test-variants/iterator/variant-navigation/-test/helpers/parse'
import {
  formatIndexes,
  formatTemplatesValues,
} from 'src/common/test-variants/iterator/variant-navigation/-test/helpers/format'
import { _createVariantNavigationState } from 'src/common/test-variants/iterator/variant-navigation/-test/helpers/create'
import { checkVariantNavigationState } from 'src/common/test-variants/iterator/variant-navigation/-test/helpers/check'
import {
  collectAllVariants,
  ComplexArgs,
  createComplexState,
  funcFalse,
  funcTrue,
} from 'src/common/test-variants/iterator/variant-navigation/-test/helpers/variants'

// region complex template test

const testVariantsComplex = createTestVariants(
  ({
    extraPattern,
    limitPattern,
    setLimitAtIteration,
    limitArgOnError,
    includeErrorVariant,
    changeMethod,
  }: {
    extraPattern: string
    limitPattern: string
    setLimitAtIteration: null | number
    limitArgOnError: null | boolean | LimitArgOnError
    includeErrorVariant: boolean
    changeMethod: 'advance' | 'retreat' | 'random'
  }) => {
    const argsCount = 4
    const indexesEmpty = '_'.repeat(argsCount)
    const limitEmpty = '_'.repeat(argsCount)

    const state = createComplexState(
      extraPattern,
      limitArgOnError,
      includeErrorVariant,
    )

    // Collect all valid variants for this extraPattern
    const allVariants = collectAllVariants(extraPattern)
    const allVariantsSet = new Set(allVariants)

    // Invariant: initial state is empty
    assert.deepStrictEqual(formatIndexes(state.indexes), indexesEmpty)

    let prevIndexes: string = indexesEmpty
    let countIncrements = 0
    let countDecrements = 0
    let countEquals = 0
    let limitHit = false
    const hitVariants = new Set<string>()

    const countIterations = 256
    for (let iteration = 0; iteration < countIterations; iteration++) {
      // Set limit at specified iteration
      if (setLimitAtIteration != null && iteration === setLimitAtIteration) {
        state.argLimits = parseLimits(limitPattern)
      }

      let result: boolean
      if (changeMethod === 'advance') {
        result = advanceVariantNavigation(state)
      } else if (changeMethod === 'retreat') {
        result = retreatVariantNavigation(state)
      } else if (changeMethod === 'random') {
        result = randomVariantNavigation(state)
      } else {
        throw new Error(`Unknown changeMethod: ${changeMethod}`)
      }

      const indexes = formatIndexes(state.indexes)

      // Early check: verify state consistency after navigation
      // This catches the resetSubsequent bug where args become stale after clamping
      if (result) {
        const checkArgs: Partial<ComplexArgs> = {}
        for (let i = 0; i < argsCount; i++) {
          const argName = state.argsNames[i] as keyof ComplexArgs
          const template = state.templates.templates[argName]
          const templateValues =
            typeof template === 'function'
              ? (template as (args: ComplexArgs) => number[])(
                  checkArgs as ComplexArgs,
                )
              : (template as number[])
          const idx = state.indexes[i]
          assert.isTrue(
            idx >= 0 && idx < templateValues.length,
            `${argName}: index ${idx} out of bounds [0, ${templateValues.length})`,
          )
          const expectedVal = templateValues[idx]
          assert.strictEqual(
            state.args[argName],
            expectedVal,
            `${argName}: args[${argName}]=${state.args[argName]} but template[${idx}]=${expectedVal}`,
          )
          checkArgs[argName] = expectedVal
        }
      }

      if (result) {
        hitVariants.add(indexes)

        // Invariant: result variant is not empty
        if (indexes === indexesEmpty) {
          assert.fail(`indexes(${indexes}) === indexesEmpty(${indexesEmpty})`)
        }

        // Invariant: result variant is in allVariants (valid combination)
        if (!allVariantsSet.has(indexes)) {
          assert.fail(`indexes(${indexes}) not in allVariants`)
        }

        // Invariant: args match indexes
        for (let i = 0; i < argsCount; i++) {
          const argName = state.argsNames[i]
          const valueIndex = state.indexes[i]
          const value = state.argValues[i][valueIndex]
          assert.strictEqual(
            state.args[argName],
            value,
            `args[${argName}] !== argValues[${i}][${valueIndex}]`,
          )
        }

        // Invariant: order (advance/retreat/random)
        if (prevIndexes !== indexesEmpty) {
          if (changeMethod === 'advance') {
            if (indexes <= prevIndexes) {
              assert.fail(`indexes(${indexes}) <= prevIndexes(${prevIndexes})`)
            }
          } else if (changeMethod === 'retreat') {
            if (indexes >= prevIndexes) {
              assert.fail(`indexes(${indexes}) >= prevIndexes(${prevIndexes})`)
            }
          } else if (changeMethod === 'random') {
            if (indexes > prevIndexes) {
              countIncrements++
            } else if (indexes < prevIndexes) {
              countDecrements++
            } else {
              countEquals++
            }
          }
        }

        // Invariant: limit check
        if (setLimitAtIteration != null && iteration >= setLimitAtIteration) {
          if (limitPattern !== limitEmpty) {
            // Lexicographic limit
            if (includeErrorVariant) {
              if (indexes > limitPattern) {
                assert.fail(
                  `indexes(${indexes}) > limitPattern(${limitPattern})`,
                )
              }
              if (indexes === limitPattern) {
                limitHit = true
              }
            } else {
              if (indexes >= limitPattern) {
                assert.fail(
                  `indexes(${indexes}) >= limitPattern(${limitPattern})`,
                )
              }
            }

            // Per-arg limit (when limitArgOnError is true or funcTrue)
            if (limitArgOnError === true || limitArgOnError === funcTrue) {
              state.indexes.forEach((index, i) => {
                const limit = state.argLimits[i]
                if (limit != null && index > limit) {
                  assert.fail(
                    `index(${index}) > argLimit(${limit}) for arg${i}`,
                  )
                }
              })
            }
          }
        }
      } else {
        // Invariant: false result means empty state
        if (indexes !== indexesEmpty) {
          assert.fail(`indexes(${indexes}) !== indexesEmpty(${indexesEmpty})`)
        }
      }

      // Note: The resetSubsequent bug in retreat is covered by the dedicated test
      // 'retreat resets subsequent args when prior arg clamped'
      // A general invariant for retreat correctness is complex due to per-arg limits
      // affecting the valid position space in non-lexicographic ways

      prevIndexes = indexes
    }

    // Invariant: all variants hit when no limit (for advance/retreat, or statistically for random)
    if (setLimitAtIteration == null && changeMethod !== 'random') {
      for (const variant of allVariants) {
        if (!hitVariants.has(variant)) {
          assert.fail(`Variant ${variant} not hit`)
        }
      }
    }

    // Invariant: random produces variance
    if (
      changeMethod === 'random' &&
      countIterations > 50 &&
      (countIncrements > 5 || countDecrements > 5)
    ) {
      if (
        (countIncrements === 0 && countDecrements === 0) ||
        (countIncrements === 0 && countEquals === 0) ||
        (countDecrements === 0 && countEquals === 0)
      ) {
        assert.fail(
          `countIncrements(${countIncrements}), countDecrements(${countDecrements}), countEquals(${countEquals})`,
        )
      }
    }

    // Invariant: limit point reachable when includeErrorVariant
    if (
      setLimitAtIteration != null &&
      setLimitAtIteration < countIterations &&
      limitPattern !== limitEmpty &&
      includeErrorVariant &&
      allVariantsSet.has(limitPattern) &&
      changeMethod !== 'random' &&
      !limitHit
    ) {
      assert.fail(`limitPattern(${limitPattern}) not hit`)
    }
  },
)

// endregion

const testVariants = createTestVariants(
  ({
    valuesAsFuncs,
    valuesPattern,
    extraPattern,
    limitPattern,
    setLimitAtIteration,
    limitArgOnError,
    includeErrorVariant,
    changeMethod,
  }: {
    valuesAsFuncs: boolean
    valuesPattern: string
    extraPattern: string
    limitPattern: string
    setLimitAtIteration: null | number
    limitArgOnError: null | boolean | LimitArgOnError
    includeErrorVariant: boolean
    changeMethod: 'advance' | 'retreat' | 'random'
  }) => {
    const valuesEmpty = '_'.repeat(valuesPattern.length)
    const indexesEmpty = '_'.repeat(valuesPattern.length)
    const limitEmpty = '_'.repeat(limitPattern.length)

    const state = _createVariantNavigationState(
      valuesPattern,
      extraPattern,
      limitEmpty,
      valuesAsFuncs,
    )
    state.limitArgOnError = limitArgOnError
    state.includeErrorVariant = includeErrorVariant

    checkVariantNavigationState(state, valuesEmpty, indexesEmpty, limitEmpty)
    resetVariantNavigation(state)
    checkVariantNavigationState(state, valuesEmpty, indexesEmpty, limitEmpty)

    const maxIndexes = valuesPattern
      .split('')
      .map((o, i) => String(Number(o) + Number(extraPattern[i] || 0)))
      .join('')
    const limitNeverHit =
      setLimitAtIteration == null ||
      limitPattern > maxIndexes ||
      limitPattern
        .split('')
        .some((o, i) => o === '_' || Number(o) > Number(maxIndexes[i]))
    let prevIndexes: string = formatIndexes(state.indexes)
    let prevValues: string = formatTemplatesValues(state.argValues)
    let countIncrements = 0
    let countDecrements = 0
    let countEquals = 0
    let limitHit = false
    const notHitIndexes = valuesPattern
      .split('')
      .map(
        (o, i) =>
          new Set(
            Array.from(
              { length: Number(o) + 1 + Number(extraPattern[i] || 0) },
              (_, i) => i,
            ),
          ),
      )
    const countIterations = 256 // 4 ** 4 (values + extra)
    for (let iteration = 0; iteration < countIterations; iteration++) {
      // set limit at iteration
      if (setLimitAtIteration != null && iteration === setLimitAtIteration) {
        state.argLimits = parseLimits(limitPattern)
      }

      let result: boolean
      if (changeMethod === 'advance') {
        result = advanceVariantNavigation(state)
      } else if (changeMethod === 'retreat') {
        result = retreatVariantNavigation(state)
      } else if (changeMethod === 'random') {
        result = randomVariantNavigation(state)
      } else {
        throw new Error(`Unknown changeMethod: ${changeMethod}`)
      }

      const indexes = formatIndexes(state.indexes)
      const values = formatTemplatesValues(state.argValues)
      state.indexes.forEach((index, i) => {
        notHitIndexes[i].delete(index)
      })

      if (result) {
        if (valuesPattern !== valuesEmpty) {
          if (indexes === indexesEmpty) {
            assert.fail(`indexes(${indexes}) === indexesEmpty(${indexesEmpty})`)
          }
          if (values === valuesEmpty) {
            assert.fail(`values(${values}) === valuesEmpty(${valuesEmpty})`)
          }
        }

        // check order
        if (prevIndexes === indexesEmpty || prevValues === valuesEmpty) {
          if (prevIndexes !== indexesEmpty) {
            assert.fail(
              `prevIndexes(${prevIndexes}) !== indexesEmpty(${indexesEmpty})`,
            )
          }
          if (prevValues !== valuesEmpty) {
            assert.fail(
              `prevValues(${prevValues}) !== valuesEmpty(${valuesEmpty})`,
            )
          }
        } else {
          assert.strictEqual(values, prevValues)
          if (changeMethod === 'advance') {
            if (indexes <= prevIndexes) {
              assert.fail(`indexes(${indexes}) <= prevIndexes(${prevIndexes})`)
            }
          } else if (changeMethod === 'retreat') {
            if (indexes >= prevIndexes) {
              assert.fail(`indexes(${indexes}) >= prevIndexes(${prevIndexes})`)
            }
          } else if (changeMethod === 'random') {
            if (indexes > prevIndexes) {
              countIncrements++
            } else if (indexes < prevIndexes) {
              countDecrements++
            } else {
              countEquals++
            }
          }
        }
      } else {
        if (indexes !== indexesEmpty) {
          assert.fail(`indexes(${indexes}) !== indexesEmpty(${indexesEmpty})`)
        }
        if (values !== valuesEmpty) {
          assert.fail(`values(${values}) !== valuesEmpty(${valuesEmpty})`)
        }
      }

      // check limit
      if (setLimitAtIteration != null && iteration >= setLimitAtIteration) {
        if (limitPattern !== limitEmpty && indexes !== indexesEmpty) {
          // lexicographic limit
          if (includeErrorVariant) {
            if (indexes > limitPattern) {
              assert.fail(`indexes(${indexes}) > limitPattern(${limitPattern})`)
            }
            if (indexes === limitPattern) {
              limitHit = true
            }
          } else {
            if (indexes >= limitPattern) {
              assert.fail(
                `indexes(${indexes}) >= limitPattern(${limitPattern})`,
              )
            }
          }

          // arg limits
          if (limitArgOnError === true || limitArgOnError === funcTrue) {
            state.indexes.forEach((index, i) => {
              const limit = state.argLimits[i]
              if (limit != null && index > limit) {
                assert.fail(`index(${index}) > argLimit(${limit}) for arg${i}`)
              }
            })
          }
        }
      }

      prevIndexes = indexes
      prevValues = values
    }

    if (
      setLimitAtIteration == null &&
      (changeMethod !== 'random' || countIterations > 50)
    ) {
      notHitIndexes.forEach((set, i) => {
        if (set.size > 0) {
          assert.fail(
            `Not hit indexes for arg${i}: ${Array.from(set).join(', ')}`,
          )
        }
      })
    }

    if (
      setLimitAtIteration != null &&
      !limitNeverHit &&
      limitPattern &&
      valuesPattern >= limitPattern &&
      countIterations > setLimitAtIteration &&
      includeErrorVariant &&
      (changeMethod !== 'random' || countIterations > 50) &&
      !limitHit
    ) {
      assert.fail(`limitPattern(${limitPattern}) not hit`)
    }

    if (
      changeMethod === 'random' &&
      countIterations > 50 &&
      (countIncrements > 5 || countDecrements > 5)
    ) {
      if (
        (countIncrements === 0 && countDecrements === 0) ||
        (countIncrements === 0 && countEquals === 0) ||
        (countDecrements === 0 && countEquals === 0)
      ) {
        assert.fail(
          `countIncrements(${countIncrements}), countDecrements(${countDecrements}), countEquals(${countEquals})`,
        )
      }
    }
  },
)

describe(
  'variantNavigation variants',
  { timeout: 7 * 24 * 60 * 60 * 1000 },
  () => {
    it('variants', async () => {
      const patterns1 = ['', '0', '1', '2']
      const patterns2 = ['10', '02', '20', '12', '21', '22']
      const patternsAll = [...patterns1, ...patterns2]

      await testVariants({
        valuesAsFuncs: [false, true],
        valuesPattern: patternsAll,
        extraPattern: ({ valuesPattern }) => {
          return [
            '0'.repeat(valuesPattern.length),
            '2'.repeat(valuesPattern.length),
          ]
        },
        setLimitAtIteration: [null, 0, 1, 2],
        limitPattern: ({ setLimitAtIteration, valuesPattern }) => {
          return setLimitAtIteration == null
            ? ['_'.repeat(valuesPattern.length)]
            : valuesPattern.length === 1
              ? patterns1
              : patterns2
        },
        limitArgOnError: [null, true, false, funcTrue, funcFalse],
        includeErrorVariant: [false, true],
        changeMethod: ['advance', 'retreat', 'random'],
      })()
    })
  },
)

describe(
  'variantNavigation complex variants',
  { timeout: 7 * 24 * 60 * 60 * 1000 },
  () => {
    it('complex variants', async () => {
      // Sample limit patterns covering interesting cases:
      // - first variant, middle variants, last variant
      // - variants with dead-end branches
      // - patterns with unlimited later args to trigger resetSubsequent bug
      const limitPatterns = [
        '0000', // first possible
        '0010', // early variant
        '0102', // middle area
        '1000', // after first arg change
        '1110', // near dead end (b=2 is dead)
        '2030', // last arg area (a=2)
        '2032', // near the end
        // Patterns to trigger resetSubsequent bug:
        // When prior arg clamped, stale argValues for later args may be longer
        // than recalculated values, causing index to exceed bounds
        '1033', // a<=1 but c,d have high limits
        '0133', // b<=1 but c,d have high limits
        '1133', // a,b limited, c,d have high limits
        // Patterns with first arg unlimited to trigger resetSubsequent bug:
        // isVariantNavigationAtLimit returns false early when argLimits[0]=null,
        // preventing reset and exposing the bug when later args are clamped
        '_0__', // only b limited
        '__0_', // only c limited (exactly what the dedicated test uses)
        '___0', // only d limited
        '_00_', // b and c limited, not a
        '_0_0', // b and d limited, not a
        '__00', // c and d limited, not a
        '_1__', // b<=1, others unlimited
        '__1_', // c<=1, others unlimited
        '_11_', // b<=1, c<=1, a and d unlimited
      ]

      await testVariantsComplex({
        extraPattern: ['0000', '1111', '0202'],
        setLimitAtIteration: [null, 0, 1, 5, 10],
        limitPattern: ({ setLimitAtIteration }) => {
          return setLimitAtIteration == null ? ['____'] : limitPatterns
        },
        limitArgOnError: [null, true, false, funcTrue, funcFalse],
        includeErrorVariant: [false, true],
        changeMethod: ['advance', 'retreat', 'random'],
      })()
    })
  },
)
