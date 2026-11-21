import type { Block, Program } from './types'

export const MAX_PROGRAM_BLOCKS = 10

// Paths contain an index at each nesting level; an empty parent path is the root.
function updateList(program: Program, path: number[], update: (list: Program) => Program): Program {
  if (!path.length) return update(program)
  const [index, ...rest] = path
  const block = program[index]
  if (!block || block.type !== 'repeat') throw new Error('Invalid repeat path')
  return program.map((item, i) => i === index ? { ...block, body: updateList(block.body, rest, update) } : item)
}
function splitPath(path: number[]): [number[], number] {
  if (!path.length) throw new Error('Block path cannot be empty')
  return [path.slice(0, -1), path[path.length - 1]]
}
function checkIndex(list: Program, index: number): void {
  if (!Number.isInteger(index) || index < 0 || index >= list.length) throw new Error('Invalid block index')
}
export function addBlock(program: Program, block: Block, parentPath: number[] = []): Program {
  if (countBlocks(program) + countBlocks([block]) > MAX_PROGRAM_BLOCKS) return program
  return updateList(program, parentPath, list => [...list, block])
}
export function deleteBlock(program: Program, path: number[]): Program {
  const [parent, index] = splitPath(path)
  return updateList(program, parent, list => { checkIndex(list, index); return list.filter((_, i) => i !== index) })
}
export function moveBlock(program: Program, path: number[], direction: 'up' | 'down'): Program {
  const [parent, index] = splitPath(path)
  return updateList(program, parent, list => {
    checkIndex(list, index)
    const target = index + (direction === 'up' ? -1 : 1)
    if (target < 0 || target >= list.length) return [...list]
    const copy = [...list]; [copy[index], copy[target]] = [copy[target], copy[index]]; return copy
  })
}
export function setRepeatCount(program: Program, path: number[], count: number): Program {
  if (!Number.isInteger(count) || count < 2 || count > 10) throw new Error('Invalid repeat count')
  const [parent, index] = splitPath(path)
  return updateList(program, parent, list => {
    checkIndex(list, index)
    const block = list[index]
    if (block.type !== 'repeat') throw new Error('Block is not a repeat')
    return list.map((item, i) => i === index ? { ...block, count } : item)
  })
}
export function countBlocks(program: Program): number {
  return program.reduce((sum, block) => sum + 1 + (block.type === 'repeat' ? countBlocks(block.body) : 0), 0)
}
