# Code Quality Improvement

⚠️ **THIS IS AN INFINITE LOOP TASK** ⚠️
- NEVER stop after completing any sub-task
- NEVER wait for user approval
- NEVER ask questions
- IMMEDIATELY start next cycle after ANY completion
- Loop terminates ONLY when user manually interrupts

---

## Core Priorities

**1. Code Quality and Design Principles** (PRIMARY FOCUS) - bring all code into full compliance with [Design Principles](@/ai/project/base/docs/rules/common/design-principles.md). Apply SOLID, KISS, YAGNI, DRY, SoC, LoD, POLA, Fail Fast, Pure Functions, Design by Contract, Composition over Inheritance, High Cohesion, Low Coupling. Detect and correct all violations systematically. Focus on clarity, explicitness, simplicity, consistency, predictability, single responsibility, extensibility, interface design, modularity, testability, functional purity, evolvability, composability, contracts, and invariants.

**2. README.md Compliance** - single source of truth, every word is critical. Code, comments, doc comments may contain errors.

**3. Test Completeness** - iterate ALL variant combinations, perform ALL validations, cover ALL edge cases, verify iteration count matches README.

**4. False Positive Prevention** - doubt everything; tests are tested by themselves creating critical risk; intentionally break code to confirm tests fail. Never hide errors through any mechanism: arbitrary safety margins, heuristic multipliers, overly permissive bounds, disabled checks, skipped validations, etc. If a check would fail due to incorrect understanding of algorithm behavior, the solution is to study the algorithm until you understand it precisely - never to weaken the check or add buffer that makes it pass. If you cannot fix an issue, report it explicitly - never mask it.

**5. Performance Throughput** - optimize code to run faster → more tests complete in fixed 2-minute window. After each stress test run, record the total test count from output. Each cycle, search for optimizations that increase this count. Current stress test config (10 parallel, same modes, same template) must stay unchanged for fair comparison.

---

## Execution Cycle

CRITICAL: Fully autonomous infinite loop. NEVER stop. NEVER wait for user.

Each cycle:
1. Read Design Principles and all related source files
2. **Analyze code quality against Design Principles** - check every module for violations:
   - Clarity: is code understandable at first glance?
   - Explicitness: are all effects visible, no hidden mutations?
   - Simplicity: is complexity minimally sufficient?
   - Consistency: are identical situations solved identically?
   - Predictability: does code do exactly what names suggest?
   - Single Responsibility: one module - one concern?
   - Modularity: can modules be understood and tested in isolation?
   - Testability: can code be verified without elaborate setup?
   - Fail Fast: are errors thrown immediately?
   - Pure Functions: same input - same output, no side effects?
3. Compare code behavior with README.md specification
4. Find and fix all design principle violations, discrepancies, bugs
5. Run tests to verify fixes (use `mocha`)
6. MANDATORY: Run stress test and verify it runs EXACTLY 2 minutes (not less, not more)
7. Deep debugging phase:
   - Doubt everything: code, tests, assumptions
   - Verify stress tests iterate ALL possible variant combinations
   - Verify stress tests perform ALL necessary validations
   - Verify iteration count matches README expectations
   - Verify no false positives (intentionally break code, confirm test fails)
   - Check every stress test parameter combination is covered
   - Ensure tests work exactly as README specifies
   - Check memory leaks and high memory usages in progress logs. There should not be continuously growth and should not be large jumps (big allocate, GC, big allocate, etc). If there are large jumps, then you are neglecting the ultra performance rule - avoid memory allocation. Fix it.
8. Fix all bugs and issues discovered during debugging
9. IMMEDIATELY start next cycle from step 1

After each cycle:
- DO NOT stop
- DO NOT wait for user approval
- DO NOT ask questions
- DO NOT summarize and wait
- IMMEDIATELY start next cycle from step 1

**Todo list strategy:**
Always keep last todo item: "Read task file and start cycle from step 1" with `in_progress` status - AND EXECUTE IT

Loop terminates ONLY when user manually interrupts.

This file enables autonomous work continuation after autocompaction.

---

## LLM Task Details

Always consider the current implementation of both code and tests as incorrect, look for and fix all errors, bad code, workarounds, hidden errors, and design principle violations. There are a very lot of issues.

### Code Quality Focus

Apply Design Principles systematically to every file:

1. **Clarity** - rewrite until understanding is immediate; replace complex expressions with multiple obvious statements
2. **Explicitness** - make all effects visible; pass all dependencies as explicit parameters
3. **Simplicity** - find and implement simpler alternatives; remove unjustified complexity
4. **Consistency** - identify correct pattern from existing code; apply uniformly everywhere
5. **Predictability** - rename to match behavior or change behavior to match name
6. **Single Responsibility** - split modules with multiple concerns
7. **Extensibility** - restructure using composition; isolate variation points
8. **Interface Design** - split large interfaces; hide all internals
9. **Modularity** - redesign boundaries; define clear contracts; eliminate shared mutable state
10. **Testability** - simplify dependencies; inject dependencies as parameters
11. **Fail Fast** - replace silent handling with explicit exceptions
12. **Functional Purity** - eliminate external state dependencies; make functions deterministic

### Additional Tasks

