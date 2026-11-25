import type { Block, Program as BlockTree } from './types'
import { createBlock, findBlockPath, hasBody } from './editor'

export const MAX_PROGRAM_BLOCKS = 10

// Paths contain an index at each nesting level; an empty parent path is the root.
function updateList(program: BlockTree, path: number[], update: (list: BlockTree) => BlockTree): BlockTree {
  if (!path.length) return update(program)
  const [index, ...rest] = path
  const block = program[index]
  if (!block || !hasBody(block)) throw new Error('Invalid body path')
  if (block.type === 'if' && rest[0] === -1) return program.map((item, i) => i === index ? { ...block, else: updateList(block.else ?? [], rest.slice(1), update) } : item)
  return program.map((item, i) => i === index ? { ...block, body: updateList(block.body, rest, update) } : item)
}
function splitPath(path: number[]): [number[], number] {
  if (!path.length) throw new Error('Block path cannot be empty')
  return [path.slice(0, -1), path[path.length - 1]]
}
function checkIndex(list: BlockTree, index: number): void {
  if (!Number.isInteger(index) || index < 0 || index >= list.length) throw new Error('Invalid block index')
}

export class Program {
  static readonly MAX_BLOCKS = MAX_PROGRAM_BLOCKS
  private readonly tree: BlockTree
  constructor(tree: BlockTree = []) { this.tree = structuredClone(tree) }
  toBlocks(): BlockTree { return structuredClone(this.tree) }
  count(): number { return Program.countBlocks(this.tree) }
  find(id: string): number[] | undefined { return findBlockPath(this.tree, id) }
  create(type: Block['type']): Block { return createBlock(this.tree, type) }
  add(block: Block, parent: number[] = []): Program { return new Program(Program.addBlock(this.tree, block, parent)) }
  remove(path: number[]): Program { return new Program(Program.deleteBlock(this.tree, path)) }
  move(path: number[], direction: 'up' | 'down'): Program { return new Program(Program.moveBlock(this.tree, path, direction)) }
  setCount(path: number[], count: number): Program { return new Program(Program.setRepeatCount(this.tree, path, count)) }
  static addBlock(program: BlockTree, block: Block, parentPath: number[] = []): BlockTree {
    if (countBlocks(program) + countBlocks([block]) > MAX_PROGRAM_BLOCKS) return program
    return updateList(program, parentPath, list => [...list, block])
  }
  static deleteBlock(program: BlockTree, path: number[]): BlockTree {
    const [parent, index] = splitPath(path)
    return updateList(program, parent, list => { checkIndex(list, index); return list.filter((_, i) => i !== index) })
  }
  static moveBlock(program: BlockTree, path: number[], direction: 'up' | 'down'): BlockTree {
    const [parent, index] = splitPath(path)
    return updateList(program, parent, list => {
      checkIndex(list, index)
      const target = index + (direction === 'up' ? -1 : 1)
      if (target < 0 || target >= list.length) return [...list]
      const copy = [...list]; [copy[index], copy[target]] = [copy[target], copy[index]]; return copy
    })
  }
  static setRepeatCount(program: BlockTree, path: number[], count: number): BlockTree {
    if (!Number.isInteger(count) || count < 2 || count > 10) throw new Error('Invalid repeat count')
    const [parent, index] = splitPath(path)
    return updateList(program, parent, list => {
      checkIndex(list, index)
      const block = list[index]
      if (block.type !== 'repeat') throw new Error('Block is not a repeat')
      return list.map((item, i) => i === index ? { ...block, count } : item)
    })
  }
  static setElse(program: BlockTree, path: number[], enabled: boolean): BlockTree {
    const [parent, index] = splitPath(path)
    return updateList(program, parent, list => {
      checkIndex(list, index)
      const block = list[index]
      if (block.type !== 'if') throw new Error('Block is not an if')
      const { else: alternative, ...plain } = block
      return list.map((item, i) => i === index ? enabled ? { ...block, else: alternative ?? [] } : plain : item)
    })
  }
  static countBlocks(program: BlockTree): number {
    return program.reduce((sum, block) => sum + 1 + (hasBody(block) ? countBlocks(block.body) : 0) + (block.type === 'if' ? countBlocks(block.else ?? []) : 0), 0)
  }
}
export const addBlock = Program.addBlock
export const deleteBlock = Program.deleteBlock
export const moveBlock = Program.moveBlock
export const setRepeatCount = Program.setRepeatCount
export const countBlocks = Program.countBlocks
