import { unit3Stages, bonusStages } from '../model/stages'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppController } from './AppController'
import { GameController } from './GameController'
import { EditorController } from './EditorController'
import { ProgressRepository, progressV2Key } from '../model/ProgressRepository'
import { stages } from '../model/stages'

afterEach(() => vi.useRealTimers())
describe('Controller without React', () => {
  it('publishes stable snapshots and unsubscribes', () => {
    const app = new AppController()
    const snapshot = app.getSnapshot(), listener = vi.fn()
    expect(app.getSnapshot()).toBe(snapshot)
    const unsubscribe = app.subscribe(listener)
    app.list()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(app.getSnapshot()).not.toBe(snapshot)
    unsubscribe(); app.home()
    expect(listener).toHaveBeenCalledTimes(1)
  })
  it('edits nested blocks, preserves selection when moving, clears deleted targets and enforces limits/locking', () => {
    const editor = new EditorController()
    editor.onChange = vi.fn()
    editor.add('repeat'); editor.select('block-1'); editor.setCount(5); editor.toggleTarget(); editor.add('forward')
    expect(editor.program[0]).toMatchObject({ count: 5, body: [{ type: 'forward' }] })
    editor.select('block-2'); editor.remove()
    expect(editor.getSnapshot().selectedId).toBeNull()
    editor.select('block-1'); editor.remove()
    expect(editor.getSnapshot().targetId).toBeNull()
    for (let i = 0; i < 12; i++) editor.add('forward')
    expect(editor.total).toBe(10)
    editor.select('block-2'); editor.move('up')
    expect(editor.program[0].id).toBe('block-2')
    editor.locked = true
    const program = editor.program
    editor.remove(); editor.move('down'); editor.clear(); editor.select('block-1'); editor.add('repeat')
    expect(editor.program).toBe(program)
    expect(editor.getSnapshot().selectedId).toBe('block-2')
    editor.locked = false; editor.maxBlocks = 2
    expect(editor.atLimit).toBe(true)
  })
  it('saves edits, plays frames at selected speed, saves success only at the end and cancels timers', () => {
    vi.useFakeTimers()
    const data = new Map<string, string>()
    const repository = new ProgressRepository({ getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value) } })
    const game = new GameController(stages[0], repository)
    game.edit(stages[0].solution)
    expect(JSON.parse(data.get(progressV2Key)!).stages['1'].completed).toBe(false)
    game.setSpeed('fast'); game.play()
    expect(game.locked).toBe(true)
    game.edit([]); expect(game.getSnapshot().program).toEqual(stages[0].solution)
    vi.advanceTimersByTime(150)
    expect(game.frame?.pos).toEqual({ x: 1, y: 0 })
    expect(game.finished).toBe(false)
    vi.advanceTimersByTime(150)
    expect(game.finished).toBe(true); expect(game.showResult).toBe(true); expect(game.stars).toBe(3)
    expect(new ProgressRepository({ getItem: key => data.get(key) ?? null, setItem: () => {} }).getProgress().stages['1'].completed).toBe(true)
    game.dismiss(); expect(game.showResult).toBe(false)
    game.reset(); expect(game.locked).toBe(false)
    game.play(); game.dispose(); vi.runAllTimers()
    expect(game.getSnapshot().index).toBe(0)
    game.reset(); game.step(); expect(game.getSnapshot().playing).toBe(false)
    game.step(); expect(game.finished).toBe(true)
  })
  it('handles collision, unfinished, empty execution, hints, reset and changing speed mid-play', () => {
    vi.useFakeTimers()
    const game = new GameController(stages[0], new ProgressRepository())
    game.play(); game.step(); expect(game.locked).toBe(false)
    game.toggleHint(); expect(game.getSnapshot().hintStep).toBe(1)
    game.edit([{ id: 'r', type: 'turnRight' }, { id: 'f', type: 'forward' }]); game.play(); vi.runAllTimers()
    expect(game.result).toBe('collision'); expect(game.stars).toBe(0)
    game.reset(); game.edit([{ id: 'f', type: 'forward' }]); game.step()
    expect(game.result).toBe('unfinished'); expect(game.canNext).toBe(false)
    game.reset(); game.edit(stages[0].solution); game.play(); game.setSpeed('fast')
    vi.advanceTimersByTime(300); expect(game.result).toBe('success'); expect(game.finished).toBe(true)
    game.reset(); expect(vi.getTimerCount()).toBe(0)
  })
  it('navigates home/list/play, respects locks, continues, advances and returns to list after last stage', () => {
    const repository = new ProgressRepository(), app = new AppController(repository)
    app.openStage(1); expect(app.getSnapshot().page).toBe('home')
    expect(app.continueIndex).toBeUndefined()
    app.start(); app.game!.edit(stages[0].solution); app.list()
    expect(app.continueIndex).toBe(0)
    app.continue(); expect(app.getSnapshot()).toEqual({ page: 'play', index: 0 })
    repository.completeStage('1', 3, stages[0].solution); app.next()
    expect(app.getSnapshot()).toEqual({ page: 'play', index: 1 })
    expect(app.cards.filter(card => card.unlocked)).toHaveLength(2)
    for (const stage of stages) repository.completeStage(stage.id, 3, stage.solution)
    app.openStage(7); app.next(); expect(app.getSnapshot().page).toBe('list')
    app.home(); expect(app.getSnapshot().page).toBe('home'); expect(app.game?.stage.id).toBe('8'); expect(app.continueIndex).toBe(10)
  })
})

