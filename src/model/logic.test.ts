import { expect, it } from 'vitest'
import { GameController } from '../controller/GameController'
import { run, runAll, failurePoint } from './interpreter'
import { Program, FunctionProgram, validDocument, validLogic } from './program'
import { createBlock, cloneBlock } from './editor'
import { ProgressRepository, progressV2Key } from './ProgressRepository'
import { stages, allStages, unit5Stages } from './stages'
import unit5Baseline from './unit5-run.fixture.json'
import type { Block, Logic, Sensor, Stage } from './types'

const base: Stage = { ...stages[0], logic: true, grid: ['###', '#SG', '###'], startDir: 'E' }
const f: Block = { id: 'f', type: 'forward' }
const branch = (logic: Logic, body: Block[] = []): Extract<Block, { type: 'if' }> => ({ id: 'if', type: 'if', condition: 'blockedAhead', logic, body })
const loop = (logic: Logic, body: Block[] = []): Extract<Block, { type: 'while' }> => ({ id: 'while', type: 'while', condition: 'clearAhead', logic, body })
const offsets = [[0, -1], [1, 0], [0, 1], [-1, 0]]

it('evaluates both terms, every truth-table row, not and relative side sensors in all directions', () => {
  for (const [direction, dir] of (['N', 'E', 'S', 'W'] as const).entries()) {
    for (const left of [false, true]) for (const right of [false, true]) {
      const grid = ['G..', '.S.', '...'].map(row => [...row])
      for (const [relative, blocked] of [[3, left], [1, right]] as const) {
        const [dx, dy] = offsets[(direction + relative) % 4]
        grid[1 + dy][1 + dx] = blocked ? '#' : '.'
      }
      for (const op of ['and', 'or'] as const) for (const not of [false, true]) {
        const logic: Logic = { terms: [{ sensor: 'blockedLeft', ...(not ? { not: true } : {}) }, { sensor: 'blockedRight' }], op }
        const result = run({ ...base, startDir: dir, grid: grid.map(row => row.join('')) }, [branch(logic)])
        const value = not ? !left : left
        expect(result.frames).toHaveLength(2)
        expect(result.frames[1].check).toEqual({ blockId: 'if', condition: 'blockedAhead', result: op === 'and' ? value && right : value || right,
          logic: { terms: [{ sensor: 'blockedLeft', not, sensed: left, value }, { sensor: 'blockedRight', not: false, sensed: right, value: right }], op } })
      }
    }
  }
})
it('treats edges as blocked for all three sensors and preserves one check per test', () => {
  for (const sensor of ['blockedAhead', 'blockedLeft', 'blockedRight'] as Sensor[]) {
    const result = run({ ...base, grid: ['SG'], startDir: 'W' }, [branch({ terms: [{ sensor }] })])
    expect(result.frames[1].check).toMatchObject({ result: true, logic: { terms: [{ sensed: true, value: true, not: false }] } })
  }
  const yes = branch({ terms: [{ sensor: 'blockedAhead', not: true }] }, [f])
  const no: Block = { ...branch({ terms: [{ sensor: 'blockedAhead' }] }), else: [f] }
  expect(run(base, [yes]).result).toBe('success')
  expect(run(base, [no]).result).toBe('success')
})
it('supports zero and repeated while checks, else and step-limit attribution', () => {
  expect(run(base, [loop({ terms: [{ sensor: 'blockedAhead' }] }, [f])]).frames).toHaveLength(2)
  const result = run({ ...base, grid: ['S..#G'] }, [loop({ terms: [{ sensor: 'blockedAhead', not: true }] }, [f])])
  expect(result.result).toBe('unfinished')
  expect(result.frames.filter(frame => frame.check).map(frame => frame.check!.result)).toEqual([true, true, false])
  expect(result.frames.at(-1)?.pos).toEqual({ x: 2, y: 0 })
  const endless = run(base, [loop({ terms: [{ sensor: 'blockedRight' }] })])
  expect(endless.result).toBe('stepLimit')
  expect(endless.frames).toHaveLength(1001)
  expect(failurePoint(endless)?.blockId).toBe('while')
  const bodyLimit = run(base, [loop({ terms: [{ sensor: 'blockedAhead', not: true }] }, [{ id: 'spin', type: 'repeat', count: 8, body: [{ id: 'r', type: 'turnRight' }] }])])
  expect(bodyLimit.result).toBe('stepLimit')
  expect(failurePoint(bodyLimit)?.blockId).toBe('while')
})
it('creates optional defaults and immutably edits nested conditions through document history', () => {
  expect(createBlock([], 'if')).not.toHaveProperty('logic')
  expect(createBlock([], 'while', { logic: true })).toMatchObject({ logic: { terms: [{ sensor: 'blockedAhead', not: true }] } })
  expect(new Program().create('if', { logic: true })).toMatchObject({ logic: { terms: [{ sensor: 'blockedAhead' }] } })
  const initial = new FunctionProgram().createFunction()
  const block = initial.create('if', '', { logic: true })
  const before = initial.add(block, [], 'function-1')
  let after = before.edit(body => Program.addLogicTerm(body, [0], 'and'), 'function-1')
  after = after.edit(body => Program.setLogicSensor(body, [0], 1, 'blockedLeft'), 'function-1')
  after = after.edit(body => Program.toggleLogicNot(body, [0], 0), 'function-1')
  after = after.edit(body => Program.setLogicOperator(body, [0], 'or'), 'function-1')
  expect(after.toDocument().functions[0].body[0]).toMatchObject({ logic: { terms: [{ sensor: 'blockedAhead', not: true }, { sensor: 'blockedLeft' }], op: 'or' } })
  expect(before.toDocument().functions[0].body[0]).toMatchObject({ logic: { terms: [{ sensor: 'blockedAhead' }] } })
  expect(after.count()).toBe(before.count())
  expect(before.toDocument()).toEqual(initial.add(block, [], 'function-1').toDocument())
  const single = after.edit(body => Program.removeLogicTerm(body, [0]), 'function-1')
  expect(single.toDocument().functions[0].body[0]).toMatchObject({ logic: { terms: [{ sensor: 'blockedAhead', not: true }] } })
  expect(single.toDocument().functions[0].body[0]).not.toHaveProperty('logic.op')
  const plain = [branch({ terms: [{ sensor: 'blockedAhead' }] })]
  expect(Program.toggleLogicNot(Program.toggleLogicNot(plain, [0], 0), [0], 0)).toEqual(plain)
  for (const edit of [() => Program.setLogicSensor(plain, [0], 1, 'blockedRight'), () => Program.setLogicOperator(plain, [0], 'and'), () => Program.toggleLogicNot([f], [0], 0)]) expect(edit).toThrow()
  const copy = cloneBlock(plain, plain[0])
  if (copy.type === 'if') copy.logic!.terms[0].sensor = 'blockedRight'
  expect(plain[0]).toMatchObject({ logic: { terms: [{ sensor: 'blockedAhead' }] } })
})
it('strictly validates logic shape and stage allowance; isolates code while preserving stars', () => {
  const good: Logic = { terms: [{ sensor: 'blockedLeft', not: true }, { sensor: 'blockedRight' }], op: 'and' }
  for (const logic of [{ terms: [] }, { terms: Array(3).fill({ sensor: 'blockedAhead' }), op: 'and' }, { terms: good.terms }, { terms: [good.terms[0]], op: 'or' }, { terms: [{ sensor: 'other' }] }, { terms: [{ sensor: 'blockedAhead', not: false }] }, { terms: [{ sensor: 'blockedAhead', not: undefined }] }, { terms: [{ sensor: 'blockedAhead', extra: true }] }, { ...good, extra: 1 }, null]) {
    expect(validLogic(logic)).toBe(false)
    expect(validDocument({ main: [{ ...branch(good), logic }], functions: [] })).toBe(false)
  }
  const doc = { main: [branch(good)], functions: [] }
  expect(validDocument(doc, undefined, true, true)).toBe(true)
  expect(validDocument(doc, undefined, true, false)).toBe(false)
  expect(validDocument({ main: [{ ...f, logic: good }], functions: [] })).toBe(false)
  const data = new Map<string, string>()
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) } }
  // T52 registers real logic stages. Temporarily enable an existing stage policy
  // without adding a stage to production or changing the stored schema.
  const stage = allStages.find(stage => stage.id === 'u2-1')!
  const original = stage.logic
  try {
    stage.logic = true
    new ProgressRepository(storage).completeStage(stage.id, 3, doc)
    expect(new ProgressRepository(storage).getDocument(stage)).toEqual(doc)
    expect(JSON.parse(data.get(progressV2Key)!).version).toBe(2)
    delete stage.logic
    const repo = new ProgressRepository(storage)
    expect(repo.getDocument(stage)).toEqual({ main: [], functions: [] })
    expect(repo.getProgress().stages[stage.id]).toMatchObject({ completed: true, bestStars: 3 })
  } finally {
    if (original) stage.logic = original
    else delete stage.logic
  }
})
it('retains unit 5 execution when logic is absent or just stage-enabled', () => {
  for (const stage of unit5Stages) {
    expect(runAll(stage, stage.solution)).toEqual(unit5Baseline[stage.id as keyof typeof unit5Baseline])
    expect(runAll({ ...stage, logic: true }, stage.solution)).toEqual(unit5Baseline[stage.id as keyof typeof unit5Baseline])
  }
})

it('restores logic edits with the existing one-step game undo and saves the restored document', () => {
  const repository = new ProgressRepository()
  const initial = [branch({ terms: [{ sensor: 'blockedAhead' }] })]
  repository.saveProgram(base.id, initial)
  const game = new GameController(base, repository)
  try {
    game.edit(Program.addLogicTerm(initial, [0], 'and'))
    expect(game.canUndo).toBe(true)
    expect(game.getSnapshot().program[0]).toHaveProperty('logic.op', 'and')
    game.undo()
    expect(game.getSnapshot().program).toEqual(initial)
    expect(repository.getDocument(base)).toEqual({ main: initial, functions: [] })
    expect(game.canUndo).toBe(false)
  } finally { game.dispose() }
})
