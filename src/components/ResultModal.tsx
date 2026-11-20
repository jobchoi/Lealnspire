import { useEffect, useRef } from 'react'
import type { RunResult } from '../engine/types'
import { ko } from '../i18n/ko'

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
      <h2 id="result-title">{result === 'success' ? ko.success : ko.failures[result]}</h2>
      {result === 'success' && <p aria-label={ko.stars(stars)}>{ko.stars(stars)}</p>}
      {result === 'success' && lastStage && <p>{ko.congratulations}</p>}
      <div className="playback-controls">
        {result === 'success' && onNext && <button type="button" onClick={onNext} aria-label={lastStage ? ko.toList : ko.nextStage} title={lastStage ? ko.toList : ko.nextStage}><span className="control-symbol" aria-hidden="true">{lastStage ? ko.icons.toList : ko.icons.nextStage}</span><small>{lastStage ? ko.toList : ko.nextStage}</small></button>}
        <button type="button" onClick={onRetry} aria-label={ko.retry} title={ko.retry}><span className="control-symbol" aria-hidden="true">{ko.icons.retry}</span><small>{ko.retry}</small></button>
        <button type="button" onClick={onClose} aria-label={ko.close} title={ko.close}><span className="control-symbol" aria-hidden="true">{ko.icons.close}</span><small>{ko.close}</small></button>
      </div>
    </div>
  </div>
}
