import { useEffect, useRef, useState } from 'react'
import { worlds } from '../theme/themes'
import { ConceptDefs, WorldScene } from '../theme/Symbols'
import type { Progress } from '../../model/ProgressRepository'
import { t } from '../../i18n/I18n'
import { continueStageIndex } from '../../controller/flow'

type Props = { progress: Progress; onStart: () => void; onContinue: (index: number) => void; onList: () => void; persistent?: boolean; onClear?: () => boolean }
export function HomePage({ progress, onStart, onContinue, onList, persistent = false, onClear }: Props) {
  const [info, setInfo] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [notice, setNotice] = useState<string>()
  const next = continueStageIndex(progress)
  return <section className="home-page"><ConceptDefs />
    <button className="privacy-info-button" type="button" aria-label={t('privacy.title')} onClick={() => { setConfirm(false); setNotice(undefined); setInfo(true) }}><span aria-hidden="true">ⓘ</span></button>
    {info && <RecordDialog confirm={confirm} notice={notice ?? (!persistent ? t('privacy.unavailable') : undefined)} onClose={() => setInfo(false)} onConfirm={() => setConfirm(true)} onCancel={() => setConfirm(false)} onClear={() => {
      const cleared = onClear?.() ?? false
      setConfirm(false)
      setNotice(t(cleared ? 'privacy.cleared' : 'privacy.unavailable'))
    }} />}
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


type DialogProps = { confirm: boolean; notice?: string; onClose: () => void; onConfirm: () => void; onCancel: () => void; onClear: () => void }
export function RecordDialog({ confirm, notice, onClose, onConfirm, onCancel, onClear }: DialogProps) {
  const dialog = useRef<HTMLDivElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const erase = useRef<HTMLButtonElement>(null)
  const previousConfirm = useRef(confirm)
  useEffect(() => {
    const previous = document.activeElement
    dialog.current?.focus()
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus() }
  }, [])
  useEffect(() => {
    if (confirm) cancel.current?.focus()
    else if (previousConfirm.current) erase.current?.focus()
    previousConfirm.current = confirm
  }, [confirm])
  return <div className="modal-backdrop"><div ref={dialog} className="result-modal privacy-modal" role="dialog" aria-modal="true" aria-labelledby="privacy-title" tabIndex={-1} onKeyDown={event => {
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
    <h2 id="privacy-title">{t('privacy.title')}</h2>
    {confirm ? <>
      <p>{t('privacy.confirm')}</p>
      <div className="playback-controls">
        <button type="button" onClick={onClear}>{t('privacy.erase')}</button>
        <button ref={cancel} type="button" onClick={onCancel}>{t('privacy.cancel')}</button>
      </div>
    </> : <>
      <p>{t('privacy.location')}</p>
      <p>{t('privacy.records')}</p>
      <p>{t('privacy.browser')}</p>
      {notice && <p role="status">{notice}</p>}
      <div className="playback-controls">
        <button ref={erase} type="button" onClick={onConfirm}>{t('privacy.clear')}</button>
        <button type="button" onClick={onClose}>{t('close')}</button>
      </div>
    </>}
  </div></div>
}
