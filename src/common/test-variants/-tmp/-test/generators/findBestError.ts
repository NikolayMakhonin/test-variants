import { deepEqualJsonLike, Random, randomInt } from '@flemist/simple-utils'
import { StressTestArgs, Template } from '../types'
import type {
  LimitArgOnError,
  LimitArgOnErrorOptions,
  FindBestErrorOptions,
} from 'src/common'
import { generateBoolean, generateEquals } from './primitives'

function generateLimitArgOnErrorFunc(
  template: Template,
  argKeys: readonly string[],
): LimitArgOnError {
  return function limitArgOnError(options: LimitArgOnErrorOptions): boolean {
    if (options == null || typeof options !== 'object') {
      throw new Error(
        `limitArgOnError: options must be object, got ${typeof options}`,
      )
    }
    if (!options.name) {
      throw new Error(
        `limitArgOnError: name must be not empty string, got ${typeof options.name}`,
      )
    }

    let argIndex = -1
    for (let i = 0, len = argKeys.length; i < len; i++) {
      if (argKeys[i] === options.name) {
        argIndex = i
        break
      }
    }
    if (argIndex < 0) {
      throw new Error(`limitArgOnError: unknown arg name "${options.name}"`)
    }

    if (!Number.isInteger(options.valueIndex)) {
      throw new Error(
        `limitArgOnError: valueIndex must be integer, got ${options.valueIndex}`,
      )
    }
    if (options.valueIndex < 0) {
      throw new Error(
        `limitArgOnError: valueIndex must be non-negative, got ${options.valueIndex}`,
      )
    }

    if (!Array.isArray(options.values)) {
      throw new Error(
        `limitArgOnError: values must be array, got ${typeof options.values}`,
      )
    }
    if (options.values.length === 0) {
      throw new Error(`limitArgOnError: values must be non-empty array`)
    }
    if (options.valueIndex >= options.values.length) {
      throw new Error(
        `limitArgOnError: valueIndex ${options.valueIndex} >= values.length ${options.values.length}`,
      )
    }

    const templateValues = template[options.name]
    if (typeof templateValues === 'function') {
      // Dynamic template - can't validate values statically
    } else {
      if (options.values.length !== templateValues.length) {
        throw new Error(
          `limitArgOnError: values.length ${options.values.length} !== template.length ${templateValues.length}`,
        )
      }
      for (let i = 0, len = options.values.length; i < len; i++) {
        if (!deepEqualJsonLike(options.values[i], templateValues[i])) {
          throw new Error(
            `limitArgOnError: values[${i}] mismatch with template`,
          )
        }
      }
    }

    if (options.maxValueIndex === void 0) {
      throw new Error(`limitArgOnError: options.maxValueIndex is missing`)
    }
    if (options.maxValueIndex !== null) {
      if (!Number.isInteger(options.maxValueIndex)) {
        throw new Error(
          `limitArgOnError: maxValueIndex must be integer, got ${options.maxValueIndex}`,
        )
      }
      if (options.maxValueIndex < 0) {
        throw new Error(
          `limitArgOnError: maxValueIndex must be non-negative, got ${options.maxValueIndex}`,
        )
      }
      if (options.maxValueIndex >= options.values.length) {
        throw new Error(
          `limitArgOnError: maxValueIndex ${options.maxValueIndex} >= values.length ${options.values.length}`,
        )
      }
    }

    // Limit only odd indices
    return options.valueIndex % 2 === 1
  }
}

function generateLimitArgOnError(
  rnd: Random,
  options: StressTestArgs,
  template: Template,
  argKeys: readonly string[],
): boolean | LimitArgOnError {
  if (options.limitArgOnError === 'func') {
    return generateLimitArgOnErrorFunc(template, argKeys)
  }
  if (options.limitArgOnError != null) {
    return options.limitArgOnError
  }
  const choice = randomInt(rnd, 0, 3)
  if (choice === 0) {
    return false
  }
  if (choice === 1) {
    return true
  }
  return generateLimitArgOnErrorFunc(template, argKeys)
}

export function generateFindBestErrorOptions(
  rnd: Random,
  options: StressTestArgs,
  template: Template,
  argKeys: readonly string[],
): FindBestErrorOptions | undefined {
  const enabled = generateBoolean(rnd, options.findBestError)
  if (!enabled) {
    return void 0
  }
  return Object.freeze({
    equals: generateEquals(rnd, options),
    limitArgOnError: generateLimitArgOnError(rnd, options, template, argKeys),
    includeErrorVariant: generateBoolean(rnd, options.includeErrorVariant),
    dontThrowIfError: generateBoolean(rnd, options.dontThrowIfError),
  })
}
