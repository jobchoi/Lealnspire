import { useEffect, useRef, useState } from 'react'
import { worlds } from '../theme/themes'
import { ConceptDefs, WorldScene, Symbol } from '../theme/Symbols'
import type { Progress } from '../../model/ProgressRepository'
import { t, i18n, languageControl, type Locale } from '../../i18n/I18n'
import { continueStageIndex, courseCompleted } from '../../controller/flow'

type Props = { onResetDemos?: () => void; locale?: Locale; onLanguageChange?: () => void; progress: Progress; onStart: () => void; onContinue: (index: number) => void; onList: () => void; persistent?: boolean; onClear?: () => boolean }
export function HomePage({ progress, onStart, onContinue, onList, persistent = false, onClear, locale = 'ko', onLanguageChange, onResetDemos }: Props) {
  const [resetDemo, setResetDemo] = useState(false)
  const [info, setInfo] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [clearFailed, setClearFailed] = useState(false)
  const [notice, setNotice] = useState<string>()
  const next = continueStageIndex(progress)
  return <section className="home-page"><ConceptDefs />
    <div className="home-tools">
    <button className="privacy-info-button" type="button" aria-label={t('privacy.title')} onClick={() => { setConfirm(false); setNotice(undefined); setInfo(true) }}><span aria-hidden="true">ⓘ</span></button>
    <button className="language-button" lang="ko" type="button" aria-label={languageControl.label} onClick={onLanguageChange}>
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18M5 7h14M5 17h14" /></svg>
      <span lang={locale === 'ko' ? 'en' : 'ko'}>{languageControl.names[locale === 'ko' ? 'en' : 'ko']}</span>
    </button>
    </div>
    {onResetDemos && <button type="button" onClick={() => setResetDemo(true)}>{t('demo.reset')}</button>}
    {resetDemo && <RecordDialog demoReset confirm onClose={() => setResetDemo(false)} onConfirm={() => {}} onCancel={() => setResetDemo(false)} onClear={() => { onResetDemos?.(); setResetDemo(false) }} />}
    {info && <RecordDialog clearFailed={clearFailed} confirm={confirm} notice={clearFailed ? t('privacy.clearFailed') : notice ?? (!persistent ? t('privacy.unavailable') : undefined)} onClose={() => setInfo(false)} onConfirm={() => setConfirm(true)} onCancel={() => setConfirm(false)} onClear={() => {
      const cleared = onClear?.() ?? false
      setConfirm(false)
      setClearFailed(!cleared)
      setNotice(t(!persistent ? 'privacy.unavailable' : cleared ? 'privacy.cleared' : 'privacy.clearFailed'))
    }} />}
    <h1 tabIndex={-1} data-page-title>{t('title')}</h1>
    <p>{t('introduction')}</p>
    <p>{t('themes.introduction')}</p>
    {courseCompleted(progress) && <div className="home-completion" role="status"><span aria-hidden="true">{worlds.map(world => <Symbol key={world} name={world} />)}</span><strong>{t('synthesis.homeComplete')}</strong></div>}
    <div className="world-gallery">{worlds.map(world => <article key={world} className={`world-preview world-${world}`}><WorldScene world={world} /><h2>{t(`themes.${world}.name`)}</h2><p>{t(`themes.${world}.description`)}</p></article>)}</div>
    <div className="playback-controls">
      <button type="button" onClick={onStart}>{t('start')}</button>
      {next !== undefined && <button type="button" onClick={() => onContinue(next)}>{t('continue')}</button>}
      <button type="button" onClick={onList}>{t('stageList')}</button>
    </div>
  </section>
}


type DialogProps = { demoReset?: boolean; clearFailed?: boolean; confirm: boolean; notice?: string; onClose: () => void; onConfirm: () => void; onCancel: () => void; onClear: () => void }
export function RecordDialog({ demoReset, clearFailed, confirm, notice, onClose, onConfirm, onCancel, onClear }: DialogProps) {
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
      const buttons = dialog.current?.querySelectorAll<HTMLElement>('button, a[href]')
      if (!buttons?.length) return
      const first = buttons[0], last = buttons[buttons.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus()
      }
    }
  }}>
    <h2 id="privacy-title">{t(demoReset ? 'demo.reset' : 'privacy.title')}</h2>
    {confirm ? <>
      <p>{t(demoReset ? 'demo.confirm' : 'privacy.confirm')}</p>
      <div className="playback-controls">
        <button type="button" onClick={onClear}>{t(demoReset ? 'demo.reset' : 'privacy.erase')}</button>
        <button ref={cancel} type="button" onClick={onCancel}>{t('privacy.cancel')}</button>
      </div>
    </> : <>
      <p>{t('privacy.location')}</p>
      <p>{t('privacy.records')}</p>
      <p>{t('privacy.browser')}</p>
      <a className="teacher-guide-link" href={`${import.meta.env.BASE_URL}${i18n.locale === 'en' ? 'guide-en.html' : 'guide.html'}`}>{t('privacy.guide')}</a>
      {notice && <p role="status">{notice}</p>}
      <div className="playback-controls">
        <button ref={erase} type="button" onClick={clearFailed ? onClear : onConfirm}>{t(clearFailed ? 'privacy.tryAgain' : 'privacy.clear')}</button>
        <button type="button" onClick={onClose}>{t('close')}</button>
      </div>
    </>}
  </div></div>
}
