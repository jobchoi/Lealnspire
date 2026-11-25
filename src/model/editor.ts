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
      const alternative = block.type === 'if' && block.else ? findBlockPath(block.else, id) : undefined
      if (alternative) return [index, -1, ...alternative]
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
    return hasBody(source) ? { ...source, id: fresh.id, body: source.body.map(copy), ...(source.type === 'if' && source.else ? { else: source.else.map(copy) } : {}) } : { ...source, id: fresh.id }
  }
  return copy(block)
}

/** -1 after an if index selects its else list; other indices select body. */
export function listAt(program: Program, path: number[]): Program {
  if (!path.length) return program
  const [index, ...rest] = path
  const block = program[index]
  if (!block || !hasBody(block)) return []
  return block.type === 'if' && rest[0] === -1
    ? listAt(block.else ?? [], rest.slice(1)) : listAt(block.body, rest)
}
export function blockAt(program: Program, path: number[]): Block | undefined {
  return listAt(program, path.slice(0, -1))[path[path.length - 1]]
}

/** Human-readable order omits the else marker and continues after the if body. */
export function blockOrder(program: Program, path: number[]): string {
  if (!path.length) return ''
  const [index, ...rest] = path
  const block = program[index]
  let tail = ''
  if (block && hasBody(block) && rest.length) {
    if (block.type === 'if' && rest[0] === -1) {
      const child = blockOrder(block.else ?? [], rest.slice(1)).split('.')
      child[0] = String(Number(child[0]) + block.body.length)
      tail = child.join('.')
    } else tail = blockOrder(block.body, rest)
  }
  return `${index + 1}${tail ? `.${tail}` : ''}`
}
