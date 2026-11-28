import { expect, it } from 'vitest'
import { allStages, unit11Stages, unit12Stages } from './stages'
import { failurePoint, run, runAll } from './interpreter'
import { countBlocks, validDocument } from './program'
import baseline from './unit12345678910-run.fixture.json'
import type { Block, Program, Stage } from './types'
import { ProgressRepository, progressV2Key, progressV4Key, isUnlocked } from './ProgressRepository'
import { continueStageIndex } from '../controller/flow'
import { GameController } from '../controller/GameController'

it('preserves all 41 unit 1–10 solutions and all 69 maps frame for frame', () => {
  expect(baseline).toHaveLength(41)
  expect(baseline.reduce((n, entry) => n + entry.execution.results.length, 0)).toBe(69)
  for (const entry of baseline) {
    const stage = allStages.find(stage => stage.id === entry.id)!
    expect(runAll(stage, { main: stage.solution, functions: stage.solutionFunctions ?? [] })).toEqual(entry.execution)
  }
})
const comparisons = (stage: Stage, program: Program) => runAll(stage, program).results.map(r => r.frames.at(-1)?.search?.count)
it('solves six maps with 3/3, 1/2, 2/1 comparisons and repairs the 4/5 comparison initial code', () => {
  for (const [index, stage] of unit11Stages.entries()) {
    expect(runAll(stage, stage.solution).results.map(r => r.result)).toEqual(['success', 'success'])
    expect(comparisons(stage, stage.solution)).toEqual([[3, 3], [1, 2], [2, 1]][index])
    expect(runAll(stage, stage.solution).results.map(r => r.frames.at(-1)?.search?.foundIndex)).toEqual([[0, 2], [0, 1], [3, 4]][index])
    expect(countBlocks(stage.solution)).toBe(stage.maxBlocks)
    expect(stage.palette).toEqual(['forward', 'forEach', 'if', 'breakForEach'])
    expect(stage.variantVariables).toEqual([{ A: 0 }, { A: 0 }])
    expect(stage.startDir).toBe('E')
    expect(stage.variants).toEqual([['SG'], ['SG']])
    expect(stage.search?.target).toBe(7)
  }
  const stage = unit11Stages[2]
  expect(comparisons(stage, stage.initialProgram!)).toEqual([4, 5])
  const execution = runAll(stage, stage.initialProgram!)
  expect(execution.results.map(r => r.result)).toEqual(['comparisonLimit', 'comparisonLimit'])
  expect(failurePoint(execution)).toMatchObject({ blockId: 'each', variant: 0 })
})

// All ordered forests, including empty bodies, repeated/nested traversals,
// both directions, and every placement allowed by the lexical scope rules.
function forests(size: number, inEach: boolean, excluded = '', directions: ('front' | 'back')[] = ['front', 'back']): Program[] {
  if (size === 0) return [[]]
  const output: Program[] = []
  for (let cost = 1; cost <= size; cost++) {
    const heads: Block[] = []
    if (cost === 1) {
      if (!inEach) heads.push({ id: '', type: 'forward' })
      if (inEach && excluded !== 'break') heads.push({ id: '', type: 'breakForEach' })
    }
    for (const body of forests(cost - 1, true, excluded, directions)) {
      for (const direction of excluded === 'new' ? ['front'] as const : directions) heads.push({ id: '', type: 'forEach', direction, body })
    }
    if (inEach && excluded !== 'comparison' && excluded !== 'new') {
      for (let bodySize = 0; bodySize < cost; bodySize++) for (const body of forests(bodySize, true, excluded, directions)) for (const alternative of forests(cost - 1 - bodySize, true, excluded, directions)) heads.push({ id: '', type: 'if', condition: { kind: 'atom', atom: 'matchesTarget' }, body, ...(alternative.length ? { else: alternative } : {}) })
    }
    // The old grammar has no break either.
    for (const head of heads.filter(b => excluded !== 'new' || b.type !== 'breakForEach')) for (const tail of forests(size - cost, inEach, excluded, directions)) output.push([head, ...tail])
  }
  return output
}
function identify(program: Program): Program {
  let serial = 0
  const copy = (blocks: Program): Program => blocks.map(block => ({ ...structuredClone(block), id: `p${++serial}`, ...('body' in block ? { body: copy(block.body) } : {}), ...(block.type === 'if' && block.else ? { else: copy(block.else) } : {}) }))
  return copy(program)
}
for (const stage of unit11Stages) it(`exhausts all legal code trees for ${stage.id}`, () => {
  const totals: number[] = []
  for (const excluded of ['', 'new', 'comparison', 'break']) {
    const candidates = Array.from({ length: stage.maxBlocks! + 1 }, (_, n) => forests(n, false, excluded, [stage.id === 'u11-3' ? 'back' : 'front'])).flat().map(identify)
    totals.push(candidates.length)
    let success = 0
    for (const candidate of candidates) {
      expect(validDocument({ main: candidate, functions: [] }, stage.palette, false, false, false, false, false, true, true)).toBe(true)
      if (runAll(stage, candidate).result === 'success') success++
    }
    if (excluded === '' || excluded === 'break' && stage.id === 'u11-1') expect(success).toBe(1)
    else expect(success).toBe(0)
  }
  expect(totals).toEqual(stage.maxBlocks === 3 ? [48, 22, 31, 35] : [325, 64, 121, 185])
})

