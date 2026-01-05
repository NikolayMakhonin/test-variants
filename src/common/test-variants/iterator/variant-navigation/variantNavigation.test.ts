import { assert, describe, it } from 'vitest'
import {
  advanceVariantNavigation,
  createVariantNavigationState,
  randomVariantNavigation,
  resetVariantNavigation,
  retreatVariantNavigation,
} from 'src/common/test-variants/iterator/variant-navigation/variantNavigation'
import { formatState } from 'src/common/test-variants/iterator/variant-navigation/-test/helpers/format'
import { _createVariantNavigationState } from 'src/common/test-variants/iterator/variant-navigation/-test/helpers/create'
import { checkVariantNavigationState } from 'src/common/test-variants/iterator/variant-navigation/-test/helpers/check'
import { createComplexState } from 'src/common/test-variants/iterator/variant-navigation/-test/helpers/variants'

describe('advanceVariantNavigation', () => {
  it('empty', () => {
    const state = _createVariantNavigationState('', '', '')
    checkVariantNavigationState(state, '', '', '')
    assert.isFalse(advanceVariantNavigation(state))
    checkVariantNavigationState(state, '', '', '')
  })

  it('1 arg, 1 value', () => {
    const state = _createVariantNavigationState('0', '', '_')
    for (let i = 0; i < 3; i++) {
      checkVariantNavigationState(state, '_', '_', '_')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '0', '0', '_')
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '_')
      state.argLimits[0] = 0
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      state.argLimits[0] = null
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '0', '0', '_')
      state.argLimits[0] = 0
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      state.argLimits[0] = null
      resetVariantNavigation(state)
    }
  })

  it('1 arg, 3 values', () => {
    const state = _createVariantNavigationState('2', '', '_')
    for (let i = 0; i < 3; i++) {
      checkVariantNavigationState(state, '_', '_', '_')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '2', '0', '_')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '2', '1', '_')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '2', '2', '_')
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '_')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '2', '0', '_')
      resetVariantNavigation(state)
    }
  })

  it('2 arg, 2 values', () => {
    const state = _createVariantNavigationState('11', '', '__')
    for (let i = 0; i < 3; i++) {
      checkVariantNavigationState(state, '__', '__', '__')
      state.argLimits[1] = 0
      state.limitArgOnError = true
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '_0')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '10', '_0')
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '__', '__', '_0')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '_0')
      state.argLimits[0] = 0
      resetVariantNavigation(state)
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '__', '__', '00')
      state.argLimits[0] = null
      state.argLimits[1] = null
      state.limitArgOnError = null
      checkVariantNavigationState(state, '__', '__', '__')

      state.argLimits[0] = 0
      state.limitArgOnError = true
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '0_')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '01', '0_')
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '__', '__', '0_')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '0_')
      state.argLimits[1] = 0
      resetVariantNavigation(state)
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '__', '__', '00')
      state.argLimits[0] = null
      state.argLimits[1] = null
      state.limitArgOnError = null
      checkVariantNavigationState(state, '__', '__', '__')

      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '__')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '01', '__')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '10', '__')

      state.argLimits[0] = 0
      state.argLimits[1] = 1
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '__', '__', '01')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '01')
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '__', '__', '01')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '01')
      state.argLimits[0] = null
      state.argLimits[1] = null
      resetVariantNavigation(state)
      checkVariantNavigationState(state, '__', '__', '__')

      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '__')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '01', '__')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '10', '__')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '11', '__')
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '__', '__', '__')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '__')
      resetVariantNavigation(state)
    }
  })

  it('1 arg, 1 value, limit 0', () => {
    const state = _createVariantNavigationState('0', '', '0')
    for (let i = 0; i < 3; i++) {
      checkVariantNavigationState(state, '_', '_', '0')
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      resetVariantNavigation(state)
    }
  })

  it('1 arg, 2 values, limit 0', () => {
    const state = _createVariantNavigationState('1', '', '0')
    for (let i = 0; i < 3; i++) {
      checkVariantNavigationState(state, '_', '_', '0')
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      resetVariantNavigation(state)
    }
  })
})

