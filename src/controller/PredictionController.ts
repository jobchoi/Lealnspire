import { Observable } from './Observable'
import { GameController, type Scheduler } from './GameController'
import { ProgressRepository } from '../model/ProgressRepository'
import { allStages as stages } from '../model/stages'
import { samePrediction, type Prediction } from '../model/predictions'
export class PredictionController extends Observable<{ selected: number | null }> {
  readonly game: GameController
  readonly challenge: Prediction
  constructor(challenge: Prediction, clock?: Scheduler) {
    super({ selected: null })
    this.challenge = challenge
    const repository = new ProgressRepository()
    const stage = stages.find(stage => stage.id === challenge.stageId)!
    repository.saveProgram(stage.id, challenge.program)
    this.game = new GameController(stage, repository, clock)
  }
  get correct() {
    const selected = this.state.selected
    return selected !== null && this.game.finished && !!this.game.frame && samePrediction(this.challenge.choices[selected], this.game.frame)
  }
  choose = (index: number) => {
    if (this.state.selected !== null || !Number.isInteger(index) || !this.challenge.choices[index]) return
    this.update({ selected: index })
    this.game.play()
  }
  retry = () => { this.game.reset(); this.update({ selected: null }) }
  dispose = () => this.game.dispose()
}
