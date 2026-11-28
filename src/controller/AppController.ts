import { adminSummary } from '../model/adminSummary'
import { learningSummary, summarizeHistory, summaryKey } from '../model/historySummary'
import { Observable } from './Observable'
import { allStages as stages, isLastStage } from '../model/stages'
import { ProgressRepository, isUnlocked } from '../model/ProgressRepository'
import { continueStageIndex, stageCards, nextUnit } from './flow'
import { GameController } from './GameController'
import { predictions } from '../model/predictions'
import { PredictionController } from './PredictionController'
export type Screen = { page: 'home' | 'learning' | 'admin' | 'factory' } | { page: 'list'; unit?: number } | { page: 'play'; index: number } | { page: 'prediction'; id: string }
export class AppController extends Observable<Screen> {
  readonly repository: ProgressRepository
  prediction?: PredictionController
  game?: GameController
  constructor(repository = new ProgressRepository()) { super({ page: 'home' }); this.repository = repository }
  get progress() { return this.repository.getProgress() }
  get continueIndex() { return continueStageIndex(this.progress) }
  get learningData() {
    const data = learningSummary(this.repository.getHistory(), this.progress, stages, this.repository.getProgressDocument())
    return { ...data, next: this.cards.find(c => !c.stage.id.startsWith('b') && c.unlocked && !this.progress.stages[c.stage.id]?.completed),
      tools: Array.from({ length: 12 }, (_, i) => {
        const unit = i + 1
        const entries = data.entries.filter(e => e.puzzle.unit === unit && !e.stage.id.startsWith('b'))
        return { unit, total: entries.length, completed: data.units[unit]?.completed ?? 0, active: entries.some(e => this.cards[e.index].unlocked) }
      }) }
  }
  get adminData() { return { ...adminSummary(this.repository.getHistory(), this.progress, stages, this.repository.getProgressDocument()), persistent: this.repository.persistent } }
  factory = () => { this.prediction?.dispose(); this.game?.dispose(); this.update({ page: 'factory' }) }
  admin = () => { this.prediction?.dispose(); this.game?.dispose(); this.update({ page: 'admin' }) }
  get reviews() { return summarizeHistory(this.repository.getHistory(), this.progress, stages).puzzles }
  setReview = (id: string, selected: boolean) => {
    this.repository.setReview(id, selected)
    this.update({ ...this.state })
  }
  isReview = (id: string) => this.reviews[summaryKey(id.startsWith('b') ? 'bonus' : 'puzzle', id)]?.reviewSelected ?? false
  learning = () => { this.prediction?.dispose(); this.game?.dispose(); this.update({ page: 'learning' }) }
  unitList = (unit: number) => { this.prediction?.dispose(); this.game?.dispose(); this.update({ page: 'list', unit }) }
  get cards() { return stageCards(this.progress) }
  openStage = (index: number) => {
    if (!isUnlocked(this.progress, index)) return
    this.prediction?.dispose()
    this.game?.dispose()
    this.game = new GameController(stages[index], this.repository)
    this.update({ page: 'play', index })
  }
  clearProgress = () => {
    this.prediction?.dispose()
    this.game?.dispose()
    this.game = undefined
    const cleared = this.repository.clear()
    this.update({ page: 'home' })
    return cleared
  }
  openPrediction = (id: string) => {
    const challenge = predictions.find(challenge => challenge.id === id)
    if (!challenge || this.progress.stages[challenge.stageId]?.completed !== true) return
    this.game?.dispose()
    this.prediction?.dispose()
    this.prediction = new PredictionController(challenge, undefined, this.repository)
    this.update({ page: 'prediction', id })
  }
  setVisible = (visible: boolean) => {
    const active = this.state.page === 'play' ? this.game : this.state.page === 'prediction' ? this.prediction?.game : undefined
    active?.setVisible(visible)
  }
  flushHistory = () => {
    if (this.state.page === 'play') this.game?.flushHistory()
    if (this.state.page === 'prediction') this.prediction?.game.flushHistory()
  }
  activity = () => {
    const active = this.state.page === 'play' ? this.game : this.state.page === 'prediction' ? this.prediction?.game : undefined
    active?.activity()
  }
  pagehide = () => {
    if (this.state.page === 'play') { this.game?.suspend(); this.game?.endVisit('reload') }
    if (this.state.page === 'prediction') { this.prediction?.game.suspend(); this.prediction?.game.endVisit('reload') }
  }
  restorePage = () => {
    if (this.state.page === 'play') this.openStage(this.state.index)
    else if (this.state.page === 'prediction') this.openPrediction(this.state.id)
  }
  start = () => this.openStage(0)
  continue = () => { if (this.continueIndex !== undefined) this.openStage(this.continueIndex) }
  list = () => { this.prediction?.dispose(); this.game?.dispose(); this.update({ page: 'list' }) }
  home = () => { this.prediction?.dispose(); this.game?.dispose(); this.update({ page: 'home' }) }
  nextUnit = () => {
    if (this.state.page !== 'play') return
    const target = nextUnit(stages[this.state.index].id)
    if (target) this.openStage(target.index)
  }
  next = () => {
    if (this.state.page !== 'play') return
    if (isLastStage(this.state.index)) this.list()
    else this.openStage(this.state.index + 1)
  }
}
