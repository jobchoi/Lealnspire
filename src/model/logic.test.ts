import { expect, it } from 'vitest'
import { run, runAll } from './interpreter'
import { normalizeLogicProgram, Program, validCondition, validDocument } from './program'
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
    const condition = binary(kind, not(atom('clearAhead')), atom('blockedLeft'))
    const grid = [zero ? '#..' : '...', open ? 'S.G' : 'S#G']
    const result = run({ ...stage, grid }, [branch(condition)], { A: zero ? 0 : 1 })
    expect(result.frames[1].check).toEqual({ blockId: 'if', condition, result: kind === 'and' ? !open && zero : !open || zero, atoms: [
      { atom: 'clearAhead', value: open, path: ['left', 'operand'], result: !open },
      { atom: 'blockedLeft', value: zero, path: ['right'], result: zero },
    ] })
    expect(result.frames[2].activeBlockId).toBe(result.frames[1].check!.result ? 'yes' : 'no')
  }
  const condition = binary('or', atom('blockedLeft'), atom('blockedLeft'))
  expect(run(stage, [branch(condition)]).frames[1].check?.atoms?.map(a => a.path)).toEqual([['left'], ['right']])
  expect(run(stage, [branch(not(atom('blockedLeft')))]).frames[1].check).toMatchObject({ result: false, atoms: [{ value: true, result: false, path: ['operand'] }] })
})
it('rechecks while conditions, handles zero iterations and bounds infinite loops', () => {
  const loop: Block = { id: 'w', type: 'while', condition: atom('blockedLeft'), body: [{ id: 'c', type: 'turnRight' }] }
  expect(run({ ...stage, grid: ['...', 'S.G'] }, [loop]).frames).toHaveLength(2)
  expect(run(stage, [loop]).frames.filter(f => f.event === 'check').map(f => f.check?.result)).toEqual([true, false])
  const infinite = run(stage, [{ ...loop, body: [] }])
  expect(infinite.result).toBe('stepLimit'); expect(infinite.frames).toHaveLength(1001)
})
it('evaluates in functions and checks the geometry of each variant', () => {
  const doc = { main: [{ id: 'call', type: 'call' as const, fn: 'fn' }], functions: [{ id: 'fn', icon: 'star' as const, body: [branch(atom('blockedLeft'))] }] }
  const results = runAll({ ...stage, variants: [stage.grid, ['...', 'S.G']] }, doc).results
  expect(results.map(r => r.frames[1].check?.result)).toEqual([true, false])
  expect(results[0].frames[1].call).toEqual({ callId: 'call', fn: 'fn', serial: 1 })
})
it('validates shape and copies conditions independently during edits and cloning', () => {
  const condition = binary('and', atom('clearAhead'), not(atom('blockedLeft')))
  const original = [branch(condition)]
  const edited = Program.setCondition(original, [0], condition)
  ;(condition as Extract<Condition, { kind: 'and' | 'or' }>).left = atom('blockedAhead')
  expect(edited[0]).not.toEqual(original[0])
  const clone = cloneBlock(original, original[0]); expect(clone.id).not.toBe(original[0].id)
  expect(Program.countBlocks(original)).toBe(3)
  const cycle: Record<string, unknown> = { kind: 'not' }; cycle.operand = cycle
  for (const invalid of [cycle, { kind: 'atom', atom: 'x' }, { kind: 'atom', atom: 'aIsZero' }, { kind: 'atom', atom: 'blockedLeft', extra: true }, not(not(atom('blockedLeft'))), binary('or', binary('and', atom('blockedLeft'), atom('clearAhead')), atom('blockedLeft')), { kind: 'or', left: atom('blockedLeft') }]) {
    expect(validCondition(invalid)).toBe(false)
    expect(validDocument({ main: [{ id: 'x', type: 'if', condition: invalid, body: [] }], functions: [] })).toBe(false)
  }
})
it('rejects logic trees in older stages on v2 restore while preserving progress', () => {
  const data = new Map<string, string>()
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) } }
  const target = unit2Stages[0], other = unit2Stages[1]
  const doc = { main: [branch(binary('and', atom('clearAhead'), not(atom('blockedLeft'))))], functions: [] }
  const repo = new ProgressRepository(storage); repo.completeStage(target.id, 3, doc); repo.completeStage(other.id, 2, [])
  expect(validDocument(doc)).toBe(true)
  expect(new ProgressRepository(storage).getDocument(target)).toEqual({ main: [], functions: [] })
  expect(data.get(progressV2Key)).not.toContain('variables')
  const logicStage = allStages.find(stage => stage.id === 'u6-3')!
  repo.completeStage(logicStage.id, 3, doc)
  expect(new ProgressRepository(storage).getDocument(logicStage)).toEqual({ ...doc, main: normalizeLogicProgram(doc.main) })
  const saved = JSON.parse(data.get(progressV2Key)!)
  saved.stages[logicStage.id].lastProgram.main[0].condition.left.atom = 'unknown'
  data.set(progressV2Key, JSON.stringify(saved))
  const restored = new ProgressRepository(storage)
  expect(restored.getDocument(logicStage)).toEqual({ main: [], functions: [] })
  expect(restored.getProgress().stages[logicStage.id]).toMatchObject({ completed: true, bestStars: 3 })
  expect(restored.getProgress().stages[other.id]).toMatchObject({ completed: true, bestStars: 2 })
})
it('documents old v2 reader rollback and resave loss against a simplified legacy validator (간이 검증기 기준)', () => {
  const oldValid = (condition: unknown) => condition === 'blockedAhead'
  const saved = { version: 2, stages: { [unit2Stages[0].id]: { completed: true, bestStars: 3, lastProgram: { main: [branch(atom('blockedLeft'))], functions: [] } }, 'u6-1': { completed: true, bestStars: 3, lastProgram: { main: [], functions: [] } } } }
  const oldStages = Object.fromEntries(Object.entries(saved.stages).filter(([id]) => allStages.some(s => !s.params && !s.id.startsWith('u6-') && s.id === id)).map(([id, entry]) => [id, { ...entry, lastProgram: oldValid((entry.lastProgram.main[0] as Extract<Block, { type: 'if' }> | undefined)?.condition) ? entry.lastProgram : { main: [], functions: [] } }]))
  const rewritten = JSON.parse(JSON.stringify({ version: 2, stages: oldStages }))
  expect(rewritten.stages[unit2Stages[0].id]).toMatchObject({ completed: true, bestStars: 3, lastProgram: { main: [], functions: [] } })
  expect(rewritten.stages['u6-1']).toBeUndefined()
})
it('preserves all pre-change unit 1–5 solution results and frames', () => {
  const results = Object.fromEntries(allStages.filter(s => !s.params && !s.id.startsWith('u6-')).map(s => [s.id, runAll(s, { main: s.solution, functions: s.solutionFunctions ?? [] })]))
  expect(JSON.parse(JSON.stringify(results, (key, value) => key === 'serial' ? undefined : value))).toEqual(baseline)
})

