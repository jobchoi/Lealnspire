import { stages } from '../stages'
import { isUnlocked, type Progress } from '../storage/progress'
import { ko } from '../i18n/ko'

type Props = { progress: Progress; onSelect: (index: number) => void; onHome: () => void }
export function StageSelectPage({ progress, onSelect, onHome }: Props) {
  return <section>
    <h1 tabIndex={-1} data-page-title>{ko.stageList}</h1>
    <button type="button" onClick={onHome}>{ko.home}</button>
    <ol className="stage-list">{stages.map((stage, index) => {
      const unlocked = isUnlocked(progress, index)
      const stars = progress.stages[stage.id]?.bestStars ?? 0
      return <li key={stage.id}>
        <button type="button" className="stage-card" disabled={!unlocked} onClick={() => onSelect(index)}>
          <strong>{ko.stage} {stage.id}: {stage.title}</strong>
          <span>{ko.bestStars(stars)} <span aria-hidden="true">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</span></span>
          <span>{unlocked ? ko.unlocked : ko.locked}</span>
        </button>
      </li>
    })}</ol>
  </section>
}