describe('retreatVariantNavigation', () => {
  it('empty', () => {
    const state = _createVariantNavigationState('', '', '')
    checkVariantNavigationState(state, '', '', '')
    assert.isFalse(retreatVariantNavigation(state))
    checkVariantNavigationState(state, '', '', '')
  })

  it('1 arg, 1 value', () => {
    const state = _createVariantNavigationState('0', '', '_')
    for (let i = 0; i < 3; i++) {
      checkVariantNavigationState(state, '_', '_', '_')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '0', '0', '_')
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '_')
      state.argLimits[0] = 0
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      state.argLimits[0] = null
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '0', '0', '_')
      state.argLimits[0] = 0
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      state.argLimits[0] = null
      resetVariantNavigation(state)
    }
  })

  it('1 arg, 3 values', () => {
    const state = _createVariantNavigationState('2', '', '_')
    for (let i = 0; i < 3; i++) {
      checkVariantNavigationState(state, '_', '_', '_')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '2', '2', '_')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '2', '1', '_')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '2', '0', '_')
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '_')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '2', '2', '_')
      resetVariantNavigation(state)
    }
  })

  it('2 arg, 2 values', () => {
    const state = _createVariantNavigationState('11', '', '__')
    for (let i = 0; i < 3; i++) {
      checkVariantNavigationState(state, '__', '__', '__')
      state.argLimits[1] = 0
      state.limitArgOnError = true
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '10', '_0')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '_0')
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '__', '__', '_0')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '10', '_0')
      state.argLimits[0] = 0
      resetVariantNavigation(state)
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '__', '__', '00')
      state.argLimits[0] = null
      state.argLimits[1] = null
      state.limitArgOnError = null
      checkVariantNavigationState(state, '__', '__', '__')

      state.argLimits[0] = 0
      state.limitArgOnError = true
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '01', '0_')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '0_')
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '__', '__', '0_')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '01', '0_')
      state.argLimits[1] = 0
      resetVariantNavigation(state)
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '__', '__', '00')
      state.argLimits[0] = null
      state.argLimits[1] = null
      state.limitArgOnError = null
      checkVariantNavigationState(state, '__', '__', '__')

      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '11', '__')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '10', '__')

      state.argLimits[0] = 0
      state.argLimits[1] = 1
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '01')
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '__', '__', '01')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '01')
      state.argLimits[0] = null
      state.argLimits[1] = null
      resetVariantNavigation(state)
      checkVariantNavigationState(state, '__', '__', '__')

      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '11', '__')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '10', '__')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '01', '__')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '__')
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '__', '__', '__')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '11', '__')
      resetVariantNavigation(state)
    }
  })

  it('1 arg, 1 value, limit 0', () => {
    const state = _createVariantNavigationState('0', '', '0')
    for (let i = 0; i < 3; i++) {
      checkVariantNavigationState(state, '_', '_', '0')
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      resetVariantNavigation(state)
    }
  })

  it('1 arg, 2 values, limit 0', () => {
    const state = _createVariantNavigationState('1', '', '0')
    for (let i = 0; i < 3; i++) {
      checkVariantNavigationState(state, '_', '_', '0')
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      resetVariantNavigation(state)
    }
  })

  it('1 arg, 2 values, limit 1', () => {
    const state = _createVariantNavigationState('1', '', '1')
    for (let i = 0; i < 3; i++) {
      checkVariantNavigationState(state, '_', '_', '1')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '1', '0', '1')
      assert.isFalse(retreatVariantNavigation(state))
    }
    checkVariantNavigationState(state, '_', '_', '1')
  })
})

describe('randomVariantNavigation', () => {
  it('empty', () => {
    const state = _createVariantNavigationState('', '', '')
    checkVariantNavigationState(state, '', '', '')
    assert.isFalse(randomVariantNavigation(state))
    checkVariantNavigationState(state, '', '', '')
  })

  it('1 arg, 1 value', () => {
    const state = _createVariantNavigationState('0', '', '_')
    for (let i = 0; i < 3; i++) {
      checkVariantNavigationState(state, '_', '_', '_')
      assert.isTrue(randomVariantNavigation(state))
      checkVariantNavigationState(state, '0', '0', '_')
      assert.isTrue(randomVariantNavigation(state))
      checkVariantNavigationState(state, '0', '0', '_')
      assert.isTrue(randomVariantNavigation(state))
      checkVariantNavigationState(state, '0', '0', '_')
      resetVariantNavigation(state)
    }
  })

  it('1 arg, 3 values', () => {
    const state = _createVariantNavigationState('2', '', '_')

    const actualStates = new Set<string>()
    for (let i = 0; i < 10; i++) {
      checkVariantNavigationState(state, '_', '_', '_')
      for (let i = 0; i < 1000; i++) {
        assert.isTrue(randomVariantNavigation(state))
        checkVariantNavigationState(state, '2', null, '_')
        actualStates.add(formatState(state))
      }
      resetVariantNavigation(state)
    }

    assert.deepStrictEqual(
      Array.from(actualStates).sort(),
      ['2|0|_', '2|1|_', '2|2|_'],
      'actualStates',
    )
  })

  it('2 arg, 2 values', () => {
    const state = _createVariantNavigationState('11', '', '__')
    // For test random navigation
    const sequences = new Set<string>()

    const actualStates = new Set<string>()
    for (let i = 0; i < 20; i++) {
      checkVariantNavigationState(state, '__', '__', '__')
      for (let i = 0; i < 1000; i++) {
        assert.isTrue(randomVariantNavigation(state))
        checkVariantNavigationState(state, '11', null, '__')
        actualStates.add(formatState(state))
      }
      resetVariantNavigation(state)

      const sequence = Array.from(actualStates).join(',')
      sequences.add(sequence)

      assert.deepStrictEqual(
        Array.from(actualStates).sort(),
        ['11|00|__', '11|01|__', '11|10|__', '11|11|__'],
        'actualStates',
      )
      actualStates.clear()
    }

    assert.isAbove(
      sequences.size,
      3,
      `navigation is not random:\n${Array.from(sequences).join('\n')}`,
    )
  })
})

