import { Observable } from './Observable'
import { EditorController } from './EditorController'
import { Interpreter } from '../model/interpreter'
import type { Stage } from '../model/types'
import type { Scheduler } from './GameController'

export const demoStage: Stage = { id: 'demo-add-run', world: 'sketchbook', title: 'demo.title', goal: 'demo.title', grid: ['S.', '#G'], startDir: 'E', starBlocks: 1, hints: { keys: ['demo.title', 'demo.title'], highlight: 'goal' }, solution: [] }
const clock: Scheduler = { set: (fn, delay) => setTimeout(fn, delay), clear: id => clearTimeout(id as ReturnType<typeof setTimeout>) }
export class DemoController extends Observable<{ cut: number; paused: boolean }> {
  readonly editor = new EditorController()
  private timer: unknown
  private disposed = false
  private readonly complete: () => void
  private readonly scheduler: Scheduler
  constructor(complete: () => void, scheduler = clock) { super({ cut: 0, paused: true }); this.complete = complete; this.scheduler = scheduler }
  get program() { return this.state.cut ? this.editor.program : [] }
  get frame() { return Interpreter.run(demoStage, this.program).frames.at(this.state.cut === 3 ? -1 : 0)! }
  private stop() { if (this.timer !== undefined) this.scheduler.clear(this.timer); this.timer = undefined }
  private schedule() {
    this.stop()
    if (!this.disposed && !this.state.paused && this.state.cut < 3) this.timer = this.scheduler.set(() => this.next(), 2400)
  }
  restart = (manual = false) => {
    this.disposed = false
    this.stop(); this.editor.program = []; this.editor.add('forward')
    this.update({ cut: 0, paused: manual }); this.schedule()
  }
  next = () => {
    if (this.disposed || this.state.cut === 3) return
    const cut = this.state.cut + 1
    this.update({ cut, paused: cut === 3 || this.state.paused })
    if (cut === 3) this.complete()
    this.schedule()
  }
  back = () => { if (!this.disposed) { this.stop(); this.update({ cut: Math.max(0, this.state.cut - 1), paused: true }) } }
  pause = () => { if (!this.disposed) { this.update({ ...this.state, paused: !this.state.paused }); this.schedule() } }
  dispose = () => { this.disposed = true; this.stop() }
}
export function canOfferDemo(stageId: string, edited: boolean, executing: boolean, result: boolean) { return stageId === '1' && !edited && !executing && !result }
