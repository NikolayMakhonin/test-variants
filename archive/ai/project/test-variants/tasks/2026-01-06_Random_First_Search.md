# Random-First Search

## Initial Situation

Current iterator in `src/test-variants/testVariantsIterator.ts` uses exclusively forward traversal. For tests with millions of variants where early variants work correctly, forward iteration wastes time before finding errors.

The iterator tracks `argLimits` array storing maximum value index for each argument. The `limitArgOnError` flag controls how `argLimits` restricts variants:
- `true`: per-arg constraint - variant invalid if any `indexes[i] > argLimits[i]`
- `false`: combination constraint - variant invalid exclusively when it equals or exceeds max combination lexicographically

Index significance: `indexes[keysCount-1]` is least significant (increments first during forward iteration), `indexes[0]` is most significant.

## Goal

Replace individual iterator options with extensible modes array. Each mode runs until its limits are reached, then the next mode starts. This enables patterns like: random search → forward iteration → random search → forward iteration.

## LLM Task

Implement modes-based iteration architecture with random and forward modes.

## Anchor Points

### Modes Array Architecture

Replace individual options with `modes: ModeConfig[]` where each mode has:
- `mode`: discriminator (`'forward'` | `'random'`)
- Mode-specific parameters
- Shared limit parameters

When one mode is exhausted, the next mode in array starts.

### Mode Types

```typescript
type BaseModeConfig = {
  limitTime?: null | number
  limitTotalCount?: null | number
}

type ForwardModeConfig = BaseModeConfig & {
  mode: 'forward'
  cycles?: null | number
  repeatsPerVariant?: null | number
}

type RandomModeConfig = BaseModeConfig & {
  mode: 'random'
}

type ModeConfig = ForwardModeConfig | RandomModeConfig
```

### Mode State

Track current mode execution:
```typescript
type ModeState = {
  index: number      // current mode in modes array
  pickCount: number  // picks in current mode
  startTime: number  // start time of current mode
}
```

### Random Pick Algorithm

Uses `Math.random()`. Iterates from most significant (`0`) to least significant (`keysCount-1`) for correct lexicographic comparison.

When `limitArgOnError: true` (per-arg constraint):
```
for i = 0 to keysCount-1:
  indexes[i] = random(0, argLimits[i])
```

When `limitArgOnError: false` (combination constraint):
```
belowMax = false
for i = 0 to keysCount-1:
  if belowMax:
    indexes[i] = random(0, lengths[i]-1)
  else:
    indexes[i] = random(0, argLimits[i])

  if indexes[i] < argLimits[i]:
    belowMax = true

if !belowMax:
  // landed exactly on max combination (error variant)
  // decrement by 1 to get valid variant, or signal minimum reached
```

When no limits exist (`argLimits` all null):
```
for i = 0 to keysCount-1:
  indexes[i] = random(0, lengths[i]-1)
```

### Helper Functions

- **advanceVariant**: increment with carry (existing logic)
- **retreatVariant**: decrement with borrow (reverse of advance)
- **randomPickVariant**: random selection within limits per algorithms above
- **isModeExhausted**: check if current mode reached its limits
- **getModeRepeatsPerVariant**: get repeatsPerVariant for current mode

### Files

- `src/test-variants/testVariantsIterator.ts`
- `src/test-variants/createTestVariants.ts`
- `src/test-variants/testVariantsRun.ts`