1. Verify and fix behavior to match README.md exactly, especially stress tests
2. Improve code quality: cleanliness, conciseness, readability, consistency, modularity (breaking into small independent helper functions that are more universal and flexible)
3. Fix all comments and doc comments to reflect README.md behavior
4. Comment changes with logic, decisions, and solutions to problems that may remain relevant

Use ITimeController instead of setTimeout, setInterval, Date.now(), etc.
Use delay() with ITimeController to wait certain (virtual) milliseconds.
Strive for simple tests to run quickly, no longer than a couple of seconds.
Only stress tests can take a long time to run.
Use `log.debug` option and `src/helpers/log` as replacement of `console.log` throughout the code for enable/disable detailed debug logging to fully understand internal behavior. However, enable this only when you need to debug the code or in error logging stage in stress tests, since there are billions of test cases and we want to avoid flooding the console or causing memory overflow.

---

## Constraints

### Design Principles are Mandatory

Every code change must comply with all Design Principles. Violation of any principle is a bug that must be fixed.

### README.md is the Single Source of Truth

FORBIDDEN to:
- Invent meanings not stated in README
- Rephrase README semantics
- Simplify README semantics
- Distort README semantics

### Test Reliability Awareness

Stress tests are tested by the stress tests themselves that are being debugged. This creates a critical risk:

**Danger**: If a bug causes tests to pass even when errors occur, you may perceive this as "all OK"
!! If the stress test completes in less than 2 minutes or takes more than 3 minutes to finish, it is considered FAILED regardless of the result it produces.

NEVER think this way. Always:
- Doubt whether tests are reliable
- Question if tests actually work and check everything
- Write simple tests to verify that stress tests catch errors and iterate all possible variants
- Realize that stress tests may be incomplete or have errors, leading to false positives
- Thoroughly check if all possible and impossible cases are iterated
- Thoroughly check if all possible validations are performed

### Task Scope Boundaries

Never touch anything not related to this task:
- Do not update package.json version
- Do not update CHANGELOG
- Do not modify unrelated files
- etc

### Code Cleanliness

- Delete all commented-out code
- Delete all deprecated code
- Delete all dead code
- Delete all unused variables
- No backward compatibility - never complicate code for it

---

## Reference

### Related Files

- `README.md` - authoritative API specification
- `src/test-variants/createTestVariants.ts`
- `src/test-variants/testVariantsIterator.ts`
- `src/test-variants/testVariantsRun.ts`
- `src/test-variants/testVariantsCreateTestRun.ts`
- `src/test-variants/types.ts`
- `src/test-variants/saveErrorVariants.ts`
- `src/test-variants/createTestVariants.test.ts`
- `src/test-variants/createTestVariants.variants.test.ts` - stress test runner (mocha)
- `src/test-variants/-test/variants.ts` - stress test logic and verifications
- `src/test-variants/testVariantsIterator.test.ts`
- `src/test-variants/testVariantsRun.test.ts`
- `src/test-variants/saveErrorVariants.test.ts`

### Documentation (read before working)

For Design Principles (READ FIRST):
- `@/ai/project/base/docs/rules/common/design-principles.md`

For TypeScript code:
- `@/ai/project/base/docs/rules/docs/documentation.md`
- `@/ai/project/base/docs/rules/common/code.md`
- `@/ai/project/base/docs/rules/common/naming.md`
- `@/ai/project/base/docs/rules/common/logging.md`
- `@/ai/project/base/docs/rules/code/TypeScript/rules/ultra-performance.md`

For writing simple tests:
- `@/ai/project/base/docs/rules/code/test-development/principles.md`
- `@/ai/project/base/docs/rules/code/test-development/simple-tests.md`

After code modifications:
- `@/ai/project/base/docs/rules/common/code-review.md`

### Types Organization

- General types → `types.ts`
- Specific types (function-specific options, result types) → near where they are directly used

### Simple Tests Approach

For verifying stress tests reliability:
- Use same test files or rename if something changes
- Follow instructions for writing simple tests from project rules

### Critical Correction: `cycles` Semantics

WRONG interpretation (that was made earlier): "cycles (external): number of full passes through modes"

Nowhere in README does it say that `cycles` is the number of passes through modes.

CORRECT interpretation (from README):
- `cycles` is a COMPLEX termination condition for testVariants
- When mode reaches its OWN limit (mode's `cycles`, `limitTime`, `limitTests`) → switch to next mode, NOT termination
- Termination occurs when ALL of the following conditions are met for ALL modes:
  - For `forward` and `backward`: number of full passes of all variants reached `cycles`
  - For `random`: number of picked variants reached `cycles` (without counting attemptsPerVariant)
- If in the last pass any mode executed zero tests, it is not counted in termination condition check
- If NONE of the modes executed any test in the last pass → termination (zero progress)

---

## ⚠️ INFINITE LOOP REMINDER ⚠️

**You have reached the end of this task file. This does NOT mean you should stop.**

1. This is an INFINITE LOOP task
2. After reading this file, IMMEDIATELY start executing step 1 of the cycle
3. After completing ANY sub-task, IMMEDIATELY return to step 1
4. NEVER stop, NEVER wait, NEVER ask questions
5. Loop terminates ONLY when user manually interrupts

**IF YOU ARE ABOUT TO STOP OR WAIT FOR USER - DO NOT. START NEXT CYCLE INSTEAD.**
