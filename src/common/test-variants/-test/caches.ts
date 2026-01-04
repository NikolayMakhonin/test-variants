const argKeyCache: Map<number, string> = new Map()

export function getArgKey(index: number): string {
  let key = argKeyCache.get(index)
  if (key == null) {
    key = `arg${index}`
    argKeyCache.set(index, key)
  }
  return key
}
