import { t } from '../../i18n/I18n'
import { Symbol } from '../theme/Symbols'

export function CourseCompletion() {
  return <div className="course-completion" role="status">
    <div className="course-worlds" aria-hidden="true">{['sketchbook', 'train', 'handheld'].map(world => <span key={world}><Symbol name={world} /></span>)}</div>
    <strong>{t('synthesis.complete')}</strong>
    <p>{t('synthesis.review')}</p>
  </div>
}