it('checks robot-relative left and right in every direction, including walls, edges and goals', () => {
  const grid = ['.#..', '.SG.', '....']
  const directions = ['N', 'E', 'S', 'W'] as const
  const left = [false, true, false, false], right = [false, false, false, true]
  for (const [index, startDir] of directions.entries()) {
    const condition = binary('or', atom('blockedLeft'), atom('blockedRight'))
    expect(run({ ...stage, grid, startDir }, [branch(condition)]).frames[1].check?.atoms?.map(a => a.value)).toEqual([left[index], right[index]])
  }
  expect(run(stage, [branch(atom('blockedRight'))]).frames[1].check?.result).toBe(true)
})
it('rejects retired A=0 saves only for the affected stage and preserves completion', () => {
  const data = new Map<string, string>()
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) } }
  const repo = new ProgressRepository(storage)
  const first = allStages.find(s => s.id === 'u6-1')!, second = allStages.find(s => s.id === 'u6-2')!
  repo.completeStage(first.id, 3, first.solution); repo.completeStage(second.id, 3, second.solution)
  const raw = JSON.parse(data.get(progressV2Key)!)
  raw.stages[first.id].lastProgram.main[0].condition = { kind: 'atom', atom: 'aIsZero' }
  data.set(progressV2Key, JSON.stringify(raw))
  const restored = new ProgressRepository(storage)
  expect(restored.getDocument(first).main).toEqual([])
  expect(restored.getProgress().stages[first.id]).toMatchObject({ completed: true, bestStars: 3 })
  expect(restored.getDocument(second).main).toEqual(second.solution)
})

it('normalizes clearAhead throughout unit 6 restores and edits without changing execution', async () => {
  const { EditorController } = await import('../controller/EditorController')
  const target = allStages.find(stage => stage.id === 'u6-3')!
  const conditions: (Condition | 'clearAhead')[] = ['clearAhead', atom('clearAhead'), not(atom('clearAhead')),
    binary('and', atom('clearAhead'), not(atom('clearAhead'))), binary('or', not(atom('clearAhead')), atom('blockedLeft'))]
  for (const condition of conditions) {
    const original: Block[] = [{ id: 'loop', type: 'while', condition, body: [branch(atom('clearAhead'))] }]
    const normalized = normalizeLogicProgram(original)
    expect(JSON.stringify(normalized)).not.toContain('clearAhead')
    expect(validDocument({ main: normalized, functions: [] })).toBe(true)
    expect(normalizeLogicProgram(normalized)).toEqual(normalized)
    const before = runAll(target, original), after = runAll(target, normalized)
    const behavior = (result: ReturnType<typeof runAll>) => result.results.map(run => ({ result: run.result, frames: run.frames.map(({ check, ...frame }) => ({ ...frame, ...(check ? { checkResult: check.result } : {}) })) }))
    expect(behavior(after)).toEqual(behavior(before))
    const raw = JSON.stringify({ version: 2, stages: { [target.id]: { completed: true, bestStars: 3, lastProgram: { main: original, functions: [] } } } })
    const repo = new ProgressRepository({ getItem: key => key === progressV2Key ? raw : null, setItem: () => {} })
    expect(repo.getDocument(target).main).toEqual(normalized)
    const editor = new EditorController(); editor.logicEnabled = true
    editor.configure(original, () => {}, false)
    expect(editor.program).toEqual(normalized)
    editor.select('loop'); editor.setCondition(atom('clearAhead'))
    expect(editor.selectedBlock).toMatchObject({ condition: not(atom('blockedAhead')) })
  }
  const earlier: Block[] = [{ id: 'old', type: 'while', condition: 'clearAhead', body: [] }]
  const editor = new EditorController(); editor.configure(earlier, () => {}, false)
  expect(editor.program).toEqual(earlier)
  const nested: Block[] = [{ id: 'repeat', type: 'repeat', count: 2, body: [branch(not(atom('clearAhead'))) ] }]
  expect(JSON.stringify(normalizeLogicProgram(nested))).not.toContain('clearAhead')
})
