import { describe, expect, it } from 'vitest'
import { createBlock, findBlockPath } from './editor'
import { addBlock, deleteBlock, moveBlock } from './program'
import type { Program } from './types'

describe('editor helpers', () => {
  const program: Program = [{ id: 'block-2', type: 'repeat', count: 3, body: [{ id: 'block-1', type: 'forward' }] }, { id: 'other', type: 'turnLeft' }]
  it('allocates IDs across nested blocks and initializes repeats', () => {
    const block = createBlock(program, 'repeat')
    expect(block).toEqual({ id: 'block-3', type: 'repeat', count: 3, body: [] })
    expect(createBlock(addBlock(program, block), 'forward').id).toBe('block-4')
    expect(program[0].id).toBe('block-2')
  })
  it('tracks selection after reorder and loses it after ancestor deletion', () => {
    expect(findBlockPath(program, 'block-1')).toEqual([0, 0])
    expect(findBlockPath(moveBlock(program, [0], 'down'), 'block-1')).toEqual([1, 0])
    expect(findBlockPath(deleteBlock(program, [0]), 'block-1')).toBeUndefined()
    expect(findBlockPath(program, 'missing')).toBeUndefined()
  })
})
