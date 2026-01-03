import { describe, it, beforeEach, afterEach } from 'vitest'
import * as assert from 'node:assert'
import * as fs from 'fs'
import * as path from 'path'
import { createTestVariants } from '../index'
import {
  generateErrorVariantFilePath,
  readErrorVariantFiles,
  parseErrorVariantFile,
  saveErrorVariantFile,
} from './saveErrorVariants'

const TEST_DIR = path.join(process.cwd(), '-tmp', '-test', 'saveErrorVariants')

async function cleanTestDir() {
  await fs.promises.rm(TEST_DIR, { recursive: true, force: true })
}

describe('test-variants > saveErrorVariants', () => {
  beforeEach(async () => {
    await cleanTestDir()
  })

  afterEach(async () => {
    await cleanTestDir()
  })

  describe('readErrorVariantFiles', () => {
    it('returns empty array when dir does not exist', async () => {
      const files = await readErrorVariantFiles(
        path.join(TEST_DIR, 'nonexistent'),
      )
      assert.deepStrictEqual(files, [])
    })

    it('returns empty array when dir is empty', async () => {
      await fs.promises.mkdir(TEST_DIR, { recursive: true })
      const files = await readErrorVariantFiles(TEST_DIR)
      assert.deepStrictEqual(files, [])
    })

    it('returns json files sorted descending by filename', async () => {
      await fs.promises.mkdir(TEST_DIR, { recursive: true })
      await fs.promises.writeFile(
        path.join(TEST_DIR, '2024-01-01_10-00-00.json'),
        '{}',
      )
      await fs.promises.writeFile(
        path.join(TEST_DIR, '2024-01-02_10-00-00.json'),
        '{}',
      )
      await fs.promises.writeFile(
        path.join(TEST_DIR, '2024-01-01_11-00-00.json'),
        '{}',
      )
      await fs.promises.writeFile(path.join(TEST_DIR, 'not-json.txt'), '{}')

      const files = await readErrorVariantFiles(TEST_DIR)
      assert.deepStrictEqual(files, [
        path.join(TEST_DIR, '2024-01-02_10-00-00.json'),
        path.join(TEST_DIR, '2024-01-01_11-00-00.json'),
        path.join(TEST_DIR, '2024-01-01_10-00-00.json'),
      ])
    })

    it('throws when path is not a directory', async () => {
      await fs.promises.mkdir(TEST_DIR, { recursive: true })
      const filePath = path.join(TEST_DIR, 'file.txt')
      await fs.promises.writeFile(filePath, '')

      await assert.rejects(
        readErrorVariantFiles(filePath),
        /path is not a directory/,
      )
    })
  })

  describe('parseErrorVariantFile', () => {
    it('parses json file', async () => {
      await fs.promises.mkdir(TEST_DIR, { recursive: true })
      const filePath = path.join(TEST_DIR, 'test.json')
      await fs.promises.writeFile(filePath, '{"a": 1, "b": "test"}')

      const args = await parseErrorVariantFile(filePath)
      assert.deepStrictEqual(args, { a: 1, b: 'test' })
    })

    it('uses jsonToArgs transform', async () => {
      await fs.promises.mkdir(TEST_DIR, { recursive: true })
      const filePath = path.join(TEST_DIR, 'test.json')
      await fs.promises.writeFile(filePath, '{"value": 42}')

      const args = await parseErrorVariantFile(
        filePath,
        (json: { value: number }) => ({
          transformed: json.value * 2,
          seed: void 0,
        }),
      )
      assert.deepStrictEqual(args, { transformed: 84, seed: void 0 })
    })

    it('throws on invalid json', async () => {
      await fs.promises.mkdir(TEST_DIR, { recursive: true })
      const filePath = path.join(TEST_DIR, 'test.json')
      await fs.promises.writeFile(filePath, 'invalid json')

      await assert.rejects(parseErrorVariantFile(filePath), /invalid JSON/)
    })

    it('throws when jsonToArgs fails', async () => {
      await fs.promises.mkdir(TEST_DIR, { recursive: true })
      const filePath = path.join(TEST_DIR, 'test.json')
      await fs.promises.writeFile(filePath, '{"a": 1}')

      await assert.rejects(
        parseErrorVariantFile(filePath, () => {
          throw new Error('transform error')
        }),
        /jsonToArgs failed/,
      )
    })
  })

  describe('generateErrorVariantFilePath', () => {
    it('generates filename with UTC date format and random hash', () => {
      const sessionDate = new Date('2024-06-15T14:30:45.123Z')
      const filePath = generateErrorVariantFilePath({ sessionDate })
      assert.match(filePath, /^2024-06-15_14-30-45_[a-z0-9]+\.json$/)
    })
  })

  describe('saveErrorVariantFile', () => {
    it('saves args to json file', async () => {
      const filePath = path.join(TEST_DIR, 'test.json')
      await saveErrorVariantFile({ a: 1, b: 'test' }, filePath)

      const content = await fs.promises.readFile(filePath, 'utf-8')
      assert.deepStrictEqual(JSON.parse(content), { a: 1, b: 'test' })
    })

    it('uses argsToJson transform returning object', async () => {
      const filePath = path.join(TEST_DIR, 'test.json')
      await saveErrorVariantFile({ a: 1, b: 'test' }, filePath, args => ({
        transformed: args.a * 2,
      }))

      const content = await fs.promises.readFile(filePath, 'utf-8')
      assert.deepStrictEqual(JSON.parse(content), { transformed: 2 })
    })

    it('uses argsToJson transform returning string', async () => {
      const filePath = path.join(TEST_DIR, 'test.json')
      await saveErrorVariantFile(
        { a: 1 },
        filePath,
        () => 'custom string content',
      )

      const content = await fs.promises.readFile(filePath, 'utf-8')
      assert.strictEqual(content, 'custom string content')
    })

    it('creates dir if not exists', async () => {
      const nestedDir = path.join(TEST_DIR, 'nested', 'path')
      const filePath = path.join(nestedDir, 'test.json')
      await saveErrorVariantFile({ a: 1 }, filePath)

      const stat = await fs.promises.stat(nestedDir)
      assert.ok(stat.isDirectory())
    })

    it('overwrites existing file', async () => {
      const filePath = path.join(TEST_DIR, 'test.json')
      await saveErrorVariantFile({ a: 1 }, filePath)
      await saveErrorVariantFile({ a: 2 }, filePath)

      const content = await fs.promises.readFile(filePath, 'utf-8')
      assert.deepStrictEqual(JSON.parse(content), { a: 2 })
    })
  })

  describe('integration with createTestVariants', () => {
    it('saves error-causing args to file', async () => {
      let callCount = 0
      const testFn = createTestVariants(({ a }: { a: number }) => {
        callCount++
        if (a === 2) {
          throw new Error('test error')
        }
      })

      await assert.rejects(
        async () =>
          testFn({ a: [1, 2, 3] })({
            saveErrorVariants: { dir: TEST_DIR },
            log: false,
          }),
        /test error/,
      )

      const files = await fs.promises.readdir(TEST_DIR)
      assert.strictEqual(files.length, 1)

      const content = await fs.promises.readFile(
        path.join(TEST_DIR, files[0]),
        'utf-8',
      )
      const savedArgs = JSON.parse(content)
      assert.strictEqual(savedArgs.a, 2)
    })

    it('replays saved variants before normal iteration', async () => {
      await fs.promises.mkdir(TEST_DIR, { recursive: true })
      await fs.promises.writeFile(
        path.join(TEST_DIR, '2024-01-01_10-00-00.json'),
        JSON.stringify({ a: 99, seed: null }),
      )

      const replayedArgs: number[] = []
      const normalArgs: number[] = []

      let isReplaying = true
      const testFn = createTestVariants(({ a }: { a: number }) => {
        if (isReplaying) {
          replayedArgs.push(a)
          isReplaying = false
        } else {
          normalArgs.push(a)
        }
      })

      await testFn({ a: [1, 2] })({
        saveErrorVariants: { dir: TEST_DIR },
        log: false,
      })

      assert.deepStrictEqual(replayedArgs, [99])
      assert.deepStrictEqual(normalArgs, [1, 2])
    })

    it('throws on replay failure without saving file', async () => {
      await fs.promises.mkdir(TEST_DIR, { recursive: true })
      await fs.promises.writeFile(
        path.join(TEST_DIR, '2024-01-01_10-00-00.json'),
        JSON.stringify({ a: 1, seed: null }),
      )

      const testFn = createTestVariants(({ a }: { a: number }) => {
        if (a === 1) {
          throw new Error('replay error')
        }
      })

      await assert.rejects(
        async () =>
          testFn({ a: [2, 3] })({
            saveErrorVariants: { dir: TEST_DIR },
            log: false,
          }),
        /replay error/,
      )

      // Should still have only the original file, no new file created
      const files = await fs.promises.readdir(TEST_DIR)
      assert.strictEqual(files.length, 1)
      assert.strictEqual(files[0], '2024-01-01_10-00-00.json')
    })

    it('retries replay variants multiple times', async () => {
      await fs.promises.mkdir(TEST_DIR, { recursive: true })
      await fs.promises.writeFile(
        path.join(TEST_DIR, '2024-01-01_10-00-00.json'),
        JSON.stringify({ a: 1, seed: null }),
      )

      let replayCount = 0
      const testFn = createTestVariants(({ a }: { a: number }) => {
        if (a === 1) {
          replayCount++
        }
      })

      await testFn({ a: [2] })({
        saveErrorVariants: {
          dir: TEST_DIR,
          attemptsPerVariant: 3,
        },
        log: false,
      })

      assert.strictEqual(replayCount, 3)
    })
  })
})
