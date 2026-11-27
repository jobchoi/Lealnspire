import { Observable } from './Observable'
import { EditorController } from './EditorController'
import { Interpreter } from '../model/interpreter'
import type { Stage, Block, Frame, FunctionDef, ProgramDocument } from '../model/types'
import type { Scheduler } from './GameController'

export const demoStage: Stage = { id: 'demo-add-run', world: 'sketchbook', title: 'demo.title', goal: 'demo.title', grid: ['S.', '#G'], startDir: 'E', starBlocks: 1, hints: { keys: ['demo.title', 'demo.title'], highlight: 'goal' }, solution: [] }
// Scenes are independent examples; never read a puzzle solution here.
export const demoEntries = [
  ['add-run', '1'], ['rotation', '2'], ['repeat', '5'], ['condition', 'u2-1'],
  ['else', 'u2-5'], ['while', 'u3-1'], ['function', 'u4-1'], ['variable', 'u5-1'],
  ['logic', 'u6-1'], ['parameter', 'u7-1'], ['return', 'u8-1'], ['event', 'u9-1'],
  ['list', 'u10-1'], ['search', 'u11-2'],
] as const
export type DemoId = typeof demoEntries[number][0]
export const demoForStage = (id: string) => demoEntries.find(entry => entry[1] === id)?.[0]
type Scene = { stage: Stage; doc: ProgramDocument; frame: Frame; selectedId: string | null; targetId: string | null; targetElse: boolean; cue: string; palette: Block['type']; run: boolean }
const forward: Block = { id: 'demo-f', type: 'forward' }
const atom = { kind: 'atom' as const, atom: 'blockedAhead' as const }

