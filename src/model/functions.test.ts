import { expect, it } from 'vitest'
import { run, runAll, failurePoint } from './interpreter'
import { FunctionProgram, validDocument, Program } from './program'
import { ProgressRepository, progressV2Key } from './ProgressRepository'
import { GameController } from '../controller/GameController'
import baseline from './unit123-run.fixture.json'
import { allStages, stages, unit4Stages } from './stages'
import type { Block, ProgramDocument, Stage } from './types'

const f: Block = { id: 'f', type: 'forward' }
const call: Block = { id: 'c', type: 'call', fn: 'fn' }
const doc = (main: Block[] = [call], body: Block[] = [f]): ProgramDocument => ({ main, functions: [{ id: 'fn', icon: 'star', body }] })
const stage: Stage = { ...stages[0], grid: ['S..G'], startDir: 'E', variants: undefined }

it('executes only calls, returns to main, and can call the same definition repeatedly', () => {
  expect(run(stage, doc([])).frames).toHaveLength(1)
  const result = run(stage, doc([call, { ...call, id: 'c2' }, { id: 'end', type: 'forward' }]))
  expect(result.result).toBe('success')
  expect(result.frames.slice(1).map(frame => frame.call)).toEqual([{ callId: 'c', fn: 'fn', serial: 1 }, { callId: 'c2', fn: 'fn', serial: 2 }, undefined])
  expect(result.frames.slice(1).map(frame => frame.activeBlockId)).toEqual(['f', 'f', 'end'])
})

it('retains nested loops and checks and attributes collisions to the body and call', () => {
  const body: Block[] = [{ id: 'repeat', type: 'repeat', count: 2, body: [{ id: 'if', type: 'if', condition: 'blockedAhead', body: [f], else: [{ id: 'right', type: 'turnRight' }] }] }]
  const result = run({ ...stage, grid: ['S#G'] }, doc([call], body))
  expect(result.result).toBe('collision')
  expect(result.frames[1].check?.result).toBe(true)
  expect(result.frames[2].loops).toEqual([{ blockId: 'repeat', iteration: 1, count: 2 }])
  expect(failurePoint(result)).toMatchObject({ blockId: 'f', call: { callId: 'c', fn: 'fn' } })
  const limited = run(stage, doc([call], [{ id: 'while', type: 'while', condition: 'clearAhead', body: [] }]))
  expect(failurePoint(limited)).toMatchObject({ blockId: 'while', call: { callId: 'c', fn: 'fn' } })
  expect(limited.frames.at(-1)?.loops?.[0].iteration).toBe(1000)
  const moving = run(stage, doc([call], [{ id: 'while', type: 'while', condition: 'clearAhead', body: [f] }]))
  expect(moving.result).toBe('success')
  expect(moving.frames.filter(frame => frame.check)).toHaveLength(3)
})

it('rejects recursive calls at any depth, missing functions and invalid definitions', () => {
  for (const invalid of [doc([call], [call]), doc([call], [{ id: 'r', type: 'repeat', count: 2, body: [call] }]), { ...doc(), functions: [] }, { ...doc(), functions: [...doc().functions, ...doc().functions] }, { ...doc(), functions: [{ id: 'fn', icon: 'sun', body: [] }] }]) {
    expect(validDocument(invalid)).toBe(false)
    expect(() => run(stage, invalid as ProgramDocument)).toThrow()
  }
  expect(validDocument(doc([call], [{ ...f, id: 'c' }]))).toBe(false)
})

it('shares block limits, IDs and immutable tree edits between main and definitions', () => {
  let model = new FunctionProgram().createFunction().createFunction().createFunction()
  expect(model.toDocument().functions.map(fn => fn.icon)).toEqual(['star', 'moon'])
  const id = model.toDocument().functions[0].id
  model = model.add(f, [], id).duplicate([0], id)
  expect(model.count()).toBe(2)
  expect(model.toDocument().functions[0].body[1].id).not.toBe('f')
  model = model.move([1], 'up', id).remove([1], id)
  expect(model.count()).toBe(1)
  expect(model.create('forward').id).not.toBe(model.toDocument().functions[0].body[0].id)
  for (let n = 0; n < 12; n++) model = model.add(model.create('forward'))
  expect(model.count()).toBe(10)
  expect(model.add(model.create('forward'), [], id).count()).toBe(10)
  const copy = model.toDocument(); copy.functions[0].body.length = 0
  expect(model.count()).toBe(10)
  expect(() => new FunctionProgram(doc()).add(call, [], 'fn')).toThrow()
})

