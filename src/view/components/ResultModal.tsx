import { defaultTheme as theme } from '../theme/defaultTheme'
import { useEffect, useRef } from 'react'
import type { RunResult } from '../../model/types'
import { t } from '../../i18n/I18n'

type Props = { result: RunResult['result']; stars: number; onRetry: () => void; onClose: () => void; onNext?: () => void; lastStage?: boolean }
export function ResultModal({ result, stars, onRetry, onClose, onNext, lastStage = false }: Props) {
  const dialog = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement
    dialog.current?.focus()
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus() }
  }, [])
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
      <div className="result-symbol" aria-hidden="true">{result === 'success' ? '★'.repeat(stars) : result === 'collision' ? '💥' : '🤔'}</div>
      <h2 id="result-title">{result === 'success' ? t('success') : t(`failures.${result}`)}</h2>
      {result === 'success' && <p aria-label={t('stars', { count: stars })}>{t('stars', { count: stars })}</p>}
      {result === 'success' && lastStage && <p>{t('congratulations')}</p>}
      <div className="playback-controls">
        {result === 'success' && onNext && <button type="button" onClick={onNext} aria-label={lastStage ? theme.buttonLabel('toList') : theme.buttonLabel('nextStage')} title={lastStage ? theme.buttonLabel('toList') : theme.buttonLabel('nextStage')}><span className="control-symbol" aria-hidden="true">{lastStage ? t('icons.toList') : t('icons.nextStage')}</span><small>{lastStage ? theme.buttonLabel('toList') : theme.buttonLabel('nextStage')}</small></button>}
        <button type="button" onClick={onRetry} aria-label={theme.buttonLabel('retry')} title={theme.buttonLabel('retry')}><span className="control-symbol" aria-hidden="true">{t('icons.retry')}</span><small>{theme.buttonLabel('retry')}</small></button>
        <button type="button" onClick={onClose} aria-label={theme.buttonLabel('close')} title={theme.buttonLabel('close')}><span className="control-symbol" aria-hidden="true">{t('icons.close')}</span><small>{theme.buttonLabel('close')}</small></button>
      </div>
    </div>
  </div>
}