it('fixes a failed run with code preserved, start position restored and the inner cause selected', () => {
  vi.useFakeTimers()
  const game = new GameController(stages[0], new ProgressRepository())
  const program = [{ id: 'loop', type: 'repeat' as const, count: 2, body: [{ id: 'r', type: 'turnRight' as const }, { id: 'f', type: 'forward' as const }] }]
  game.edit(program); game.play(); vi.runAllTimers()
  expect(game.failure?.blockId).toBe('f')
  game.dismiss(); expect(game.locked).toBe(false)
  game.fix()
  expect(game.getSnapshot().program).toEqual(program)
  expect(game.frame).toBeUndefined()
  expect(game.locked).toBe(false)
  expect(game.showResult).toBe(false)
  expect(game.editor.selectedPath).toEqual([0, 1])
  expect(game.editor.getSnapshot()).toMatchObject({ selectedId: 'f', targetId: null, addedId: 'f' })
  game.fix(); expect(game.editor.selectedPath).toEqual([0, 1])
  game.play(); expect(game.failure).toBeNull(); vi.runAllTimers(); game.fix()
  game.editor.remove(); expect(game.failure).toBeNull()
  game.play(); vi.runAllTimers(); game.reset(); expect(game.failure).toBeNull()
  expect(vi.getTimerCount()).toBe(0)
})

it('advances hints only on request without changing program, score or progress', () => {
  const repository = new ProgressRepository()
  const game = new GameController(stages[0], repository)
  game.edit(stages[0].solution)
  const before = game.getSnapshot(), progress = repository.getProgress(), stars = game.stars
  game.nextHint(); expect(game.getSnapshot()).toBe(before)
  game.toggleHint(); expect(game.getSnapshot().hintStep).toBe(1)
  game.nextHint(); expect(game.getSnapshot().hintStep).toBe(2)
  game.nextHint(); expect(game.getSnapshot().hintStep).toBe(2)
  game.toggleHint(); expect(game.getSnapshot().hintStep).toBe(0)
  game.toggleHint(); expect(game.getSnapshot().hintStep).toBe(1)
  expect(game.getSnapshot().program).toBe(before.program)
  expect(repository.getProgress()).toEqual(progress)
  expect(game.stars).toBe(stars)
  const app = new AppController(repository)
  app.start(); app.game!.toggleHint(); app.list(); app.openStage(0)
  expect(app.game!.getSnapshot().hintStep).toBe(0)
})

