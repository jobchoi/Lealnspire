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
      <h2 id="result-title">{result === 'success' ? ko.success : ko.failures[result]}</h2>
      {result === 'success' && <p aria-label={ko.stars(stars)}><span aria-hidden="true">{'★'.repeat(stars)}</span> {ko.stars(stars)}</p>}
      {result === 'success' && lastStage && <p>{ko.congratulations}</p>}
      <div className="playback-controls">
        {result === 'success' && onNext && <button type="button" onClick={onNext}>{lastStage ? ko.toList : ko.nextStage}</button>}
        <button type="button" onClick={onRetry}>{ko.retry}</button>
        <button type="button" onClick={onClose}>{ko.close}</button>
      </div>
    </div>
  </div>
}
