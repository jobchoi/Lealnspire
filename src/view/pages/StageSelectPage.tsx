import { predictions } from '../../model/predictions'
import { worlds } from '../theme/themes'
import { Symbol } from '../theme/Symbols'
import { stageCards } from '../../controller/flow'
import { type Progress } from '../../model/ProgressRepository'
import { t } from '../../i18n/I18n'

type Props = { progress: Progress; onSelect: (index: number) => void; onHome: () => void; onPrediction?: (id: string) => void }
export function StageSelectPage({ progress, onSelect, onHome, onPrediction }: Props) {
  return <section className="stage-select-page">
    <h1 tabIndex={-1} data-page-title>{t('stageList')}</h1>
    <button type="button" onClick={onHome}>{t('home')}</button>
    {worlds.map(world => <div key={world} className={`stage-world world-${world}`}><h2 className={`world-heading world-${world}`}><Symbol name={world} />{t(`themes.${world}.name`)}</h2><ol className="stage-list">{stageCards(progress).filter(card => card.stage.world === world).map(({ stage, index, unlocked, stars }) => {
      return <li key={stage.id}>
        <button type="button" className="stage-card" disabled={!unlocked} onClick={() => onSelect(index)}>
          <strong>{t('stage')} {stage.id}: {t(stage.title)}</strong>
          <span>{t('bestStars', { count: stars })} <span aria-hidden="true">{Array.from({ length: 3 }, (_, i) => <span key={i} className={i < stars ? 'earned-star' : 'empty-star'} style={{ opacity: i < stars ? 1 : .25 }}><Symbol name="goal" /></span>)}</span></span>
          <span>{unlocked ? t('unlocked') : t('locked')}</span>
        </button>
        {progress.stages[stage.id]?.completed && predictions.filter(p => p.stageId === stage.id).map(p => <button className="prediction-entry" key={p.id} type="button" aria-label={t('prediction.title')} onClick={() => onPrediction?.(p.id)}><Symbol name="prediction" /> {t('prediction.title')}</button>)}
      </li>
    })}</ol></div>)}
  </section>
}
