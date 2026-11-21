import { expect, it } from 'vitest'
import { addBlock, countBlocks, MAX_PROGRAM_BLOCKS, moveBlock } from './program'
import type { Program } from './types'

it('반복 몸체를 포함해 10개까지 추가하고 초과하는 트리 추가를 거부한다', () => {
  const nine: Program = [{ id: 'r', type: 'repeat', count: 3, body: Array.from({ length: 8 }, (_, i) => ({ id: String(i), type: 'forward' })) }]
  const full = addBlock(nine, { id: 'last', type: 'forward' }, [0])
  expect(countBlocks(full)).toBe(MAX_PROGRAM_BLOCKS)
  expect(addBlock(full, { id: 'extra', type: 'forward' }, [0])).toBe(full)
  expect(addBlock(nine, { id: 'extra', type: 'repeat', count: 2, body: [{ id: 'child', type: 'forward' }] })).toBe(nine)
  expect(countBlocks(nine)).toBe(9)
})
it('앞/뒤 이동은 형제 안에서만 순서를 바꾸며 블록 수를 유지한다', () => {
  const program: Program = [{ id: 'a', type: 'forward' }, { id: 'b', type: 'turnRight' }]
  const moved = moveBlock(program, [1], 'up')
  expect(moved.map(b => b.id)).toEqual(['b', 'a'])
  expect(moveBlock(moved, [0], 'down')).toEqual(program)
  expect(countBlocks(moved)).toBe(2)
})

it('Program owns its tree and returns independent immutable edits', async () => {
  const { Program } = await import('./program')
  const input: import('./types').Program = [{ id: 'r', type: 'repeat', count: 2, body: [] }]
  const original = new Program(input)
  input[0].id = 'changed'
  const edited = original.add({ id: 'f', type: 'forward' }, [0]).setCount([0], 3)
  expect(original.count()).toBe(1)
  expect(edited.count()).toBe(2)
  expect(edited.find('f')).toEqual([0, 0])
  const output = edited.toBlocks(); output[0].id = 'outside'
  expect(edited.find('r')).toEqual([0])
  expect(edited.remove([0, 0]).count()).toBe(1)
})
