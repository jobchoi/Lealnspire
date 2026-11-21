import { worlds } from '../theme/themes'
import { ConceptDefs, WorldScene } from '../theme/Symbols'
import type { Progress } from '../../model/ProgressRepository'
import { t } from '../../i18n/I18n'
import { continueStageIndex } from '../../controller/flow'

type Props = { progress: Progress; onStart: () => void; onContinue: (index: number) => void; onList: () => void }
export function HomePage({ progress, onStart, onContinue, onList }: Props) {
  const next = continueStageIndex(progress)
  return <section className="home-page"><ConceptDefs />
    <h1 tabIndex={-1} data-page-title>{t('title')}</h1>
    <p>{t('introduction')}</p>
    <p>{t('themes.introduction')}</p>
    <div className="world-gallery">{worlds.map(world => <article key={world} className={`world-preview world-${world}`}><WorldScene world={world} /><h2>{t(`themes.${world}.name`)}</h2><p>{t(`themes.${world}.description`)}</p></article>)}</div>
    <div className="playback-controls">
      <button type="button" onClick={onStart}>{t('start')}</button>
      {next !== undefined && <button type="button" onClick={() => onContinue(next)}>{t('continue')}</button>}
      <button type="button" onClick={onList}>{t('stageList')}</button>
    </div>
  </section>
}
