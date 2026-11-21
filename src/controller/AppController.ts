import { Observable } from './Observable'
import { stages } from '../model/stages'
import { ProgressRepository, isUnlocked } from '../model/ProgressRepository'
import { continueStageIndex, stageCards } from './flow'
import { GameController } from './GameController'
export type Screen = { page: 'home' | 'list' } | { page: 'play'; index: number }
export class AppController extends Observable<Screen> {
  readonly repository: ProgressRepository
  game?: GameController
  constructor(repository = new ProgressRepository()) { super({ page: 'home' }); this.repository = repository }
  get progress() { return this.repository.getProgress() }
  get continueIndex() { return continueStageIndex(this.progress) }
  get cards() { return stageCards(this.progress) }
  openStage = (index: number) => {
    if (!isUnlocked(this.progress, index)) return
    this.game?.dispose()
    this.game = new GameController(stages[index], this.repository)
    this.update({ page: 'play', index })
  }
  start = () => this.openStage(0)
  continue = () => { if (this.continueIndex !== undefined) this.openStage(this.continueIndex) }
  list = () => { this.game?.dispose(); this.update({ page: 'list' }) }
  home = () => { this.game?.dispose(); this.update({ page: 'home' }) }
  next = () => {
    if (this.state.page !== 'play') return
    if (this.state.index === stages.length - 1) this.list()
    else this.openStage(this.state.index + 1)
  }
}
