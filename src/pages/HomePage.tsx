import type { Progress } from '../storage/progress'
import { ko } from '../i18n/ko'
import { continueStageIndex } from './flow'

type Props = { progress: Progress; onStart: () => void; onContinue: (index: number) => void; onList: () => void }
export function HomePage({ progress, onStart, onContinue, onList }: Props) {
  const next = continueStageIndex(progress)
  return <section>
    <h1 tabIndex={-1} data-page-title>{ko.title}</h1>
    <p>{ko.introduction}</p>
    <div className="playback-controls">
      <button type="button" onClick={onStart}>{ko.start}</button>
      {next !== undefined && <button type="button" onClick={() => onContinue(next)}>{ko.continue}</button>}
      <button type="button" onClick={onList}>{ko.stageList}</button>
    </div>
  </section>
}
