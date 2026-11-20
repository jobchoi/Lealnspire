import type { Block, Program } from './types'

export function findBlockPath(program: Program, id: string): number[] | undefined {
  for (const [index, block] of program.entries()) {
    if (block.id === id) return [index]
    if (block.type === 'repeat') {
      const child = findBlockPath(block.body, id)
      if (child) return [index, ...child]
    }
  }
}

export function createBlock(program: Program, type: Block['type']): Block {
  let serial = 1
  while (findBlockPath(program, `block-${serial}`)) serial++
  const id = `block-${serial}`
  return type === 'repeat' ? { id, type, count: 3, body: [] } : { id, type }
}
