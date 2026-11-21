import { Observable } from './Observable'
import { Interpreter } from '../model/interpreter'
import { Program as ProgramModel } from '../model/program'
import { Score } from '../model/score'
import type { Program, RunResult, Stage } from '../model/types'
import type { ProgressRepository } from '../model/ProgressRepository'
import { isLastFrame, nextFrameIndex, playbackSpeeds } from './playback'
export type Scheduler = { set(callback: () => void, delay: number): unknown; clear(handle: unknown): void }
const scheduler: Scheduler = { set: (callback, delay) => setTimeout(callback, delay), clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>) }
type State = { program: Program; execution: RunResult | null; index: number; playing: boolean; dismissed: boolean; speed: keyof typeof playbackSpeeds; showHint: boolean }
export class GameController extends Observable<State> {
  readonly stage: Stage
  readonly repository: ProgressRepository
  private clock: Scheduler
  private timer: unknown
  constructor(stage: Stage, repository: ProgressRepository, clock: Scheduler = scheduler) {
    super({ program: repository.getProgram(stage), execution: null, index: 0, playing: false, dismissed: false, speed: 'normal', showHint: false })
    this.stage = stage; this.repository = repository; this.clock = clock
  }
  get frame() { return this.state.execution?.frames[this.state.index] }
  get result() { return this.state.execution?.result }
  get locked() { return this.state.execution !== null }
  get finished() { return isLastFrame(this.state.index, this.state.execution?.frames.length ?? 0) }
  get showResult() { return this.finished && !this.state.dismissed }
  get stars() { return this.result ? Score.score(this.result, ProgramModel.countBlocks(this.state.program), this.stage.starBlocks) : 0 }
  get canNext() { return this.repository.getProgress().stages[this.stage.id]?.completed === true }
  private stop() { if (this.timer !== undefined) this.clock.clear(this.timer); this.timer = undefined }
  private publish(next: State) {
    this.stop()
    if (isLastFrame(next.index, next.execution?.frames.length ?? 0) && next.execution?.result === 'success' && (!this.finished || next.execution !== this.state.execution)) {
      this.repository.completeStage(this.stage.id, Score.score('success', ProgramModel.countBlocks(next.program), this.stage.starBlocks), next.program)
    }
    this.update(next)
    if (next.playing && !this.finished) this.timer = this.clock.set(() => {
      const index = nextFrameIndex(this.state.index, this.state.execution!.frames.length)
      this.publish({ ...this.state, index, playing: !isLastFrame(index, this.state.execution!.frames.length) })
    }, playbackSpeeds[next.speed])
  }
  edit = (program: Program) => {
    if (this.locked) return
    this.repository.saveProgram(this.stage.id, program)
    this.publish({ ...this.state, program: structuredClone(program) })
  }
  play = () => {
    if (!this.state.program.length || this.state.playing) return
    const execution = Interpreter.run(this.stage, this.state.program)
    this.publish({ ...this.state, execution, index: 0, playing: execution.frames.length > 1, dismissed: false })
  }
  step = () => {
    if (!this.state.program.length || this.state.playing || this.finished) return
    const execution = this.state.execution ?? Interpreter.run(this.stage, this.state.program)
    this.publish({ ...this.state, execution, index: nextFrameIndex(this.state.index, execution.frames.length), playing: false, dismissed: false })
  }
  setSpeed = (speed: keyof typeof playbackSpeeds) => this.publish({ ...this.state, speed })
  reset = () => this.publish({ ...this.state, execution: null, index: 0, playing: false, dismissed: false })
  dismiss = () => this.update({ ...this.state, dismissed: true })
  toggleHint = () => this.update({ ...this.state, showHint: !this.state.showHint })
  dispose = () => this.stop()
}
