import { expect, it } from 'vitest'
import { allStages, unit9Stages, unit10Stages, isLastStage } from './stages'
import { run, runAll, supplySignal } from './interpreter'
import { countBlocks, validDocument } from './program'
import { ProgressRepository, progressV2Key, isUnlocked } from './ProgressRepository'
import { GameController } from '../controller/GameController'
import { continueStageIndex } from '../controller/flow'
import baseline from './unit12345678-run.fixture.json'
import type { Block, EventState, ProgramDocument } from './types'

it('preserves all unit 1–8 frames and results from the pre-resume interpreter', () => {
  expect(baseline).toHaveLength(35)
  for (const entry of baseline) {
    const stage = allStages.find(stage => stage.id === entry.id)!
    expect(runAll(stage, { main: stage.solution, functions: stage.solutionFunctions ?? [] })).toEqual(entry.execution)
  }
})
it('solves all six scenarios within budget; swapped repair code collides in the first scenario', () => {
  for (const stage of unit9Stages) {
    expect(runAll(stage, stage.solution).results.map(result => result.result)).toEqual(['success', 'success'])
    expect(countBlocks(stage.solution)).toBe(stage.maxBlocks)
    expect(runAll(stage, [...stage.solution].reverse())).toEqual(runAll(stage, stage.solution))
  }
  const execution = runAll(unit9Stages[2], unit9Stages[2].initialProgram!)
  expect(execution.results[0].result).toBe('collision')
  expect(execution.results[0].frames.at(-1)).toMatchObject({ dir: 'N', pos: { x: 1, y: 2 }, events: { handler: { signal: '◇' } } })
})
it('supplies only after main/handler completion; opens devices before dispatch, skips unconnected signals', () => {
  const stage = unit9Stages[1]
  const execution = runAll(stage, stage.solution).results[1]
  const frames = execution.frames
  expect(frames.filter(frame => frame.events?.phase === 'arrival').map(frame => frame.events?.signal)).toEqual(['◇', '△', '○'])
  expect(frames.filter(frame => frame.events?.phase === 'start').map(frame => frame.events?.handler?.signal)).toEqual(['◇', '○'])
  const unconnected = frames.find(frame => frame.events?.phase === 'unconnected')!
  expect(unconnected).toMatchObject({ pos: { x: 3, y: 1 }, events: { signal: '△', doors: { a: true, b: false }, queue: [] } })
  expect(frames.find(frame => frame.events?.phase === 'arrival')).toMatchObject({ events: { cursor: 1, queue: ['◇'], doors: { a: true, b: false } } })
  const empty = run({ ...stage, signals: [[]] }, stage.solution)
  expect(empty.result).toBe('unfinished')
  expect(empty.frames).toHaveLength(1)
  expect(empty.frames[0].events?.doors).toEqual({ a: false, b: false })
  const mainCollision = run(stage, [{ id: 'main', type: 'forward' }, ...stage.solution])
  expect(mainCollision.result).toBe('collision')
  expect(mainCollision.frames.every(frame => frame.events?.cursor === 0)).toBe(true)
  const noHandler = run(unit9Stages[0], [])
  expect(noHandler.result).toBe('unfinished') // main is never rerun after doors open
  expect(noHandler.frames.at(-1)?.events?.doors.a).toBe(true)
  const blockedBody: Block[] = [{ id: 'd', type: 'on', signal: '◇', body: [{ id: 'r', type: 'repeat', count: 3, body: [{ id: 'f', type: 'forward' }] }] }]
  expect(run(stage, blockedBody).result).toBe('collision') // circle cannot arrive during diamond body
})
it('bounds queue/publications without mutation on overflow; bounds empty handlers and loops', () => {
  const state: EventState = { cursor: 0, queue: [], doors: { a: false, b: false }, phase: 'idle' }
  for (let i = 0; i < 64; i++) expect(supplySignal(state, '△')).toBe(true)
  const full = structuredClone(state)
  expect(supplySignal(state, '◇')).toBe(false)
  expect(state).toEqual(full)
  state.queue = []
  state.cursor = 127
  expect(supplySignal(state, '◇')).toBe(true)
  state.queue = []
  const exhausted = structuredClone(state)
  expect(supplySignal(state, '○')).toBe(false)
  expect(state).toEqual(exhausted)
  const stage = { ...unit9Stages[0], signals: [Array(129).fill('△')] }
  const execution = run(stage, [{ id: 't', type: 'on', signal: '△', body: [] }])
  expect(execution.result).toBe('stepLimit')
  expect(execution.frames.at(-1)?.events?.cursor).toBe(128)
  expect(execution.frames.filter(frame => frame.events?.phase === 'end')).toHaveLength(128)
  const loop: Block = { id: 'r1', type: 'repeat', count: 10, body: [{ id: 'r2', type: 'repeat', count: 10, body: [{ id: 'r3', type: 'repeat', count: 10, body: [{ id: 'r4', type: 'repeat', count: 10, body: [] }] }] }] }
  expect(run(stage, [loop]).result).toBe('stepLimit')
  const turns = structuredClone(loop)
  if (turns.type === 'repeat') turns.body = [{ id: 'turn', type: 'repeat', count: 10, body: [{ id: 'deep', type: 'repeat', count: 10, body: [{ id: 'l', type: 'turnLeft' }] }] }]
  expect(run(stage, [turns]).result).toBe('stepLimit')
})
it('exhausts all on-free syntax transformations: 5 transformations, 0 success, independent of budget', () => {
  // Domain: N/E/S/W at S, absorbing collision (4), absorbing goal (5).
  // Primitive transitions come from the real closed-door maps. Identity includes
  // empty bodies. Composition/powers close arbitrary sequence/repeat nesting.
  for (const stage of unit9Stages) {
    const dirs = ['N', 'E', 'S', 'W'] as const
    const identity = [0, 1, 2, 3, 4, 5]
    const transforms = [identity, ...(['forward', 'turnLeft', 'turnRight'] as const).map(type => [
      ...dirs.map(startDir => {
        const execution = run({ ...stage, startDir, signals: [[]] }, [{ id: 'primitive', type }])
        if (execution.result === 'collision') return 4
        if (execution.result === 'success') return 5
        expect(execution.frames.at(-1)?.pos).toEqual(execution.frames[0].pos)
        return dirs.indexOf(execution.frames.at(-1)!.dir)
      }), 4, 5,
    ])]
    const seen = new Set(transforms.map(t => t.join(',')))
    const add = (t: number[]) => { const key = t.join(','); if (!seen.has(key)) { seen.add(key); transforms.push(t) } }
    const compose = (a: number[], b: number[]) => a.map(state => b[state])
    for (let i = 0; i < transforms.length; i++) {
      for (let j = 0; j < transforms.length; j++) add(compose(transforms[i], transforms[j]))
      let power = identity
      for (let count = 1; count <= 10; count++) { power = compose(power, transforms[i]); if (count >= 2) add(power) }
    }
    expect(seen.size).toBe(5)
    expect(transforms.filter(t => t[1] === 5)).toHaveLength(0)
    // Once main ends it cannot move again, even after a signal opens a door.
    expect(run(stage, []).result).toBe('unfinished')
  }
})
it('rejects nested/duplicate/unknown connections and isolates v2 corruption while retaining progress', () => {
  const stage = unit9Stages[0]
  const good: ProgramDocument = { main: stage.solution, functions: [] }
  const invalid: ProgramDocument[] = [
    { main: [{ id: 'outer', type: 'repeat', count: 2, body: stage.solution }], functions: [] },
    { main: [...stage.solution, { id: 'other', type: 'on', signal: '◇', body: [] }], functions: [] },
    { main: [{ id: 'bad', type: 'on', signal: '?' as '◇', body: [] }], functions: [] },
    { main: [], functions: [{ id: 'star', icon: 'star', body: stage.solution }] },
  ]
  expect(validDocument(good)).toBe(true)
  for (const bad of invalid) {
    expect(validDocument(bad)).toBe(false)
    expect(() => run(stage, bad)).toThrow()
    const raw = JSON.stringify({ version: 2, stages: { 'u9-1': { completed: true, bestStars: 3, lastProgram: bad }, 'u9-2': { completed: false, bestStars: 0, lastProgram: good } } })
    const repo = new ProgressRepository({ getItem: key => key === progressV2Key ? raw : null, setItem: () => {} })
    expect(repo.getDocument(stage)).toEqual({ main: [], functions: [] })
    expect(repo.getProgress().stages['u9-1']).toMatchObject({ completed: true, bestStars: 3 })
    expect(repo.getDocument(unit9Stages[1])).toEqual(good)
  }
  expect(() => run({ ...stage, events: undefined }, good.main)).toThrow()
  let raw = ''
  const storage = { getItem: (key: string) => key === progressV2Key ? raw || null : null, setItem: (_key: string, value: string) => { raw = value } }
  const repo = new ProgressRepository(storage)
  repo.saveProgram(stage.id, good)
  expect(JSON.parse(raw).version).toBe(2)
  expect(new ProgressRepository(storage).getDocument(stage)).toEqual(good)
  const oldStage = allStages[0]
  raw = JSON.stringify({ version: 2, stages: { [oldStage.id]: { completed: true, bestStars: 3, lastProgram: good } } })
  expect(new ProgressRepository(storage).getDocument(oldStage)).toEqual({ main: [], functions: [] })
})
it('opens after unit8, edits connections/body with undo and saves only after both scenarios finish', () => {
  const repo = new ProgressRepository()
  for (const stage of allStages.slice(0, allStages.indexOf(unit9Stages[0]) - 1)) repo.completeStage(stage.id, 3, stage.solution)
  expect(isUnlocked(repo.getProgress(), allStages.indexOf(unit9Stages[0]))).toBe(false)
  repo.completeStage('u8-3', 3, [])
  for (const stage of unit9Stages) {
    expect(continueStageIndex(repo.getProgress())).toBe(allStages.indexOf(stage))
    expect(isUnlocked(repo.getProgress(), allStages.indexOf(stage))).toBe(true)
    const game = new GameController(stage, repo)
    if (stage.initialProgram) {
      const before = structuredClone(game.getSnapshot().program)
      game.editor.select(before[0].id)
      game.editor.setSignal('◇')
      expect(game.getSnapshot().program).toEqual(stage.solution)
      game.undo()
      expect(game.getSnapshot().program).toEqual(before)
    } else {
      game.editor.add('on')
      const id = game.getSnapshot().program[0].id
      game.editor.select(id)
      game.editor.toggleTarget()
      game.editor.add('on') // nested declaration refused
      expect(game.getSnapshot().program).toHaveLength(1)
      game.editor.add('forward')
      expect(countBlocks(game.getSnapshot().program)).toBe(2)
      game.undo()
      expect(countBlocks(game.getSnapshot().program)).toBe(1)
    }
    game.edit(stage.solution)
    game.step()
    expect(repo.getProgress().stages[stage.id]?.completed).not.toBe(true)
    while (!game.finished) game.step()
    expect(game.result).toBe('success')
    expect(repo.getProgress().stages[stage.id].bestStars).toBe(3)
    game.dispose()
  }
  expect(isLastStage(allStages.indexOf(unit9Stages[2]))).toBe(true)
  expect(continueStageIndex(repo.getProgress())).toBe(allStages.indexOf(unit10Stages[0]))
})
