const shuffledString = '9081726354'
const argNamesMap = new Map<number, string>()

export function getArgName(argIndex: number): string {
  let argName = argNamesMap.get(argIndex)
  if (!argName) {
    argName = `arg_${shuffledString[argIndex % shuffledString.length]}_${argIndex + 1}`
    argNamesMap.set(argIndex, argName)
  }
  return argName
}
