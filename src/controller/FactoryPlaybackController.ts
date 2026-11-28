import { Observable } from './Observable'
import { FactoryEditorController } from './FactoryEditorController'
import { playbackSpeeds } from './playback'
import type { Frame, RunResult } from '../model/factory/types'

type Playback = { frame: Frame | null; previous: Frame | null; running: boolean; started: boolean; finished: boolean; speed: keyof typeof playbackSpeeds }
/** Memory-only playback; stopping never resumes an old execution. */
export class FactoryPlaybackController extends Observable<Playback> {
  private result?: RunResult
  private unsubscribe?: () => void
  private viewed = false
  private executed = new Set<import('../model/factory/types').Block['type']>()
  private index = 0
  private timer?: ReturnType<typeof setTimeout>
  readonly editor: FactoryEditorController
  constructor(editor: FactoryEditorController) {
    super({ frame: null, previous: null, running: false, started: false, finished: false, speed: 'normal' })
    this.editor = editor
    editor.beforeHistoryClose = this.stop
    this.activate()
  }
  activate = () => {
    this.unsubscribe?.()
    let lastInput = JSON.stringify(this.editor.getSnapshot().input)
    this.unsubscribe = this.editor.subscribe(() => {
      const input = JSON.stringify(this.editor.getSnapshot().input)
      if (input !== lastInput) { lastInput = input; this.reset() }
    })
  }
  private clearTimer() { if (this.timer !== undefined) clearTimeout(this.timer); this.timer = undefined }
  private begin() {
    const run = this.editor.run()
    if (!run.allowed) return false
    this.finishRun('stopped')
    this.editor.history?.flushEdits()
    this.editor.history?.record('projectRunStarted', {})
    this.viewed = false; this.executed.clear()
    this.result = run.result
    this.index = 0
    this.editor.setLocked(true)
    this.update({ ...this.state, frame: run.result.frames[0], previous: null, started: true, finished: false })
    return true
  }
  private finishRun(outcome: 'stopped' | 'ended' | 'error' | 'stepLimit') {
    if (!this.result || !this.viewed) return
    this.editor.history?.record('projectRunEnded', { outcome, executed: [...this.executed], ...(this.state.frame?.error ? { error: this.state.frame.error.code } : {}) })
    this.viewed = false
  }
  private advance = () => {
    if (!this.result) return
    this.index = Math.min(this.index + 1, this.result.frames.length - 1)
    const finished = this.index === this.result.frames.length - 1 || !!this.result.frames[this.index].error
    this.update({ ...this.state, previous: this.state.frame, frame: this.result.frames[this.index], finished, running: this.state.running && !finished })
    this.viewed = true
    const id = this.state.frame?.activeBlockId
    const visit = (blocks: import('../model/factory/types').Block[]) => { for (const b of blocks) { if (b.id === id) this.executed.add(b.type); if ('body' in b) visit(b.body); if (b.type === 'if' && b.else) visit(b.else) } }
    const doc = this.editor.doc
    visit(doc.main); doc.functions.forEach(f => visit(f.body))
    if (finished) this.finishRun(this.state.frame?.error ? this.state.frame.error.code === 'stepLimit' ? 'stepLimit' : 'error' : 'ended')
    if (finished) { this.clearTimer(); this.editor.setLocked(false) }
    else if (this.state.running) this.schedule()
  }
  private schedule() { this.clearTimer(); this.timer = setTimeout(this.advance, playbackSpeeds[this.state.speed]) }
  play = () => {
    if (this.state.running) return
    if (!this.begin()) return
    this.update({ ...this.state, running: true })
    this.schedule()
  }
  step = () => {
    if (this.state.running) return
    if ((!this.state.started || this.state.finished) && !this.begin()) return
    this.advance()
  }
  stop = () => { this.finishRun('stopped'); this.clearTimer(); this.result = undefined; this.editor.setLocked(false); this.update({ ...this.state, running: false, started: false }) }
  reset = () => { this.stop(); this.update({ ...this.state, frame: null, previous: null, finished: false }) }
  setSpeed = (speed: Playback['speed']) => { this.update({ ...this.state, speed }); if (this.state.running) this.schedule() }
  dispose = () => { this.unsubscribe?.(); this.unsubscribe = undefined; this.stop() }
}