for (const action of ['add', 'remove', 'setCount', 'move', 'select', 'toggleTarget', 'clear', 'edit'] as const) {
  it(`resets finished playback and applies ${action} on the first interaction`, () => {
    vi.useFakeTimers()
    const repository = new ProgressRepository()
    const game = new GameController(stages[0], repository)
    const program = [{ id: 'loop', type: 'repeat' as const, count: 2, body: [] }, { id: 'turn', type: 'turnRight' as const }]
    game.edit(program)
    const syncEditor = () => game.editor.configure(game.getSnapshot().program, game.edit, game.locked, game.stage.maxBlocks)
    syncEditor(); game.editor.select('loop')
    game.play(); vi.runAllTimers(); game.dismiss(); syncEditor()
    expect(game.finished).toBe(true)
    expect(game.locked).toBe(false)
    expect(game.failure).not.toBeNull()
    if (action === 'add') game.editor.add('forward')
    else if (action === 'setCount') game.editor.setCount(3)
    else if (action === 'move') game.editor.move('down')
    else if (action === 'select') game.editor.select('turn')
    else if (action === 'edit') game.edit([])
    else game.editor[action]()
    expect(game.frame).toBeUndefined()
    expect(game.result).toBeUndefined()
    expect(game.failure).toBeNull()
    expect(game.getSnapshot()).toMatchObject({ execution: null, index: 0, playing: false, dismissed: false })
    expect(game.finished).toBe(false)
    expect(game.showResult).toBe(false)
    const edited = game.getSnapshot().program
    if (action === 'add') expect(edited.map(block => block.type)).toEqual(['repeat', 'turnRight', 'forward'])
    if (action === 'remove') expect(edited.map(block => block.id)).toEqual(['turn'])
    if (action === 'setCount') expect(edited[0]).toMatchObject({ count: 3 })
    if (action === 'move') expect(edited.map(block => block.id)).toEqual(['turn', 'loop'])
    if (action === 'select') expect(game.editor.getSnapshot().selectedId).toBe('turn')
    if (action === 'toggleTarget') expect(game.editor.getSnapshot().targetId).toBe('loop')
    if (action === 'clear') expect(game.editor.getSnapshot().selectedId).toBeNull()
    if (action === 'edit') expect(edited).toEqual([])
    expect(repository.getProgram(stages[0])).toEqual(edited)
    expect(vi.getTimerCount()).toBe(0)
  })
}

for (const mode of ['playing', 'stepping'] as const) {
  it(`rejects editor interactions while ${mode} before the last frame`, () => {
    vi.useFakeTimers()
    const game = new GameController(stages[0], new ProgressRepository())
    game.edit(stages[0].solution)
    game.editor.configure(game.getSnapshot().program, game.edit, false)
    game.editor.select(game.getSnapshot().program[0].id)
    if (mode === 'playing') game.play()
    else game.step()
    expect(game.finished).toBe(false)
    expect(game.locked).toBe(true)
    game.editor.configure(game.getSnapshot().program, game.edit, game.locked)
    const snapshot = game.getSnapshot(), selection = game.editor.getSnapshot()
    game.editor.add('repeat'); game.editor.remove(); game.editor.setCount(5)
    game.editor.move('down'); game.editor.select('other'); game.editor.clear(); game.editor.toggleTarget()
    game.edit([])
    expect(game.getSnapshot()).toBe(snapshot)
    expect(game.editor.getSnapshot()).toBe(selection)
    expect(game.editor.program).toEqual(snapshot.program)
    game.dispose()
  })
}

it('preserves completed progress when the first edit resets a successful run', () => {
  vi.useFakeTimers()
  const repository = new ProgressRepository()
  const game = new GameController(stages[0], repository)
  game.edit(stages[0].solution); game.play(); vi.runAllTimers(); game.dismiss()
  expect(game.finished).toBe(true)
  game.editor.configure(game.getSnapshot().program, game.edit, game.locked)
  game.editor.add('turnLeft')
  expect(game.frame).toBeUndefined()
  expect(game.getSnapshot().program).toHaveLength(stages[0].solution.length + 1)
  expect(repository.getProgress().stages[stages[0].id]).toMatchObject({ completed: true, bestStars: 3 })
})


