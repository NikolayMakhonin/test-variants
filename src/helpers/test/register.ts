import _assert from 'assert'

;(global as any).assert = _assert

declare global {
  const assert: typeof _assert
}
