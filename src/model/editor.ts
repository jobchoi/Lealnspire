import type { Block, Program } from './types'

export function hasBody(block: Block): block is Extract<Block, { body: Block[] }> {
  return block.type === 'repeat' || block.type === 'if'
}

export function findBlockPath(program: Program, id: string): number[] | undefined {
  for (const [index, block] of program.entries()) {
    if (block.id === id) return [index]
    if (hasBody(block)) {
      const child = findBlockPath(block.body, id)
      if (child) return [index, ...child]
    }
  }
}

export function createBlock(program: Program, type: Block['type']): Block {
  let serial = 1
  while (findBlockPath(program, `block-${serial}`)) serial++
  const id = `block-${serial}`
  return type === 'if' ? { id, type, condition: 'blockedAhead', body: [] } : type === 'repeat' ? { id, type, count: 3, body: [] } : { id, type }
}

/** Copy a subtree, allocating fresh IDs against the destination and earlier copies. */
export function cloneBlock(program: Program, block: Block): Block {
  const allocated = [...program]
  function copy(source: Block): Block {
    const fresh = createBlock(allocated, source.type)
    allocated.push(fresh)
    return hasBody(source) ? { ...source, id: fresh.id, body: source.body.map(copy) } : { ...source, id: fresh.id }
  }
  return copy(block)
}
