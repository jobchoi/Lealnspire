import { Observable } from './Observable'
import { allStages as stages, isLastStage } from '../model/stages'
import { ProgressRepository, isUnlocked } from '../model/ProgressRepository'
import { continueStageIndex, stageCards } from './flow'
import { GameController } from './GameController'
import { predictions } from '../model/predictions'
import { PredictionController } from './PredictionController'
export type Screen = { page: 'home' | 'list' } | { page: 'play'; index: number } | { page: 'prediction'; id: string }
export class AppController extends Observable<Screen> {
  readonly repository: ProgressRepository
  prediction?: PredictionController
  game?: GameController
  constructor(repository = new ProgressRepository()) { super({ page: 'home' }); this.repository = repository }
  get progress() { return this.repository.getProgress() }
  get continueIndex() { return continueStageIndex(this.progress) }
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
    this.prediction = new PredictionController(challenge)
    this.update({ page: 'prediction', id })
  }
  start = () => this.openStage(0)
  continue = () => { if (this.continueIndex !== undefined) this.openStage(this.continueIndex) }
  list = () => { this.prediction?.dispose(); this.game?.dispose(); this.update({ page: 'list' }) }
  home = () => { this.prediction?.dispose(); this.game?.dispose(); this.update({ page: 'home' }) }
  next = () => {
    if (this.state.page !== 'play') return
    if (isLastStage(this.state.index)) this.list()
    else this.openStage(this.state.index + 1)
  }
}