it('removes nested calls with a definition and restores the whole doc with undo', () => {
  const repository = new ProgressRepository()
  repository.saveProgram(stage.id, doc([{ id: 'outer', type: 'if', condition: 'blockedAhead', body: [call], else: [{ ...call, id: 'else-call' }] }]))
  const game = new GameController(stage, repository)
  game.editor.configure(game.getSnapshot().program, game.edit, false)
  game.editor.removeFunction('fn')
  expect(repository.getDocument(stage).functions).toEqual([])
  expect(repository.getDocument(stage).main).toEqual([{ id: 'outer', type: 'if', condition: 'blockedAhead', body: [], else: [] }])
  game.undo()
  expect(repository.getDocument(stage)).toEqual(doc([{ id: 'outer', type: 'if', condition: 'blockedAhead', body: [call], else: [{ ...call, id: 'else-call' }] }]))
  game.dispose()
})

it('roundtrips v2, isolates corrupt code and preserves completion and other stages', () => {
  const stage = unit4Stages[0]
  const data = new Map<string, string>()
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) } }
  const repo = new ProgressRepository(storage)
  repo.completeStage(stage.id, 3, doc())
  repo.saveProgram(stages[1].id, stages[1].solution)
  expect(new ProgressRepository(storage).getDocument(stage)).toEqual(doc())
  const saved = JSON.parse(data.get(progressV2Key)!)
  saved.stages[stage.id].lastProgram.functions[0].body.push({ id: 'recursive', type: 'call', fn: 'fn' })
  data.set(progressV2Key, JSON.stringify(saved))
  const restored = new ProgressRepository(storage)
  expect(restored.getDocument(stage)).toEqual({ main: [], functions: [] })
  expect(restored.getProgress().stages[stage.id]).toMatchObject({ completed: true, bestStars: 3 })
  expect(restored.getProgram(stages[1])).toEqual(stages[1].solution)
})

it('combines node budgets and depth across all bodies', () => {
  const blocks = (n: number, prefix: string): Block[] => Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, type: 'forward' }))
  expect(validDocument(doc(blocks(30, 'm'), blocks(30, 'b')))).toBe(true)
  expect(validDocument(doc(blocks(30, 'm'), blocks(31, 'b')))).toBe(false)
  let body: Block[] = [f]
  for (let i = 0; i < 10; i++) body = [{ id: `r${i}`, type: 'repeat', count: 2, body }]
  expect(validDocument(doc([], body))).toBe(false)
})

it('preserves every unit 1–3 solution frame when wrapped in a doc', () => {
  for (const puzzle of allStages.filter(puzzle => !puzzle.params && !puzzle.id.startsWith('u4-') && !puzzle.id.startsWith('u5-') && !puzzle.id.startsWith('u6-'))) {
    expect(runAll(puzzle, { main: puzzle.solution, functions: [] })).toEqual(baseline[puzzle.id as keyof typeof baseline])
    expect(runAll(puzzle, puzzle.solution)).toEqual(baseline[puzzle.id as keyof typeof baseline])
    expect(new FunctionProgram({ main: puzzle.solution, functions: [] }).count()).toBe(Program.countBlocks(puzzle.solution))
  }
})

it('tracks a while call even when the step budget is spent before its first frame', () => {
  let checks: Block[] = [{ id: 'check', type: 'if', condition: 'blockedAhead', body: [] }, { id: 'check2', type: 'if', condition: 'blockedAhead', body: [] }]
  for (let i = 0; i < 3; i++) checks = [{ id: `repeat${i}`, type: 'repeat', count: i === 0 ? 5 : 10, body: checks }]
  const result = run(stage, doc([...checks, call], [{ id: 'limited', type: 'while', condition: 'clearAhead', body: [] }]))
  expect(result.frames.at(-1)?.call).toBeUndefined()
  expect(failurePoint(result)).toMatchObject({ blockId: 'limited', call: { callId: 'c', fn: 'fn' } })
})

