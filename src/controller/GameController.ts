import { findBlockPath } from '../model/editor'
import { Observable } from './Observable'
import { EditorController } from './EditorController'
import { failurePoint, Interpreter, runAll } from '../model/interpreter'
import { FunctionProgram } from '../model/program'
import { Score } from '../model/score'
import { programDocument } from '../model/types'
import type { Program, ProgramDocument, ProgramInput, RunResult, RunAllResult, Stage } from '../model/types'
import type { ProgressRepository } from '../model/ProgressRepository'
import { isLastFrame, nextFrameIndex, playbackSpeeds } from './playback'
export type Scheduler = { set(callback: () => void, delay: number): unknown; clear(handle: unknown): void }
// Include the initial frame; show a few loop cycles before skipping to the computed end.
const stepLimitPreviewFrames = 12
const scheduler: Scheduler = { set: (callback, delay) => setTimeout(callback, delay), clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>) }
type State = { variant: number; all: RunAllResult | null; undoProgram: ProgramDocument | null; doc: ProgramDocument; program: Program; execution: RunResult | null; index: number; playing: boolean; dismissed: boolean; speed: keyof typeof playbackSpeeds; hintStep: 0 | 1 | 2; failure: ReturnType<typeof failurePoint> }
export class GameController extends Observable<State> {
  readonly editor = new EditorController(() => { if (this.finished) this.reset() }, { undo: () => this.undo(), available: () => this.canUndo })
  readonly stage: Stage
  readonly repository: ProgressRepository
  private clock: Scheduler
  private timer: unknown
  constructor(stage: Stage, repository: ProgressRepository, clock: Scheduler = scheduler) {
    super({ variant: 0, all: null, undoProgram: null, doc: repository.getDocument(stage), program: repository.getProgram(stage), execution: null, index: 0, playing: false, dismissed: false, speed: 'normal', hintStep: 0, failure: null })
    this.stage = stage; this.repository = repository; this.clock = clock
    this.editor.program = this.state.program
    this.editor.functions = structuredClone(this.state.doc.functions)
    this.editor.onChange = this.edit
    this.editor.returnsEnabled = stage.returns === true
    this.editor.paramsEnabled = stage.params === true
    this.editor.logicEnabled = stage.id.startsWith('u6-')
    this.editor.maxBlocks = stage.maxBlocks
    this.editor.onDocumentChange = this.edit
  }
  get failure() { return this.state.failure ?? (this.finished && this.state.execution ? failurePoint(this.state.all ?? this.state.execution) : null) }
  get visibleFailure() {
    const failure = this.failure
    return failure && (failure.variant ?? 0) === this.variant ? failure : null
  }
  get frame() { return this.state.execution?.frames[this.state.index] }
  get returned() {
    const frames = this.state.execution?.frames.slice(0, this.state.index + 1) ?? []
    const returned = frames.findLast(frame => frame.returned)?.returned
    if (!returned || this.frame?.call && this.frame.call.serial !== returned.serial) return undefined
    return returned
  }
  get branchChecks() {
    const active = this.frame?.activeBlockId
    const blocks = this.frame?.call ? this.state.doc.functions.find(fn => fn.id === this.frame?.call?.fn)?.body ?? [] : this.state.program
    const path = active ? findBlockPath(blocks, active) : undefined
    const checks = new Map<string, NonNullable<import('../model/types').Frame['check']>>()
    for (const frame of this.state.execution?.frames.slice(0, this.state.index + 1) ?? []) {
      if (frame.check && frame.call?.serial === this.frame?.call?.serial) checks.set(frame.check.blockId, frame.check)
    }
    return [...checks.values()].filter(check => {
      const parent = findBlockPath(blocks, check.blockId)
      return path && parent && parent.every((part, index) => path[index] === part)
    })
  }
  get branchCheck() { return this.branchChecks.at(-1) }
  get result() { return this.state.all?.result ?? this.state.execution?.result }
  get whileLimited() { const execution = this.state.all && this.state.all.failedVariant !== null ? this.state.all.results[this.state.all.failedVariant] : this.state.execution; return !!execution?.whileLimitBlockId }
  get variant() { return this.state.variant }
  get displayStage() { return { ...this.stage, grid: this.stage.variants?.[this.variant] ?? this.stage.grid } }
  get variantResults() { return this.state.all?.results.map((run, variant) => variant < this.variant || variant === this.variant && isLastFrame(this.state.index, this.state.execution?.frames.length ?? 0) ? run.result : undefined) }
  selectVariant = (variant: number) => {
    if (this.state.execution || !this.stage.variants?.[variant]) return
    this.update({ ...this.state, variant })
  }
  private execute() {
    const all = this.stage.variants ? runAll(this.stage, this.state.doc) : null
    return { all, variant: 0, execution: all?.results[0] ?? Interpreter.run(this.stage, this.state.doc) }
  }
  get locked() { return this.state.execution !== null && !this.finished }
  get finished() { return isLastFrame(this.state.index, this.state.execution?.frames.length ?? 0) && (!this.state.all || this.state.execution?.result === 'stepLimit' || this.variant === this.state.all.results.length - 1) }
  get showResult() { return this.finished && !this.state.dismissed }
  get stars() { return this.stage.variants && this.result === 'success' ? 3 : this.result ? Score.score(this.result, new FunctionProgram(this.state.doc).count(), this.stage.starBlocks) : 0 }
  get canNext() { return this.repository.getProgress().stages[this.stage.id]?.completed === true }
  private stop() { if (this.timer !== undefined) this.clock.clear(this.timer); this.timer = undefined }
  private publish(next: State) {
    if (next.execution?.result === 'stepLimit' && isLastFrame(next.index, next.execution.frames.length)) {
      next = { ...next, playing: false }
    }
    this.stop()
    if (isLastFrame(next.index, next.execution?.frames.length ?? 0) && (!next.all || next.variant === next.all.results.length - 1) && (next.all?.result ?? next.execution?.result) === 'success' && (!this.finished || next.execution !== this.state.execution)) {
      this.repository.completeStage(this.stage.id, this.stage.variants ? 3 : Score.score('success', new FunctionProgram(next.doc).count(), this.stage.starBlocks), next.doc)
    }
    this.editor.program = next.program
    this.editor.functions = structuredClone(next.doc.functions)
    this.update(next)
    if (next.playing && !this.finished) this.timer = this.clock.set(() => {
      this.advance(true)
    }, playbackSpeeds[next.speed])
  }
  private advance(playing: boolean) {
    if (this.finished) return
    if (playing && this.state.execution?.result === 'stepLimit' && this.state.index >= stepLimitPreviewFrames - 1) {
      this.publish({ ...this.state, index: this.state.execution.frames.length - 1, playing: false })
      return
    }
    if (this.state.all && isLastFrame(this.state.index, this.state.execution!.frames.length) && this.variant < this.state.all.results.length - 1) {
      const variant = this.variant + 1
      this.publish({ ...this.state, variant, execution: this.state.all.results[variant], index: 0, playing })
    } else {
      const index = nextFrameIndex(this.state.index, this.state.execution!.frames.length)
      const last = isLastFrame(index, this.state.execution!.frames.length) && (!this.state.all || this.variant === this.state.all.results.length - 1)
      this.publish({ ...this.state, index, playing: playing && !last })
    }
  }
  get canUndo() { return !this.locked && this.state.undoProgram !== null }
  undo = () => {
    if (!this.canUndo) return
    const program = structuredClone(this.state.undoProgram!)
    this.repository.saveProgram(this.stage.id, program)
    this.editor.functions = structuredClone(program.functions)
    this.editor.reconcile(program.main)
    this.publish({ ...this.state, program: program.main, doc: program, undoProgram: null, execution: null, all: null, index: 0, playing: false, dismissed: false, failure: null })
  }
  edit = (input: ProgramInput) => {
    if (this.locked) return
    const doc = structuredClone(Array.isArray(input) ? { main: input, functions: this.state.doc.functions } : programDocument(input))
    new FunctionProgram(doc)
    this.repository.saveProgram(this.stage.id, doc)
    this.publish({ ...this.state, undoProgram: JSON.stringify(doc) === JSON.stringify(this.state.doc) ? this.state.undoProgram : structuredClone(this.state.doc), doc, program: doc.main, execution: null, all: null, index: 0, playing: false, dismissed: false, failure: null })
  }
  play = () => {
    if (!this.state.program.length && !this.state.doc.functions.length || this.state.playing) return
    const run = this.execute()
    const execution = run.execution
    this.publish({ ...this.state, ...run, failure: null, index: 0, playing: execution.frames.length > 1 || !!run.all && run.all.results.length > 1, dismissed: false })
  }
  step = () => {
    if (!this.state.program.length && !this.state.doc.functions.length || this.state.playing || this.finished) return
    if (!this.state.execution) this.publish({ ...this.state, ...this.execute(), failure: null, index: 0, playing: false, dismissed: false })
    this.advance(false)
  }
  setSpeed = (speed: keyof typeof playbackSpeeds) => this.publish({ ...this.state, speed })
  reset = () => this.publish({ ...this.state, execution: null, all: null, failure: null, index: 0, playing: false, dismissed: false })
  fix = () => {
    if (!this.finished || !this.state.execution || this.result === 'success') return
    const failure = failurePoint(this.state.all ?? this.state.execution)
    this.editor.configure(this.state.program, this.edit, false, this.stage.maxBlocks)
    this.editor.reveal(failure?.blockId ?? null, failure?.call?.fn)
    this.publish({ ...this.state, execution: null, all: null, variant: this.state.all?.failedVariant ?? this.variant, failure, index: 0, playing: false, dismissed: false })
  }
  dismiss = () => this.update({ ...this.state, dismissed: true })
  toggleHint = () => this.update({ ...this.state, hintStep: this.state.hintStep === 0 ? 1 : 0 })
  nextHint = () => { if (this.state.hintStep === 1) this.update({ ...this.state, hintStep: 2 }) }
  dispose = () => this.stop()
}
