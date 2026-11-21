import type { Progress } from '../../model/ProgressRepository'
import { t } from '../../i18n/I18n'
import { continueStageIndex } from '../../controller/flow'

type Props = { progress: Progress; onStart: () => void; onContinue: (index: number) => void; onList: () => void }
export function HomePage({ progress, onStart, onContinue, onList }: Props) {
  const next = continueStageIndex(progress)
  return <section>
    <h1 tabIndex={-1} data-page-title>{t('title')}</h1>
    <p>{t('introduction')}</p>
    <div className="playback-controls">
      <button type="button" onClick={onStart}>{t('start')}</button>
      {next !== undefined && <button type="button" onClick={() => onContinue(next)}>{t('continue')}</button>}
      <button type="button" onClick={onList}>{t('stageList')}</button>
    </div>
  </section>
}
