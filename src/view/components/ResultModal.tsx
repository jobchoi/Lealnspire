import { CourseCompletion } from './CourseCompletion'
import { Symbol } from '../theme/Symbols'
import { defaultTheme as theme } from '../theme/defaultTheme'
import { useEffect, useRef } from 'react'
import type { RunResult } from '../../model/types'
import { t } from '../../i18n/I18n'

type Props = { reviewSelected?: boolean; onReview?: () => void; storageUnavailable?: boolean; nextUnitKey?: string; onNextUnit?: () => void; unit12?: boolean; courseComplete?: boolean; unit11?: boolean; notice?: string; stageLabel?: string; failureMessage?: string; unit2?: boolean; unit3?: boolean; unit4?: boolean; unit5?: boolean; unit6?: boolean; unit7?: boolean; unit8?: boolean; unit10?: boolean; unit9?: boolean; result: RunResult['result']; stars: number; onFix?: () => void; restoreFocus?: (previous: Element | null, fixed: boolean) => void; onRetry: () => void; onClose: () => void; onNext?: () => void; lastStage?: boolean; bonusStage?: boolean }
export function ResultModal({ reviewSelected, onReview, storageUnavailable, nextUnitKey, onNextUnit, unit12, courseComplete, unit11, notice, stageLabel, result, failureMessage, unit2, unit3, unit4, unit5, unit6, unit7, unit8, unit9, unit10, stars, onFix, restoreFocus, onRetry, onClose, onNext, lastStage = false, bonusStage = false }: Props) {
  const dialog = useRef<HTMLDivElement>(null)
  const fixed = useRef(false)
  useEffect(() => {
    const previous = document.activeElement
    dialog.current?.focus()
    return () => {
      if (restoreFocus) restoreFocus(previous, fixed.current)
      else if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [restoreFocus])
  return <div className="modal-backdrop">
    <div ref={dialog} className="result-modal" role="dialog" aria-modal="true" aria-labelledby="result-title" tabIndex={-1} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); onClose() }
      if (event.key === 'Tab') {
        const buttons = dialog.current?.querySelectorAll('button')
        if (!buttons?.length) return
        const first = buttons[0], last = buttons[buttons.length - 1]
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
          event.preventDefault(); last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus()
        }
      }
    }}>
      <div className="result-symbol" aria-hidden="true">{result === 'success' ? Array.from({ length: stars }, (_, i) => <span key={i} className="earned-star"><Symbol name="goal" /></span>) : <Symbol name="hint" />}</div>
      {notice && <p role="status">{notice}</p>}
      {stageLabel && <p>{stageLabel}</p>}
      <h2 id="result-title">{result === 'success' ? t('success') : (failureMessage ?? t(`failures.${result}`))}</h2>
      {result === 'success' && storageUnavailable && <p>{t('saveNotice.result')}</p>}
      {result === 'success' && unit12 && <p>{t('synthesis.reflect')}</p>}
      {result === 'success' && courseComplete && <CourseCompletion />}
      {result === 'success' && unit11 && <p>{t('search.reflect')}</p>}
      {result === 'success' && <p aria-label={t('stars', { count: stars })}>{t('stars', { count: stars })}</p>}
      {result === 'success' && lastStage && <p>{t(unit12 ? 'unit12Congratulations' : unit11 ? 'unit11Congratulations' : unit10 ? 'unit10Congratulations' : unit9 ? 'unit9Congratulations' : unit8 ? 'unit8Congratulations' : unit7 ? 'unit7Congratulations' : unit6 ? 'unit6Congratulations' : unit5 ? 'unit5Congratulations' : unit4 ? 'unit4Congratulations' : unit3 ? 'unit3Congratulations' : unit2 ? 'unit2Congratulations' : bonusStage ? 'bonusCongratulations' : 'congratulations')}</p>}
      {result === 'success' && nextUnitKey && <p>{t('nextUnitOpened', { unit: t(nextUnitKey) })}</p>}
      {onReview && <button type="button" className="review-toggle" aria-pressed={reviewSelected ?? false} onClick={onReview}>{t('learning.review')}</button>}
      <div className="playback-controls">
        {result === 'success' && nextUnitKey && onNextUnit && <button type="button" onClick={onNextUnit}><span className="control-symbol" aria-hidden="true"><Symbol name="nextStage" /></span><small>{t('nextUnit')}</small></button>}
        {result !== 'success' && onFix && <button className="fix-button" type="button" onClick={() => { fixed.current = true; onFix() }} aria-label={t('fix')}><span className="control-symbol" aria-hidden="true"><Symbol name="fix" /></span><small>{t('fix')}</small></button>}
        {result === 'success' && onNext && <button type="button" onClick={onNext} aria-label={lastStage ? theme.buttonLabel('toList') : theme.buttonLabel('nextStage')} title={lastStage ? theme.buttonLabel('toList') : theme.buttonLabel('nextStage')}><span className="control-symbol" aria-hidden="true"><Symbol name={lastStage ? "stageList" : "nextStage"} /></span><small>{lastStage ? theme.buttonLabel('toList') : theme.buttonLabel('nextStage')}</small></button>}
        <button type="button" onClick={onRetry} aria-label={theme.buttonLabel('retry')} title={theme.buttonLabel('retry')}><span className="control-symbol" aria-hidden="true"><Symbol name="reset" /></span><small>{theme.buttonLabel('retry')}</small></button>
        <button type="button" onClick={onClose} aria-label={theme.buttonLabel('close')} title={theme.buttonLabel('close')}><span className="control-symbol" aria-hidden="true"><Symbol name="close" /></span><small>{theme.buttonLabel('close')}</small></button>
      </div>
    </div>
  </div>
}