it('undoes repeat deletion including body, IDs and count, saves it and consumes the single history entry', () => {
  const repository = new ProgressRepository(), game = new GameController(stages[0], repository)
  const program = [{ id: 'loop', type: 'repeat' as const, count: 2, body: [{ id: 'inner', type: 'forward' as const }] }]
  game.edit(program)
  game.editor.configure(game.getSnapshot().program, game.edit, false)
  game.editor.select('loop'); game.editor.toggleTarget(); game.editor.remove()
  expect(game.editor.total).toBe(0)
  game.editor.undo()
  expect(game.getSnapshot().program).toEqual(program)
  expect(game.editor.total).toBe(2)
  expect(repository.getProgram(stages[0])).toEqual(program)
  expect(game.editor.getSnapshot()).toMatchObject({ selectedId: null, targetId: null })
  const restored = game.getSnapshot()
  game.undo(); expect(game.getSnapshot()).toBe(restored)
  expect(game.canUndo).toBe(false)
})

it('keeps only the latest changed program and clears invalid selection and insertion targets on undo', () => {
  const game = new GameController(stages[0], new ProgressRepository())
  game.editor.configure(game.getSnapshot().program, game.edit, false)
  game.editor.add('forward'); game.editor.add('repeat')
  const loop = game.editor.program[1].id
  game.editor.select(loop); game.editor.toggleTarget()
  game.editor.setCount((game.editor.selectedBlock as { count: number }).count); game.editor.move('down') // unchanged edits do not replace history
  game.undo()
  expect(game.getSnapshot().program.map(block => block.type)).toEqual(['forward'])
  expect(game.editor.getSnapshot()).toEqual({ selectedId: null, targetId: null, addedId: null })
  expect(game.canUndo).toBe(false)
})

it('preserves history through reset and fix, rejects locked undo and resets completed playback on undo', () => {
  vi.useFakeTimers()
  const game = new GameController(stages[0], new ProgressRepository())
  game.edit([{ id: 'r', type: 'turnRight' }])
  game.reset(); expect(game.canUndo).toBe(true)
  game.play()
  const snapshot = game.getSnapshot()
  game.undo(); expect(game.getSnapshot()).toBe(snapshot)
  vi.runAllTimers(); game.fix(); expect(game.canUndo).toBe(true)
  game.play(); vi.runAllTimers(); game.undo()
  expect(game.getSnapshot()).toMatchObject({ program: [], undoProgram: null, execution: null, index: 0, playing: false, failure: null })
  expect(vi.getTimerCount()).toBe(0)
})

it('starts a new undo history on stage navigation, including reopening a saved stage', () => {
  const app = new AppController()
  app.start(); app.game!.edit(stages[0].solution)
  expect(app.game!.canUndo).toBe(true)
  app.list(); app.openStage(0)
  expect(app.game!.canUndo).toBe(false)
  app.game!.undo(); expect(app.game!.getSnapshot().program).toEqual(stages[0].solution)
})

for (const action of ['add', 'move', 'setCount'] as const) {
  it(`undoes ${action} and preserves valid selection and target`, () => {
    const game = new GameController(stages[0], new ProgressRepository())
    const program = [{ id: 'loop', type: 'repeat' as const, count: 2, body: [] }, { id: 'f', type: 'forward' as const }]
    game.edit(program); game.editor.configure(game.getSnapshot().program, game.edit, false)
    game.editor.select('loop'); game.editor.toggleTarget()
    if (action === 'add') game.editor.add('forward')
    else if (action === 'move') game.editor.move('down')
    else game.editor.setCount(4)
    game.undo()
    expect(game.getSnapshot().program).toEqual(program)
    expect(game.editor.getSnapshot()).toMatchObject({ selectedId: 'loop', targetId: 'loop' })
    expect(game.editor.selectedPath).toEqual([0])
  })
}


it('clearing app progress notifies the home screen and removes continue and unlocked stages', () => {
  const repository = new ProgressRepository()
  repository.completeStage(stages[0].id, 3, [])
  const app = new AppController(repository)
  let updates = 0
  app.subscribe(() => { updates++ })
  expect(app.continueIndex).toBeDefined()
  app.clearProgress()
  expect(updates).toBe(1)
  expect(app.getSnapshot()).toEqual({ page: 'home' })
  expect(app.continueIndex).toBeUndefined()
  expect(repository.getProgress().stages).toEqual({})
})