it('keeps function definitions during main edits and completion, counts bodies for stars', () => {
  const repo = new ProgressRepository()
  const game = new GameController({ ...stage, starBlocks: 3 }, repo)
  const initial = doc([call, { ...call, id: 'c2' }, { ...call, id: 'c3' }])
  game.edit(initial)
  initial.functions[0].body.length = 0
  expect(game.getSnapshot().doc.functions[0].body).toEqual([f])
  game.edit(game.getSnapshot().program)
  expect(repo.getDocument(stage).functions[0].body).toEqual([f])
  for (let n = 0; n < 4; n++) game.step()
  expect(game.result).toBe('success')
  expect(game.stars).toBe(2)
  expect(repo.getDocument(stage).functions[0].body).toEqual([f])
  expect(repo.getProgress().stages[stage.id].completed).toBe(true)
  game.dispose()
})

it('locks function editing during playback and enforces combined editor limits', () => {
  const game = new GameController(stage, new ProgressRepository())
  game.editor.createFunction()
  const id = game.getSnapshot().doc.functions[0].id
  game.editor.editFunction(id, body => Program.addBlock(body, f))
  game.editor.chooseFunction()
  game.editor.add('call')
  expect(game.getSnapshot().doc.main[0].type).toBe('call')
  game.editor.configure(game.getSnapshot().program, game.edit, true)
  game.editor.removeFunction(id)
  expect(game.getSnapshot().doc.functions).toHaveLength(1)
  game.editor.configure(game.getSnapshot().program, game.edit, false, 2)
  expect(game.editor.total).toBe(2)
  game.editor.add('forward')
  expect(game.editor.total).toBe(2)
  game.editor.editFunction(id, body => Program.addBlock(body, { ...f, id: 'too-many' }))
  expect(game.editor.total).toBe(2)
  game.dispose()
})

it('edits nested function bodies with a shared palette, protects calls, and restores deleted calls with undo', () => {
  const game = new GameController(stages[0], new ProgressRepository())
  const editor = game.editor
  editor.createFunction()
  editor.createFunction()
  editor.createFunction()
  expect(editor.functions.map(fn => fn.icon)).toEqual(['star', 'moon'])
  const [star, moon] = editor.functions
  editor.chooseFunction(star.id)
  editor.add('repeat')
  const repeat = editor.editProgram[0]
  editor.select(repeat.id)
  editor.setCount(2)
  editor.toggleTarget()
  editor.add('forward')
  editor.add('turnLeft')
  const body = editor.editProgram[0]
  if (body.type !== 'repeat') throw new Error('missing repeat')
  editor.select(body.body[1].id)
  editor.move('up')
  expect((editor.editProgram[0] as typeof body).body.map(b => b.type)).toEqual(['turnLeft', 'forward'])
  editor.remove()
  editor.add('call', moon.id)
  expect(editor.total).toBe(2)
  editor.chooseFunction(moon.id)
  editor.add('turnRight')
  editor.chooseFunction()
  editor.add('call', star.id)
  editor.add('call', moon.id)
  expect(editor.program.map(b => b.type === 'call' ? b.fn : '')).toEqual([star.id, moon.id])
  const before = structuredClone(game.getSnapshot().doc)
  editor.removeFunction(star.id)
  expect(editor.program).toHaveLength(1)
  game.undo()
  expect(game.getSnapshot().doc).toEqual(before)
  editor.locked = true
  editor.chooseFunction(star.id)
  editor.removeFunction(star.id)
  editor.add('forward')
  expect(game.getSnapshot().doc).toEqual(before)
})

it('round-trips unit 4 palettes and does not resurrect a deleted initial function', () => {
  const values = new Map<string, string>()
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
  const repository = new ProgressRepository(storage)
  for (const puzzle of unit4Stages) {
    const document = { main: puzzle.solution, functions: puzzle.solutionFunctions! }
    repository.saveProgram(puzzle.id, document)
    expect(new ProgressRepository(storage).getDocument(puzzle)).toEqual(document)
  }
  repository.saveProgram('u4-3', { main: [], functions: [] })
  expect(new ProgressRepository(storage).getDocument(unit4Stages[2])).toEqual({ main: [], functions: [] })
})

it('fixes a failure inside a function by selecting its body without losing the failure', () => {
  const game = new GameController(stage, new ProgressRepository())
  game.edit(doc([call], [{ id: 'bad', type: 'turnLeft' }, f]))
  while (!game.finished) game.step()
  expect(game.result).toBe('collision')
  const failure = game.failure
  game.fix()
  expect(game.failure).toEqual(failure)
  expect(game.editor.functionId).toBe('fn')
  expect(game.editor.selectedBlock?.id).toBe('f')
})