describe('variantNavigation complex', () => {
  it('values as complex funcs', () => {
    const state = createVariantNavigationState(
      {
        a: [1, 2],
        b: ({ a }) => (a % 2 === 0 ? [] : [3, 4]),
        c: ({ b }) => (b % 2 === 1 ? [5, 6] : [7, 8, 9]),
      },
      null,
      null,
      false,
    )
    const advanceStates = new Set<string>()
    const retreatStates = new Set<string>()
    const randomStates = new Set<string>()
    while (advanceVariantNavigation(state)) {
      advanceStates.add(formatState(state))
    }
    resetVariantNavigation(state)
    while (retreatVariantNavigation(state)) {
      retreatStates.add(formatState(state))
    }
    resetVariantNavigation(state)
    for (let i = 0; i < 1000; i++) {
      const result = randomVariantNavigation(state)
      if (result) {
        randomStates.add(formatState(state))
      }
    }

    assert.deepStrictEqual(
      Array.from(advanceStates),
      Array.from(retreatStates).reverse(),
    )
    assert.deepStrictEqual(
      Array.from(randomStates).sort(),
      Array.from(advanceStates).sort(),
    )

    console.log('advanceStates:', Array.from(advanceStates))
    console.log('retreatStates:', Array.from(retreatStates))
    console.log('randomStates:', Array.from(randomStates))
  })

  // Test for resetSubsequent bug in retreatVariantNavigation (line 306)
  // When an arg is clamped in first loop, resetSubsequent should be set to true
  // so subsequent args are also set to maxIndex. Without it, the second loop
  // may skip valid positions.
  //
  // Scenario: [1, 1, 1, 0] with limit c<=0
  // - c=1 exceeds limit, gets clamped to 0
  // - Without resetSubsequent: d stays at 0, second loop backtracks to b
  //   giving [1, 0, 0, 2] which skips valid position [1, 1, 0, 0]
  // - With resetSubsequent: d is set to maxIndex=1 (stale argValues),
  //   second loop decrements d giving [1, 1, 0, 0] which is correct
  it('retreat resets subsequent args when prior arg clamped', () => {
    const state = createComplexState('0000', true, false)

    // Navigate to position [1, 1, 1, 0]
    // a=1: b can be [0,1,2]
    // a=1, b=1: c can be [0,1]
    // b=1, c=1: sum=2, d can be [0,1]
    // So [1, 1, 1, 0] is valid
    while (retreatVariantNavigation(state)) {
      if (
        state.indexes[0] === 1 &&
        state.indexes[1] === 1 &&
        state.indexes[2] === 1 &&
        state.indexes[3] === 0
      ) {
        break
      }
    }

    assert.deepStrictEqual(
      [...state.indexes],
      [1, 1, 1, 0],
      'Should be at position [1, 1, 1, 0]',
    )

    // Set limit c <= 0 (c=1 exceeds this, will be clamped)
    // argLimits[0]=null means isVariantNavigationAtLimit returns false
    // (no reset at start of retreat)
    state.argLimits[0] = null
    state.argLimits[1] = null
    state.argLimits[2] = 0 // c <= 0
    state.argLimits[3] = null

    assert.isTrue(retreatVariantNavigation(state))

    // Expected: [1, 1, 0, 0] - the highest valid position with c<=0
    // Bug (without resetSubsequent): [1, 0, 0, 2] - skips valid positions
    assert.deepStrictEqual(
      [...state.indexes],
      [1, 1, 0, 0],
      'Should retreat to [1, 1, 0, 0], the highest valid position with c<=0',
    )
  })
})