for (const stage of bonusStages) {
  it(`${stage.id} supports hints, failure fix, undo and saved success`, () => {
    vi.useFakeTimers()
    try {
      const repository = new ProgressRepository()
      const game = new GameController(stage, repository)
      game.toggleHint(); game.nextHint()
      expect(game.getSnapshot().hintStep).toBe(2)
      game.edit([{ id: 'wrong', type: 'turnRight' }, { id: 'bump', type: 'forward' }])
      game.play(); vi.runAllTimers()
      expect(game.result).toBe('collision')
      game.fix()
      expect(game.failure?.blockId).toBe('bump')
      expect(game.locked).toBe(false)
      game.edit(stage.solution); game.undo()
      expect(game.getSnapshot().program[0].id).toBe('wrong')
      game.edit(stage.solution); game.play(); vi.runAllTimers()
      expect(game.result).toBe('success')
      expect(repository.getProgram(stage)).toEqual(stage.solution)
      expect(repository.getProgress().stages[stage.id].completed).toBe(true)
    } finally { vi.useRealTimers() }
  })
}

it('T38 replays all maps before saving success and fixes the first failed variant', async () => {
  const { unit2Stages } = await import('../model/stages')
  const stage = unit2Stages[0]
  const repository = new ProgressRepository()
  const game = new GameController(stage, repository)
  game.edit(stage.solution)
  game.selectVariant(1)
  expect(game.displayStage.grid).toEqual(stage.variants![1])
  game.step()
  expect(game.variant).toBe(0)
  expect(game.frame?.check?.result).toBe(false)
  while (game.variant === 0) game.step()
  expect(repository.getProgress().stages[stage.id].completed).toBe(false)
  while (!game.finished) game.step()
  expect(game.result).toBe('success')
  expect(game.stars).toBe(3)
  expect(repository.getProgress().stages[stage.id].completed).toBe(true)
  game.reset()
  game.edit(['forward', 'forward', 'turnRight', 'forward', 'forward'].map((type, i) => ({ id: `failure-${i}`, type } as const)) as typeof stage.solution)
  while (!game.finished) game.step()
  expect(game.result).toBe('collision')
  expect(game.variantResults).toEqual(['success', 'collision'])
  game.fix()
  expect(game.variant).toBe(1)
  expect(game.editor.getSnapshot().selectedId).toBe('failure-1')
  game.edit(stage.solution)
  game.undo()
  expect(game.getSnapshot().program[0].id).toBe('failure-0')
})

it('T38 edits repeat inside if and if inside repeat, including nested movement and removal', () => {
  const editor = new EditorController()
  editor.configure([], () => {}, false)
  editor.add('if')
  const outer = editor.program[0].id
  editor.select(outer); editor.toggleTarget(); editor.add('repeat')
  const repeat = editor.program[0]
  expect(repeat.type).toBe('if')
  if (repeat.type !== 'if') throw new Error('Expected if')
  editor.select(repeat.body[0].id); editor.toggleTarget(); editor.add('if')
  const inner = editor.program[0]
  if (inner.type !== 'if' || inner.body[0].type !== 'repeat') throw new Error('Expected nested repeat')
  editor.select(inner.body[0].body[0].id); editor.toggleTarget(); editor.add('forward'); editor.add('turnRight')
  const body = editor.program[0]
  if (body.type !== 'if' || body.body[0].type !== 'repeat' || body.body[0].body[0].type !== 'if') throw new Error('Expected nested if')
  editor.select(body.body[0].body[0].body[1].id)
  expect(editor.selectedPath).toEqual([0, 0, 0, 1])
  editor.move('up')
  expect(editor.selectedPath).toEqual([0, 0, 0, 0])
  editor.remove()
  expect(editor.total).toBe(4)
})

it('T40 only displays failure markers on the failed map before and after fixing', async () => {
  const { unit2Stages } = await import('../model/stages')
  const game = new GameController(unit2Stages[3], new ProgressRepository())
  while (!game.finished) game.step()
  expect(game.variantResults).toEqual(['collision', 'success'])
  expect(game.variant).toBe(1)
  expect(game.failure).toMatchObject({ variant: 0, position: { x: 3, y: 0 } })
  expect(game.visibleFailure).toBeNull()
  game.fix()
  expect(game.variant).toBe(0)
  expect(game.visibleFailure).toEqual(game.failure)
  expect(game.visibleFailure?.blockId).toBe(game.editor.getSnapshot().selectedId)
  game.selectVariant(1)
  expect(game.visibleFailure).toBeNull()
  game.selectVariant(0)
  expect(game.visibleFailure).toEqual(game.failure)
})

