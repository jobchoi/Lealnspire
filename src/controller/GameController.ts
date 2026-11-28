import type { ActivityKind, HistoryEventInput, HistoryPayloads } from '../model/history'
import { blockAt, hasBody, findBlockPath } from '../model/editor'
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
type State = { saveNotice: boolean; variant: number; all: RunAllResult | null; undoProgram: ProgramDocument | null; doc: ProgramDocument; program: Program; execution: RunResult | null; index: number; playing: boolean; dismissed: boolean; speed: keyof typeof playbackSpeeds; hintStep: 0 | 1 | 2; failure: ReturnType<typeof failurePoint> }
export class GameController extends Observable<State> {
  private static readonly notifiedRepositories = new WeakSet<ProgressRepository>()
  private static takeSaveNotice(repository: ProgressRepository) {
    if (repository.persistent || this.notifiedRepositories.has(repository)) return false
    this.notifiedRepositories.add(repository)
    return true
  }
  hasEdited = false
  readonly editor = new EditorController(() => { if (this.finished) this.reset() }, { undo: () => this.undo(), available: () => this.canUndo })
  readonly stage: Stage
  readonly repository: ProgressRepository
  private visitId: string
  private startedAt: number
  private ended = false
  private visible = true
  private segmentStart = 0
  private lastInput = 0
  private timeSegments: HistoryPayloads['timeSegment'][] = []
  private revision = 0
  private changes = 0
  private lastCode?: string
  private attemptId?: string
  private terminal = true
  private previousFailed = false
  private hints = new Set<number>()
  private demo?: { id: string; reachedEnd: boolean }
  private historyRepository: ProgressRepository
  private activityKind: ActivityKind
  private activityId: string
  private clock: Scheduler
  private timer: unknown
  constructor(stage: Stage, repository: ProgressRepository, clock: Scheduler = scheduler, historyRepository = repository, activityKind: ActivityKind = stage.id.startsWith('b') ? 'bonus' : 'puzzle', activityId = stage.id) {
    super({ saveNotice: GameController.takeSaveNotice(repository), variant: 0, all: null, undoProgram: null, doc: repository.getDocument(stage), program: repository.getProgram(stage), execution: null, index: 0, playing: false, dismissed: false, speed: 'normal', hintStep: 0, failure: null })
    this.stage = stage; this.repository = repository; this.clock = clock
    this.historyRepository = historyRepository; this.activityKind = activityKind; this.activityId = activityId
    historyRepository.recoverHistory()
    this.visitId = historyRepository.historyId(); this.startedAt = Date.parse(historyRepository.historyNow())
    this.record('visitStarted', {})
    // Keep T78's notice timing: a first write failure is surfaced on the next action.
    historyRepository.flushHistory()
    this.editor.program = this.state.program
    this.editor.functions = structuredClone(this.state.doc.functions)
    this.editor.onChange = this.edit
    this.editor.searchEnabled = !!stage.search
    this.editor.listsEnabled = !!stage.lists
    this.editor.eventsEnabled = stage.events === true
    this.editor.returnsEnabled = stage.returns === true
    this.editor.paramsEnabled = stage.params === true
    this.editor.logicEnabled = stage.id.startsWith('u6-')
    this.editor.maxBlocks = stage.maxBlocks
    this.editor.onDocumentChange = this.edit
  }
  private elapsed() { return Math.max(this.segmentStart, 0, Date.parse(this.historyRepository.historyNow()) - this.startedAt) }
  private record<K extends keyof HistoryPayloads>(type: K, data: HistoryPayloads[K], attemptId?: string) {
    if (this.ended) return
    this.historyRepository.appendHistory({ type, data, visitId: this.visitId, ...(attemptId ? { attemptId } : {}),
      activityKind: this.activityKind, activityId: this.activityId, unit: Number(/^u(\d+)-/.exec(this.stage.id)?.[1] ?? 1),
      recordedAt: this.historyRepository.historyNow(), elapsedMs: this.elapsed(), appVersion: '1.20.0', contentVersion: '1', evaluationVersion: '1',
    } as HistoryEventInput, true)
  }
  private time() {
    const endMs = this.elapsed()
    const mode = this.demo ? 'demo' : this.state.playing ? 'playback' : 'activity'
    const add = (startMs: number, end: number, active: boolean) => {
      if (end <= startMs) return
      const lastInputMs = active ? startMs : this.lastInput
      const previous = this.timeSegments.at(-1)
      const previousActive = previous && previous.endMs <= previous.lastInputMs + 60_000
      if (previous && previous.endMs === startMs && previous.mode === mode && previous.visible === this.visible && previousActive === active && (!active || mode !== 'activity' || end - previous.lastInputMs <= 60_000)) previous.endMs = end
      else this.timeSegments.push({ startMs, endMs: end, lastInputMs, visible: this.visible, mode })
    }
    const boundary = mode === 'activity' ? Math.min(endMs, Math.max(this.segmentStart, this.lastInput + 60_000)) : endMs
    add(this.segmentStart, boundary, true); add(boundary, endMs, false)
    this.segmentStart = endMs
  }
  flushHistory = (deferred = false) => {
    if (this.ended) return
    this.time()
    for (const segment of this.timeSegments) this.record('timeSegment', segment)
    this.timeSegments = []
    this.codeSummary()
    if (deferred) return
    this.historyRepository.flushHistory()
    if (GameController.takeSaveNotice(this.historyRepository)) this.update({ ...this.state, saveNotice: true })
  }
  activity = () => { this.time(); this.lastInput = this.elapsed() }
  setVisible = (visible: boolean) => {
    if (this.ended || this.visible === visible) return
    this.time(); this.visible = visible
    this.flushHistory()
  }
  private codeSummary() {
    if (!this.changes) return
    const counts: HistoryPayloads['codeChanged']['counts'] = {}
    const count = (blocks: Program) => { for (const block of blocks) { counts[block.type] = (counts[block.type] ?? 0) + 1; if (hasBody(block)) { count(block.body); if (block.type === 'if') count(block.else ?? []) } } }
    count(this.state.doc.main); this.state.doc.functions.forEach(fn => count(fn.body))
    this.record('codeChanged', { revision: this.revision, changes: this.changes, counts, changed: JSON.stringify(this.state.doc) !== this.lastCode })
    this.changes = 0
  }
  private interrupt(reason: HistoryPayloads['executionInterrupted']['reason']) {
    if (this.attemptId && !this.terminal) { this.record('executionInterrupted', { reason }, this.attemptId); this.terminal = true }
  }
  private begin(run: ReturnType<GameController['execute']>, mode: 'auto' | 'step') {
    this.activity(); this.interrupt('rerun'); this.codeSummary()
    const previousAttemptId = this.attemptId
    this.attemptId = this.historyRepository.historyId(); this.terminal = false
    const code = JSON.stringify(this.state.doc)
    this.record('attemptStarted', { revision: this.revision, mode, changed: code !== this.lastCode, ...(previousAttemptId ? { previousAttemptId } : {}) }, this.attemptId)
    this.lastCode = code
    const failure = failurePoint(run.all ?? run.execution)
    const blocks = failure?.call ? this.state.doc.functions.find(fn => fn.id === failure.call?.fn)?.body ?? [] : this.state.program
    const path = failure ? findBlockPath(blocks, failure.blockId) : undefined
    const block = path ? blockAt(blocks, path) : undefined
    this.record('executionCalculated', { result: run.all?.result ?? run.execution.result, variants: run.all?.results.map(r => r.result) ?? [run.execution.result], failedVariant: run.all?.failedVariant ?? (run.execution.result === 'success' ? null : 0), ...(block ? { cause: block.type, path: path! } : {}), ...(failure?.call ? { callId: failure.call.callId } : {}) }, this.attemptId)
    this.previousFailed = false
    this.flushHistory()
  }
  demoStarted = (id: string) => { this.activity(); this.demoEnded(); this.demo = { id, reachedEnd: false }; this.record('demoStarted', { demoId: id }); this.flushHistory() }
  demoReachedEnd = () => {
    if (!this.demo || this.demo.reachedEnd) return
    this.time(); this.demo.reachedEnd = true
    this.record('demoEnded', { demoId: this.demo.id, reachedEnd: true }); this.flushHistory()
  }
  demoEnded = () => {
    if (!this.demo) return
    this.time()
    if (!this.demo.reachedEnd) this.record('demoEnded', { demoId: this.demo.id, reachedEnd: false })
    this.demo = undefined; this.flushHistory()
  }
  endVisit = (reason: HistoryPayloads['visitEnded']['reason'] = 'leave') => {
    if (this.ended) return
    this.time(); this.demoEnded(); this.codeSummary(); this.interrupt(reason === 'hidden' ? 'hidden' : 'leave')
    this.flushHistory(true); this.record('visitEnded', { reason }); this.ended = true; this.historyRepository.flushHistory()
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
    if (next.playing !== this.state.playing) this.time()
    this.stop()
    if (isLastFrame(next.index, next.execution?.frames.length ?? 0) && (!next.all || next.variant === next.all.results.length - 1) && (next.all?.result ?? next.execution?.result) === 'success' && (!this.finished || next.execution !== this.state.execution)) {
      this.record('completionConfirmed', { first: !this.repository.getProgress().stages[this.stage.id]?.completed, stars: this.stage.variants ? 3 : Score.score('success', new FunctionProgram(next.doc).count(), this.stage.starBlocks) }, this.attemptId)
      this.repository.completeStage(this.stage.id, this.stage.variants ? 3 : Score.score('success', new FunctionProgram(next.doc).count(), this.stage.starBlocks), next.doc)
    }
    this.editor.program = next.program
    this.editor.functions = structuredClone(next.doc.functions)
    this.update({ ...next, saveNotice: next.saveNotice || GameController.takeSaveNotice(this.repository) })
    if (this.finished && this.attemptId && !this.terminal) {
      this.time(); this.record('resultReached', {}, this.attemptId); this.terminal = true; this.previousFailed = this.result !== 'success'
      this.flushHistory()
    }
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
    this.activity(); this.revision++; this.changes++; this.record('undo', { revision: this.revision })
    const program = structuredClone(this.state.undoProgram!)
    this.repository.saveProgram(this.stage.id, program)
    this.editor.functions = structuredClone(program.functions)
    this.editor.reconcile(program.main)
    this.publish({ ...this.state, program: program.main, doc: program, undoProgram: null, execution: null, all: null, index: 0, playing: false, dismissed: false, failure: null })
  }
  edit = (input: ProgramInput) => {
    if (this.locked) return
    this.activity()
    this.hasEdited = true
    const doc = structuredClone(Array.isArray(input) ? { main: input, functions: this.state.doc.functions } : programDocument(input))
    new FunctionProgram(doc)
    if (JSON.stringify(doc) !== JSON.stringify(this.state.doc)) {
      this.revision++; this.changes++
      if (this.previousFailed && this.attemptId) { this.record('fixRequested', { previousAttemptId: this.attemptId, source: 'edit' }); this.previousFailed = false }
    }
    this.repository.saveProgram(this.stage.id, doc)
    this.publish({ ...this.state, undoProgram: JSON.stringify(doc) === JSON.stringify(this.state.doc) ? this.state.undoProgram : structuredClone(this.state.doc), doc, program: doc.main, execution: null, all: null, index: 0, playing: false, dismissed: false, failure: null })
  }
  play = () => {
    if (!this.state.program.length && !this.state.doc.functions.length || this.state.playing) return
    const run = this.execute()
    this.begin(run, 'auto')
    const execution = run.execution
    this.publish({ ...this.state, ...run, failure: null, index: 0, playing: execution.frames.length > 1 || !!run.all && run.all.results.length > 1, dismissed: false })
  }
  step = () => {
    if (!this.state.program.length && !this.state.doc.functions.length || this.state.playing || this.finished) return
    this.activity()
    if (!this.state.execution) { const run = this.execute(); this.begin(run, 'step'); this.publish({ ...this.state, ...run, failure: null, index: 0, playing: false, dismissed: false }) }
    this.advance(false)
  }
  setSpeed = (speed: keyof typeof playbackSpeeds) => this.publish({ ...this.state, speed })
  reset = () => { this.activity(); this.interrupt('reset'); this.publish({ ...this.state, execution: null, all: null, failure: null, index: 0, playing: false, dismissed: false }); this.flushHistory() }
  fix = () => {
    if (!this.finished || !this.state.execution || this.result === 'success') return
    this.activity()
    if (this.attemptId) this.record('fixRequested', { previousAttemptId: this.attemptId, source: 'button' })
    this.previousFailed = false
    const failure = failurePoint(this.state.all ?? this.state.execution)
    this.editor.configure(this.state.program, this.edit, false, this.stage.maxBlocks)
    this.editor.reveal(failure?.blockId ?? null, failure?.call?.fn)
    this.publish({ ...this.state, execution: null, all: null, variant: this.state.all?.failedVariant ?? this.variant, failure, index: 0, playing: false, dismissed: false })
  }
  dismissSaveNotice = () => this.update({ ...this.state, saveNotice: false })
  dismiss = () => this.update({ ...this.state, dismissed: true })
  private hint(step: 1 | 2) { this.activity(); if (!this.hints.has(step)) { this.hints.add(step); this.record('hintShown', { step, first: true }); this.flushHistory() } }
  toggleHint = () => { if (this.state.hintStep === 0) this.hint(1); this.update({ ...this.state, hintStep: this.state.hintStep === 0 ? 1 : 0 }) }
  nextHint = () => { if (this.state.hintStep === 1) { this.hint(2); this.update({ ...this.state, hintStep: 2 }) } }
  suspend = () => this.stop()
  dispose = () => { this.stop(); this.endVisit() }
}