for (const stage of unit11Stages) it(`also exhausts both directions and if/else for ${stage.id}`, () => {
  const totals: number[] = []
  for (const excluded of ['', 'new', 'comparison', 'break']) {
    const candidates = Array.from({ length: stage.maxBlocks! + 1 }, (_, n) => forests(n, false, excluded)).flat().map(identify)
    totals.push(candidates.length)
    let success = 0
    for (const candidate of candidates) {
      expect(validDocument({ main: candidate, functions: [] }, stage.palette, false, false, false, false, false, true, true)).toBe(true)
      if (runAll(stage, candidate).result === 'success') success++
    }
    if (excluded === '' || excluded === 'break' && stage.id === 'u11-1') expect(success).toBeGreaterThan(0)
    else expect(success).toBe(0)
  }
  expect(totals).toEqual(stage.maxBlocks === 3 ? [160, 22, 112, 124] : [1577, 64, 757, 1039])
})

it('rejects invalid search scope and nested forward in storage and execution, preserving awards and other code', () => {
  const stage = unit11Stages[0]
  const each: Block = { id: 'e', type: 'forEach', body: [] }
  const match: Block = { id: 'i', type: 'if', condition: { kind: 'atom', atom: 'matchesTarget' }, body: [] }
  const invalid: unknown[] = [
    [{ id: 'b', type: 'breakForEach' }], [match], [{ ...each, direction: 'sideways' }],
    [{ ...each, body: [{ id: 'f', type: 'forward' }] }],
    [{ ...each, body: [{ ...match, body: [{ id: 'f', type: 'forward' }] }] }],
    [{ ...each, body: [{ ...match, else: [{ id: 'f', type: 'forward' }] }] }],
    [{ ...each, body: [{ ...match, condition: { kind: 'atom', atom: 'blockedAhead' } }] }],
  ]
  for (const bad of invalid) {
    expect(() => run(stage, bad as Program)).toThrow()
    const raw = JSON.stringify({ version: 2, stages: { [stage.id]: { completed: true, bestStars: 3, lastProgram: { main: bad, functions: [] } }, 'u11-2': { completed: false, bestStars: 2, lastProgram: { main: unit11Stages[1].solution, functions: [] } } } })
    const repo = new ProgressRepository({ getItem: key => key === progressV2Key ? raw : null, setItem: () => {} })
    expect(repo.getDocument(stage)).toEqual({ main: [], functions: [] })
    expect(repo.getProgress().stages[stage.id]).toMatchObject({ completed: true, bestStars: 3 })
    expect(repo.getDocument(unit11Stages[1]).main).toEqual(unit11Stages[1].solution)
  }
  for (const old of allStages.filter(s => !s.search)) {
    for (const main of [[{ ...each, direction: 'front' }], [{ ...each, body: [match] }], [{ ...each, body: [{ id: 'b', type: 'breakForEach' }] }]]) {
      const raw = JSON.stringify({ version: 2, stages: { [old.id]: { completed: true, bestStars: 2, lastProgram: { main, functions: [] } } } })
      const repo = new ProgressRepository({ getItem: key => key === progressV2Key ? raw : null, setItem: () => {} })
      expect(repo.getDocument(old)).toEqual({ main: [], functions: [] })
      expect(repo.getProgress().stages[old.id].completed).toBe(true)
    }
  }
})
it('breaks only the innermost traversal, restoring the outer current and loop scope', () => {
  const stage = { ...unit11Stages[0], variants: undefined, lists: [[7, 2]], grid: ['S#G'] }
  const program: Program = [{ id: 'outer', type: 'forEach', body: [
    { id: 'inner', type: 'forEach', direction: 'back', body: [{ id: 'b', type: 'breakForEach' }] },
    { id: 'compare', type: 'if', condition: { kind: 'atom', atom: 'matchesTarget' }, body: [] },
  ] }]
  const execution = run(stage, program)
  expect(execution.frames.filter(f => f.activeBlockId === 'compare').map(f => f.search?.comparison?.value)).toEqual([7, 2])
  expect(execution.frames.filter(f => f.activeBlockId === 'compare').map(f => f.loops?.map(l => l.blockId))).toEqual([['outer'], ['outer']])
  expect(execution.frames.at(-1)?.list).toEqual({})
  expect(run(stage, [{ id: 'f', type: 'forward' }]).result).toBe('collision')
  expect(run(unit11Stages[0], [{ id: 'f', type: 'forward' }]).result).toBe('unfinished')
})
it('charges comparisons and breaks against the step budget', () => {
  // Deeply nested one-element traversals restore scope even when each breaks.
  const stage = { ...unit11Stages[0], variants: undefined, lists: [[7]], grid: ['S#G'] }
  let block: Block = { id: 'last', type: 'if', condition: { kind: 'atom', atom: 'matchesTarget' }, body: [] }
  for (let n = 0; n < 9; n++) block = { id: `e${n}`, type: 'forEach', body: [block, { id: `b${n}`, type: 'breakForEach' }] }
  expect(run(stage, [block]).result).toBe('unfinished')
  // Repeated visits/comparisons with no movement must still terminate safely.
  let large: Block = { id: 'match', type: 'if', condition: { kind: 'atom', atom: 'matchesTarget' }, body: [] }
  for (let n = 0; n < 8; n++) large = { id: `loop${n}`, type: 'forEach', body: [large] }
  const limited = run({ ...stage, lists: [[7, 2, 3, 4, 5]] }, [large])
  expect(limited.result).toBe('stepLimit')
  const charged = (frames: typeof limited.frames) => frames.filter(f => f.event === 'check' || f.activeBlockId !== null && f.activeBlockId === f.list?.current?.blockId || f.activeBlockId === 'stop').length
  expect(charged(limited.frames)).toBe(1000)
  let breaking: Block = { id: 'innermost', type: 'forEach', body: [{ id: 'stop', type: 'breakForEach' }] }
  for (let n = 0; n < 7; n++) breaking = { id: `outside${n}`, type: 'forEach', body: [breaking] }
  const broken = run({ ...stage, lists: [[7, 2, 3, 4, 5]] }, [breaking])
  expect(broken.result).toBe('stepLimit')
  expect(charged(broken.frames)).toBe(1000)
  expect(broken.frames.some(f => f.activeBlockId === 'stop')).toBe(true)
})
it('opens after unit10, edits direction with undo, enforces insertion scope, and saves both-map completion in v2', () => {
  let raw = ''
  const repo = new ProgressRepository({ getItem: key => key === (JSON.parse(raw || 'null')?.version === 4 ? progressV4Key : progressV2Key) ? raw || null : null, setItem: (key, value) => { if (key === progressV4Key) raw = value } })
  for (const stage of allStages.slice(0, allStages.indexOf(unit11Stages[0]) - 1)) repo.completeStage(stage.id, 3, [])
  expect(isUnlocked(repo.getProgress(), allStages.indexOf(unit11Stages[0]))).toBe(false)
  repo.completeStage('u10-3', 3, [])
  for (const stage of unit11Stages) {
    expect(continueStageIndex(repo.getProgress())).toBe(allStages.indexOf(stage))
    expect(isUnlocked(repo.getProgress(), allStages.indexOf(stage))).toBe(true)
    const game = new GameController(stage, repo)
    if (stage.id === 'u11-1') {
      game.editor.add('if'); game.editor.add('breakForEach'); expect(game.getSnapshot().program).toEqual([])
      game.editor.add('forEach'); game.editor.select('block-1'); game.editor.toggleTarget()
      game.editor.add('forward'); expect(countBlocks(game.getSnapshot().program)).toBe(1)
      game.editor.add('if'); expect(countBlocks(game.getSnapshot().program)).toBe(2)
    }
    if (stage.id === 'u11-3') {
      game.editor.select('each'); game.editor.toggleDirection()
      expect(game.getSnapshot().program).toEqual(stage.solution)
      game.undo(); expect(game.getSnapshot().program).toEqual(stage.initialProgram)
    }
    game.edit(stage.solution); game.step()
    expect(repo.getProgress().stages[stage.id]?.completed).not.toBe(true)
    while (!game.finished) game.step()
    expect(game.result).toBe('success')
    expect(repo.getProgress().stages[stage.id].bestStars).toBe(0)
    expect(new ProgressRepository({ getItem: key => key === progressV4Key ? raw : null, setItem: () => {} }).getDocument(stage).main).toEqual(stage.solution)
    expect(JSON.parse(raw).version).toBe(4)
    game.reset(); expect(game.frame?.search).toBeUndefined()
    game.selectVariant(1); expect(game.frame?.search).toBeUndefined()
    game.dispose()
  }
  expect(continueStageIndex(repo.getProgress())).toBe(allStages.indexOf(unit12Stages[0]))
})