for (const [speed, delay] of [['slow', 800], ['normal', 400], ['fast', 150]] as const) {
  it(`caps stepLimit playback at 12 ticks at ${speed} speed and skips remaining maps`, () => {
    vi.useFakeTimers()
    const stage = unit3Stages[2]
    const repository = new ProgressRepository()
    const game = new GameController(stage, repository)
    const seen: number[] = []
    game.subscribe(() => seen.push(game.getSnapshot().index))
    game.setSpeed(speed); game.play()
    const execution = game.getSnapshot().execution!
    vi.advanceTimersByTime(delay * 11)
    expect(game.getSnapshot().index).toBe(11)
    expect(game.showResult).toBe(false)
    vi.advanceTimersByTime(delay)
    expect(game.showResult).toBe(true)
    expect(game.getSnapshot().playing).toBe(false)
    expect(game.variant).toBe(0)
    expect(game.variantResults).toEqual(['stepLimit', undefined])
    expect(game.frame).toEqual(execution.frames.at(-1))
    expect(game.frame?.loops?.[0].iteration).toBeGreaterThan(300)
    expect(seen.filter(index => index > 0)).toHaveLength(12)
    expect(game.whileLimited).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
    expect(repository.getProgress().stages[stage.id]?.completed).not.toBe(true)
    game.fix()
    expect(game.editor.getSnapshot().selectedId).toBe(stage.initialProgram![0].id)
    expect(game.variant).toBe(0)
  })
}

it('keeps manual stepLimit playback one frame at a time through the actual limit', () => {
  const game = new GameController(unit3Stages[2], new ProgressRepository())
  game.step()
  const execution = game.getSnapshot().execution!
  for (let index = 2; index < execution.frames.length; index++) {
    expect(game.showResult).toBe(false)
    game.step()
    expect(game.getSnapshot().index).toBe(index)
  }
  expect(game.showResult).toBe(true)
  expect(game.variant).toBe(0)
  expect(game.whileLimited).toBe(true)
})

it('also caps excessive repeat playback in units 1 and 2 without the while explanation', () => {
  vi.useFakeTimers()
  const program = [{ id: 'a', type: 'repeat' as const, count: 10, body: [{ id: 'b', type: 'repeat' as const, count: 10, body: [{ id: 'c', type: 'repeat' as const, count: 10, body: [{ id: 'd', type: 'repeat' as const, count: 10, body: [{ id: 'r', type: 'turnRight' as const }] }] }] }] }]
  for (const stage of [stages[0], { ...stages[0], variants: [stages[0].grid, stages[0].grid] }]) {
    const game = new GameController(stage, new ProgressRepository())
    game.edit(program); game.setSpeed('fast'); game.play()
    vi.advanceTimersByTime(150 * 12)
    expect(game.showResult).toBe(true)
    expect(game.result).toBe('stepLimit')
    expect(game.whileLimited).toBe(false)
    expect(game.variant).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  }
})

it('stops at a later stepLimit map and leaves subsequent maps unreplayed', () => {
  vi.useFakeTimers()
  const stage = { ...stages[0], grid: ['S#', 'G#'], variants: [['S#', 'G#'], ['SG', '..'], ['SG', '..']] }
  const game = new GameController(stage, new ProgressRepository())
  game.edit([{ id: 'w', type: 'while', condition: 'clearAhead', body: [] }, { id: 'r', type: 'turnRight' }, { id: 'f', type: 'forward' }])
  game.play(); vi.runAllTimers()
  expect(game.variant).toBe(1)
  expect(game.showResult).toBe(true)
  expect(game.variantResults).toEqual(['success', 'stepLimit', undefined])
  expect(game.failure).toMatchObject({ blockId: 'w', variant: 1 })
  game.fix()
  expect(game.variant).toBe(1)
  expect(game.editor.getSnapshot().selectedId).toBe('w')
})
