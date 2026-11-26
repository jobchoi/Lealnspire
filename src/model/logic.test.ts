import { expect, it } from 'vitest'
import { run, runAll } from './interpreter'
import { Program, validCondition, validDocument } from './program'
import { cloneBlock } from './editor'
import { ProgressRepository, progressV2Key } from './ProgressRepository'
import { allStages, unit2Stages } from './stages'
import baseline from './unit1-5-run.fixture.json'
import type { Block, Condition, ConditionAtom } from './types'

const atom = (a: ConditionAtom): Condition => ({ kind: 'atom', atom: a })
const not = (operand: Condition): Condition => ({ kind: 'not', operand })
const binary = (kind: 'and' | 'or', left: Condition, right: Condition): Condition => ({ kind, left, right })
const stage = { ...allStages[0], grid: ['S.G'], startDir: 'E' as const }
const branch = (condition: Condition): Block => ({ id: 'if', type: 'if', condition, body: [{ id: 'yes', type: 'turnLeft' }], else: [{ id: 'no', type: 'turnRight' }] })

it('evaluates both operands in order for every truth table row, recording negation and paths', () => {
  for (const open of [false, true]) for (const zero of [false, true]) for (const kind of ['and', 'or'] as const) {
    const condition = binary(kind, not(atom('clearAhead')), atom('aIsZero'))
    const grid = open ? ['S.G'] : ['S#G']
    const result = run({ ...stage, grid }, [branch(condition)], { A: zero ? 0 : 1 })
    expect(result.frames[1].check).toEqual({ blockId: 'if', condition, result: kind === 'and' ? !open && zero : !open || zero, atoms: [
      { atom: 'clearAhead', value: open, path: ['left', 'operand'], result: !open },
      { atom: 'aIsZero', value: zero, path: ['right'], result: zero },
    ] })
    expect(result.frames[2].activeBlockId).toBe(result.frames[1].check!.result ? 'yes' : 'no')
  }
  const condition = binary('or', atom('aIsZero'), atom('aIsZero'))
  expect(run(stage, [branch(condition)]).frames[1].check?.atoms?.map(a => a.path)).toEqual([['left'], ['right']])
  expect(run(stage, [branch(not(atom('aIsZero')))]).frames[1].check).toMatchObject({ result: false, atoms: [{ value: true, result: false, path: ['operand'] }] })
})
it('rechecks while conditions, handles zero iterations and bounds infinite loops', () => {
  const loop: Block = { id: 'w', type: 'while', condition: atom('aIsZero'), body: [{ id: 'c', type: 'change', variable: 'A', by: 1 }] }
  expect(run(stage, [loop], { A: 1 }).frames).toHaveLength(2)
  expect(run(stage, [loop]).frames.filter(f => f.event === 'check').map(f => f.check?.result)).toEqual([true, false])
  const infinite = run(stage, [{ ...loop, body: [] }])
  expect(infinite.result).toBe('stepLimit'); expect(infinite.frames).toHaveLength(1001)
})
it('evaluates in functions and resets A for each variant', () => {
  const doc = { main: [{ id: 'call', type: 'call' as const, fn: 'fn' }], functions: [{ id: 'fn', icon: 'star' as const, body: [branch(atom('aIsZero'))] }] }
  const results = runAll({ ...stage, variants: [stage.grid, stage.grid], variantVariables: [{ A: 0 }, { A: 1 }] }, doc).results
  expect(results.map(r => r.frames[1].check?.result)).toEqual([true, false])
  expect(results[0].frames[1].call).toEqual({ callId: 'call', fn: 'fn' })
})
it('validates shape and copies conditions independently during edits and cloning', () => {
  const condition = binary('and', atom('clearAhead'), not(atom('aIsZero')))
  const original = [branch(condition)]
  const edited = Program.setCondition(original, [0], condition)
  ;(condition as Extract<Condition, { kind: 'and' | 'or' }>).left = atom('blockedAhead')
  expect(edited[0]).not.toEqual(original[0])
  const clone = cloneBlock(original, original[0]); expect(clone.id).not.toBe(original[0].id)
  expect(Program.countBlocks(original)).toBe(3)
  const cycle: Record<string, unknown> = { kind: 'not' }; cycle.operand = cycle
  for (const invalid of [cycle, { kind: 'atom', atom: 'x' }, { kind: 'atom', atom: 'aIsZero', extra: true }, not(not(atom('aIsZero'))), binary('or', binary('and', atom('aIsZero'), atom('clearAhead')), atom('aIsZero')), { kind: 'or', left: atom('aIsZero') }]) {
    expect(validCondition(invalid)).toBe(false)
    expect(validDocument({ main: [{ id: 'x', type: 'if', condition: invalid, body: [] }], functions: [] })).toBe(false)
  }
})
it('roundtrips v2 and isolates invalid expressions, preserving other progress', () => {
  const data = new Map<string, string>()
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) } }
  const target = unit2Stages[0], other = unit2Stages[1]
  const doc = { main: [branch(binary('and', atom('clearAhead'), not(atom('aIsZero'))))], functions: [] }
  const repo = new ProgressRepository(storage); repo.completeStage(target.id, 3, doc); repo.completeStage(other.id, 2, [])
  expect(new ProgressRepository(storage).getDocument(target)).toEqual(doc)
  expect(data.get(progressV2Key)).not.toContain('variables')
  const saved = JSON.parse(data.get(progressV2Key)!)
  saved.stages[target.id].lastProgram.main[0].condition.left.atom = 'unknown'
  data.set(progressV2Key, JSON.stringify(saved))
  const restored = new ProgressRepository(storage)
  expect(restored.getDocument(target)).toEqual({ main: [], functions: [] })
  expect(restored.getProgress().stages[target.id]).toMatchObject({ completed: true, bestStars: 3 })
  expect(restored.getProgress().stages[other.id]).toMatchObject({ completed: true, bestStars: 2 })
})
it('documents old v2 reader rollback and resave loss with an independent legacy condition validator', () => {
  const oldValid = (condition: unknown) => condition === 'blockedAhead'
  const saved = { version: 2, stages: { [unit2Stages[0].id]: { completed: true, bestStars: 3, lastProgram: { main: [branch(atom('aIsZero'))], functions: [] } }, 'u6-1': { completed: true, bestStars: 3, lastProgram: { main: [], functions: [] } } } }
  const oldStages = Object.fromEntries(Object.entries(saved.stages).filter(([id]) => allStages.some(s => s.id === id)).map(([id, entry]) => [id, { ...entry, lastProgram: oldValid((entry.lastProgram.main[0] as Extract<Block, { type: 'if' }> | undefined)?.condition) ? entry.lastProgram : { main: [], functions: [] } }]))
  const rewritten = JSON.parse(JSON.stringify({ version: 2, stages: oldStages }))
  expect(rewritten.stages[unit2Stages[0].id]).toMatchObject({ completed: true, bestStars: 3, lastProgram: { main: [], functions: [] } })
  expect(rewritten.stages['u6-1']).toBeUndefined()
})
it('preserves all pre-change unit 1–5 solution results and frames', () => {
  expect(Object.fromEntries(allStages.map(s => [s.id, runAll(s, { main: s.solution, functions: s.solutionFunctions ?? [] })]))).toEqual(baseline)
})
