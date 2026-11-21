import { stageCards } from '../../controller/flow'
import { type Progress } from '../../model/ProgressRepository'
import { t } from '../../i18n/I18n'

type Props = { progress: Progress; onSelect: (index: number) => void; onHome: () => void }
export function StageSelectPage({ progress, onSelect, onHome }: Props) {
  return <section>
    <h1 tabIndex={-1} data-page-title>{t('stageList')}</h1>
    <button type="button" onClick={onHome}>{t('home')}</button>
    <ol className="stage-list">{stageCards(progress).map(({ stage, index, unlocked, stars }) => {
      return <li key={stage.id}>
        <button type="button" className="stage-card" disabled={!unlocked} onClick={() => onSelect(index)}>
          <strong>{t('stage')} {stage.id}: {t(stage.title)}</strong>
          <span>{t('bestStars', { count: stars })} <span aria-hidden="true">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</span></span>
          <span>{unlocked ? t('unlocked') : t('locked')}</span>
        </button>
      </li>
    })}</ol>
  </section>
}