export function demoScene(id: DemoId, cut: number): Scene {
  const editor = new EditorController()
  editor.logicEnabled = id === 'logic'
  editor.paramsEnabled = true; editor.returnsEnabled = true; editor.eventsEnabled = true; editor.listsEnabled = true
  let stage: Stage = { ...demoStage, id: `demo-${id}`, grid: ['S..#', '...G'], startDir: 'E' }
  let cue = '', palette: Block['type'] = 'forward', run = false
  let pick: (frames: Frame[]) => Frame = frames => frames[0]
  const load = (main: Block[], functions: FunctionDef[] = []) => editor.configureDocument({ main, functions }, () => {}, false)
  const target = (type: Block['type']) => { editor.add(type); const block = editor.program.at(-1)!; editor.select(block.id); editor.toggleTarget(); return block.id }
  const end = () => { run = true; pick = frames => frames.at(-1)! }
  if (id === 'add-run') {
    stage = demoStage
    if (cut) editor.add('forward')
    if (cut === 3) end()
    run = cut >= 2
  } else if (id === 'rotation') {
    stage = { ...stage, startDir: 'N' }; palette = 'turnRight'
    if (cut >= 1) editor.add('turnRight')
    if (cut >= 2) end()
    if (cut === 3) editor.add('forward')
  } else if (id === 'repeat') {
    palette = 'repeat'; editor.add('repeat')
    const block = editor.program[0]; editor.select(block.id); editor.setCount(2)
    if (cut >= 1) editor.toggleTarget()
    if (cut >= 2) editor.add('forward')
    if (cut === 3) { end(); cue = '×2 · 1/2 → 2/2' }
  } else if (id === 'condition') {
    palette = 'if'; target('if'); editor.add('turnRight')
    stage = { ...stage, grid: cut === 3 ? ['S..#', '...G'] : ['S#..', '...G'] }
    if (cut >= 1) { run = true; pick = frames => frames.find(frame => frame.check) ?? frames[0] }
    if (cut >= 2) end()
  } else if (id === 'else') {
    palette = 'if'; target('if'); editor.add('turnRight')
    const block = editor.program[0]; editor.reveal(block.id); editor.toggleElse()
    if (cut >= 1) editor.toggleTarget(true)
    if (cut >= 2) editor.add('turnLeft')
    if (cut === 3) { end(); cue = '✓ / ✕ → else' }
  } else if (id === 'while') {
    palette = 'while'; target('while'); editor.add('forward')
    if (cut >= 1) { run = true; pick = frames => (cut === 1 ? frames.find(frame => frame.event === 'move') : frames.filter(frame => frame.check?.result)[1]) ?? frames[0] }
    if (cut === 3) end()
  } else if (id === 'function' || id === 'parameter' || id === 'return') {
    palette = id === 'return' ? 'return' : 'call'
    editor.createFunction(); const fn = editor.functions[0].id
    if (id === 'function') {
      if (cut >= 1) editor.add('turnRight')
      if (cut >= 2) { editor.chooseFunction(); editor.add('call', fn); editor.add('turnLeft') }
      if (cut === 3) { end(); cue = '★() → ★ → ↩' }
    } else if (id === 'parameter') {
      stage = { ...stage, params: true, variantVariables: [{ A: 4 }] }
      editor.toggleParameter(fn)
      if (cut >= 1) { editor.add('repeat'); const repeat = editor.editProgram[0]; editor.select(repeat.id); editor.listsEnabled = false; editor.toggleRepeatSource(); editor.toggleRepeatSource(); editor.toggleTarget(); editor.add('turnRight') }
      if (cut >= 2) { editor.chooseFunction(); editor.add('call', fn); editor.select(editor.program[0].id); editor.setCallArgument({ kind: 'number', value: 2 }) }
      cue = cut >= 2 ? '2 → ◆ · A = 4' : '★(◆)'
      if (cut === 3) end()
    } else {
      stage = { ...stage, returns: true }
      editor.add('return'); editor.select(editor.editProgram[0].id); editor.setReturnValue({ kind: 'number', value: 2 }); editor.add('turnRight')
      if (cut >= 1) load([{ id: 'demo-repeat', type: 'repeat', countCall: { fn }, body: [forward] }], editor.functions)
      if (cut >= 2) { run = true; pick = frames => frames.find(frame => frame.returned) ?? frames[0] }
      if (cut === 3) end()
      cue = cut >= 2 ? '★() → ↩2 · ⊘' : 'return 2'
    }
  } else if (id === 'variable') {
    stage = { ...stage, variantVariables: [{ A: 3 }] }; palette = 'repeat'
    editor.add('repeat'); editor.select(editor.program[0].id)
    if (cut >= 1) editor.toggleRepeatSource()
    editor.toggleTarget(); editor.add('turnRight')
    cue = cut >= 2 ? 'A = 3 → ×3' : 'A = 3'
    if (cut === 3) end()
  } else if (id === 'logic') {
    stage = { ...stage, grid: ['....', 'S..G'] }
    palette = 'if'; target('if'); editor.add('turnRight'); editor.reveal(editor.program[0].id)
    const left = { kind: 'atom' as const, atom: 'blockedLeft' as const }
    editor.setCondition(cut === 0 ? atom : cut === 1 ? left : cut === 2 ? { kind: 'not', operand: left } : { kind: 'and', left, right: atom })
    cue = cut === 3 ? 'and [←▥] [↑▥] · or [←▥] [↑▥]' : cut === 2 ? 'not · ✕ → ✓' : ''
    if (cut >= 2) end()
  } else if (id === 'event') {
    stage = { ...stage, events: true, signals: [['◇']] }; palette = 'on'; target('on')
    if (cut >= 1) editor.add('turnRight')
    if (cut === 2) { run = true; pick = frames => frames.find(frame => frame.events?.phase === 'arrival') ?? frames[0] }
    if (cut === 3) end()
    cue = cut === 2 ? '◇ → [◇] → on ◇' : 'on ◇'
  } else if (id === 'list') {
    stage = { ...stage, lists: [[2, 3]], variantVariables: [{ A: 0 }] }; palette = 'forEach'; target('forEach')
    if (cut >= 1) { editor.add('repeat'); editor.select(editor.editProgram[0].type === 'forEach' ? editor.editProgram[0].body[0].id : ''); editor.toggleRepeatSource(); editor.toggleRepeatSource(); editor.toggleTarget(); editor.add('turnRight') }
    if (cut >= 2) { run = true; pick = frames => frames.find(frame => frame.list?.current?.index === (cut === 2 ? 0 : 1)) ?? frames.at(-1)! }
    cue = cut < 2 ? '[2, 3] → ▣' : cut === 2 ? '#1 · ▣ = 2' : '#2 · ▣ = 3'
  } else if (id === 'search') {
    stage = { ...stage, lists: [[5, 2, 8]], search: { target: 8, maxComparisons: 3 } }; palette = 'breakForEach'
    load([{ id: 'demo-each', type: 'forEach', direction: 'back', body: [{ id: 'demo-if', type: 'if', condition: { kind: 'atom', atom: 'matchesTarget' }, body: [] }] }, forward])
    editor.searchEnabled = true; editor.select('demo-if'); editor.toggleTarget()
    if (cut >= 1) editor.add('breakForEach')
    if (cut === 2) { run = true; pick = frames => frames.find(frame => frame.search?.stopped) ?? frames.at(-1)! }
    if (cut === 3) end()
    cue = cut >= 2 ? '◎8 · #3 ✓ · #2 ? · #1 ?' : '▣ = ◎8'
  }
  const doc = structuredClone(editor.doc)
  const frames = Interpreter.run(stage, doc).frames
  const chosen = pick(frames)
  const played = frames.slice(0, frames.indexOf(chosen) + 1)
  const check = played.findLast(frame => frame.check)?.check
  const returned = played.findLast(frame => frame.returned)?.returned
  const frame = { ...chosen, ...(check ? { check } : {}), ...(returned ? { returned } : {}) }
  return { stage, doc, frame, selectedId: editor.getSnapshot().selectedId, targetId: editor.getSnapshot().targetId, targetElse: editor.targetElse, cue, palette, run }
}
const clock: Scheduler = { set: (fn, delay) => setTimeout(fn, delay), clear: id => clearTimeout(id as ReturnType<typeof setTimeout>) }
export class DemoController extends Observable<{ cut: number; paused: boolean }> {
  private timer: unknown
  private disposed = false
  private readonly complete: () => void
  private readonly scheduler: Scheduler
  readonly id: DemoId
  private cachedScene?: Scene
  constructor(complete: () => void, scheduler = clock, id: DemoId = 'add-run') { super({ cut: 0, paused: true }); this.complete = complete; this.scheduler = scheduler; this.id = id }
  get scene() { return this.cachedScene ??= demoScene(this.id, this.state.cut) }
  get program() { return this.scene.doc.main }
  get frame() { return this.scene.frame }
  private stop() { if (this.timer !== undefined) this.scheduler.clear(this.timer); this.timer = undefined }
  private schedule() {
    this.stop()
    if (!this.disposed && !this.state.paused && this.state.cut < 3) this.timer = this.scheduler.set(() => this.next(), 2400)
  }
  restart = (manual = false) => {
    this.disposed = false
    this.stop()
    this.cachedScene = undefined
    this.update({ cut: 0, paused: manual }); this.schedule()
  }
  next = () => {
    if (this.disposed || this.state.cut === 3) return
    const cut = this.state.cut + 1
    this.cachedScene = undefined
    this.update({ cut, paused: cut === 3 || this.state.paused })
    if (cut === 3) this.complete()
    this.schedule()
  }
  back = () => { if (!this.disposed) { this.stop(); this.cachedScene = undefined; this.update({ cut: Math.max(0, this.state.cut - 1), paused: true }) } }
  pause = () => { if (!this.disposed) { this.update({ ...this.state, paused: !this.state.paused }); this.schedule() } }
  dispose = () => { this.disposed = true; this.stop() }
}
export function canOfferDemo(stageId: string, edited: boolean, executing: boolean, result: boolean) { return !!demoForStage(stageId) && !edited && !executing && !result }
