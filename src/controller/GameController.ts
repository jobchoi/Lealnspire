import { Observable } from './Observable'
import { EditorController } from './EditorController'
import { failurePoint, Interpreter, runAll } from '../model/interpreter'
import { Program as ProgramModel } from '../model/program'
import { Score } from '../model/score'
import type { Program, RunResult, RunAllResult, Stage } from '../model/types'
import type { ProgressRepository } from '../model/ProgressRepository'
import { isLastFrame, nextFrameIndex, playbackSpeeds } from './playback'
export type Scheduler = { set(callback: () => void, delay: number): unknown; clear(handle: unknown): void }
const scheduler: Scheduler = { set: (callback, delay) => setTimeout(callback, delay), clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>) }
type State = { variant: number; all: RunAllResult | null; undoProgram: Program | null; program: Program; execution: RunResult | null; index: number; playing: boolean; dismissed: boolean; speed: keyof typeof playbackSpeeds; hintStep: 0 | 1 | 2; failure: ReturnType<typeof failurePoint> }
export class GameController extends Observable<State> {
  readonly editor = new EditorController(() => { if (this.finished) this.reset() }, { undo: () => this.undo(), available: () => this.canUndo })
  readonly stage: Stage
  readonly repository: ProgressRepository
  private clock: Scheduler
  private timer: unknown
  constructor(stage: Stage, repository: ProgressRepository, clock: Scheduler = scheduler) {
    super({ variant: 0, all: null, undoProgram: null, program: repository.getProgram(stage), execution: null, index: 0, playing: false, dismissed: false, speed: 'normal', hintStep: 0, failure: null })
    this.stage = stage; this.repository = repository; this.clock = clock
  }
  get failure() { return this.state.failure ?? (this.finished && this.state.execution ? failurePoint(this.state.all ?? this.state.execution) : null) }
  get visibleFailure() {
    const failure = this.failure
    return failure && (failure.variant ?? 0) === this.variant ? failure : null
  }
  get frame() { return this.state.execution?.frames[this.state.index] }
  get branchCheck() { return this.state.execution?.frames.slice(0, this.state.index + 1).reverse().find(frame => frame.check)?.check }
  get result() { return this.state.all?.result ?? this.state.execution?.result }
  get variant() { return this.state.variant }
  get displayStage() { return { ...this.stage, grid: this.stage.variants?.[this.variant] ?? this.stage.grid } }
  get variantResults() { return this.state.all?.results.map((run, variant) => variant < this.variant || variant === this.variant && isLastFrame(this.state.index, this.state.execution?.frames.length ?? 0) ? run.result : undefined) }
  selectVariant = (variant: number) => {
    if (this.state.execution || !this.stage.variants?.[variant]) return
    this.update({ ...this.state, variant })
  }
  private execute() {
    const all = this.stage.variants ? runAll(this.stage, this.state.program) : null
    return { all, variant: 0, execution: all?.results[0] ?? Interpreter.run(this.stage, this.state.program) }
  }
  get locked() { return this.state.execution !== null && !this.finished }
  get finished() { return isLastFrame(this.state.index, this.state.execution?.frames.length ?? 0) && (!this.state.all || this.variant === this.state.all.results.length - 1) }
  get showResult() { return this.finished && !this.state.dismissed }
  get stars() { return this.stage.variants && this.result === 'success' ? 3 : this.result ? Score.score(this.result, ProgramModel.countBlocks(this.state.program), this.stage.starBlocks) : 0 }
  get canNext() { return this.repository.getProgress().stages[this.stage.id]?.completed === true }
  private stop() { if (this.timer !== undefined) this.clock.clear(this.timer); this.timer = undefined }
  private publish(next: State) {
    this.stop()
    if (isLastFrame(next.index, next.execution?.frames.length ?? 0) && (!next.all || next.variant === next.all.results.length - 1) && (next.all?.result ?? next.execution?.result) === 'success' && (!this.finished || next.execution !== this.state.execution)) {
      this.repository.completeStage(this.stage.id, this.stage.variants ? 3 : Score.score('success', ProgramModel.countBlocks(next.program), this.stage.starBlocks), next.program)
    }
    this.update(next)
    if (next.playing && !this.finished) this.timer = this.clock.set(() => {
      this.advance(true)
    }, playbackSpeeds[next.speed])
  }
  private advance(playing: boolean) {
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
    this.editor.reconcile(program)
    this.publish({ ...this.state, program, undoProgram: null, execution: null, all: null, index: 0, playing: false, dismissed: false, failure: null })
  }
  edit = (program: Program) => {
    if (this.locked) return
    this.repository.saveProgram(this.stage.id, program)
    this.publish({ ...this.state, undoProgram: JSON.stringify(program) === JSON.stringify(this.state.program) ? this.state.undoProgram : structuredClone(this.state.program), program: structuredClone(program), execution: null, all: null, index: 0, playing: false, dismissed: false, failure: null })
  }
  play = () => {
    if (!this.state.program.length || this.state.playing) return
    const run = this.execute()
    const execution = run.execution
    this.publish({ ...this.state, ...run, failure: null, index: 0, playing: execution.frames.length > 1 || !!run.all && run.all.results.length > 1, dismissed: false })
  }
  step = () => {
    if (!this.state.program.length || this.state.playing || this.finished) return
    if (!this.state.execution) this.publish({ ...this.state, ...this.execute(), failure: null, index: 0, playing: false, dismissed: false })
    this.advance(false)
  }
  setSpeed = (speed: keyof typeof playbackSpeeds) => this.publish({ ...this.state, speed })
  reset = () => this.publish({ ...this.state, execution: null, all: null, failure: null, index: 0, playing: false, dismissed: false })
  fix = () => {
    if (!this.finished || !this.state.execution || this.result === 'success') return
    const failure = failurePoint(this.state.all ?? this.state.execution)
    this.editor.configure(this.state.program, this.edit, false, this.stage.maxBlocks)
    this.editor.reveal(failure?.blockId ?? null)
    this.publish({ ...this.state, execution: null, all: null, variant: this.state.all?.failedVariant ?? this.variant, failure, index: 0, playing: false, dismissed: false })
  }
  dismiss = () => this.update({ ...this.state, dismissed: true })
  toggleHint = () => this.update({ ...this.state, hintStep: this.state.hintStep === 0 ? 1 : 0 })
  nextHint = () => { if (this.state.hintStep === 1) this.update({ ...this.state, hintStep: 2 }) }
  dispose = () => this.stop()
}
