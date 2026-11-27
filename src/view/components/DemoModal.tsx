import { useEffect, useRef, useState } from 'react'
import { DemoController, type DemoId } from '../../controller/DemoController'
import { useController } from '../hooks/useController'
import { Board } from './Board'
import { BlockTiles } from './BlockTiles'
import type { Theme } from '../theme/defaultTheme'
import { Symbol } from '../theme/Symbols'
import glossary from '../../i18n/glossary.json'
import { i18n, t } from '../../i18n/I18n'
import './DemoModal.css'

export function DemoHand() { return <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 17V5a2 2 0 0 1 4 0v9-3a2 2 0 0 1 4 0v3-1a2 2 0 0 1 4 0v2a2 2 0 0 1 4 0v7c0 5-3 8-8 8-4 0-6-3-9-6l-5-6a2 2 0 0 1 3-3l3 3Z" /></svg> }
export function DemoModal({ theme, onClose, onSeen, demoId = 'add-run' }: { demoId?: DemoId; theme: Theme; onClose: () => void; onSeen: () => void }) {
  const [controller] = useState(() => new DemoController(onSeen, undefined, demoId))
  const scene = controller.scene
  const { cut, paused } = useController(controller)
  const altKey = `demo.scenes.${demoId}.alt${cut}`
  const alt = i18n.t(altKey)
  const [reduced, setReduced] = useState(false)
  const dialog = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement
    const root = dialog.current!
    const siblings: { element: HTMLElement; inert: boolean }[] = []
    let branch: HTMLElement = root.parentElement!
    while (branch.parentElement) {
      for (const element of branch.parentElement.children) if (element !== branch && element instanceof HTMLElement) { siblings.push({ element, inert: element.inert }); element.inert = true }
      branch = branch.parentElement
    }
    root.focus()
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => { setReduced(media.matches); controller.restart(media.matches) }
    change(); media.addEventListener('change', change)
    return () => {
      controller.dispose(); media.removeEventListener('change', change)
      siblings.forEach(({ element, inert }) => { element.inert = inert })
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [controller])
  return <div className="modal-backdrop demo-backdrop"><div className={`result-modal demo-modal theme-${theme.world}`} role="dialog" aria-modal="true" aria-labelledby="demo-title" ref={dialog} tabIndex={-1} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); onClose() }
    if (event.key === 'Tab') {
      const buttons = dialog.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
      const first = buttons[0], last = buttons[buttons.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus() }
    }
  }}>
    <h2 id="demo-title">{t('demo.title')}</h2>
    <div className="demo-scene" aria-hidden="true" inert>
      <Board stage={scene.stage} theme={theme} position={scene.frame.pos} direction={scene.frame.dir} check={scene.frame.check} events={scene.frame.events} />
      <div className={`demo-palette ${cut === 0 ? 'demo-pressed' : ''}`}><span className={`block-tile ${theme.blockClass(scene.palette)}`}>{theme.blockSymbol(scene.palette)}</span>{cut === 0 && <DemoHand />}</div>
      <div className="demo-workspace">{cut === 1 && scene.targetId && <span className="demo-target-cue"><DemoHand />→ {scene.targetElse ? glossary.else.keyword : '[ ]'}</span>}<BlockTiles theme={theme} program={controller.program} functions={scene.doc.functions} selectedId={scene.selectedId} targetId={scene.targetId} targetElse={scene.targetElse} activeBlockId={scene.run ? scene.frame.activeBlockId : null} check={scene.frame.check} loops={scene.frame.loops} call={scene.frame.call} returned={scene.frame.returned} locked onSelect={() => {}} />{scene.doc.functions.map(fn => <div className="demo-function" key={fn.id}><span>★{fn.param ? '(◆)' : '()'}</span><BlockTiles theme={theme} program={fn.body} functions={scene.doc.functions} selectedId={scene.selectedId} targetId={scene.targetId} activeBlockId={scene.run ? scene.frame.activeBlockId : null} returned={scene.frame.returned} loops={scene.frame.loops} locked onSelect={() => {}} /></div>)}</div>
      {scene.stage.lists && <ol className="demo-list">{scene.stage.lists[0].map((value, index) => <li key={index} className={`${scene.frame.list?.current?.index === index ? 'demo-pressed' : ''} ${scene.frame.search?.stopped?.remaining.includes(index) ? 'demo-unchecked' : ''}`}><small>{t('lists.index', { index })}</small><strong>{value}</strong><span>{scene.frame.search?.comparison?.index === index ? scene.frame.search.comparison.match ? '✓' : '✕' : scene.frame.search?.stopped?.remaining.includes(index) ? '?' : scene.frame.list?.current?.index === index ? '▣' : ''}</span></li>)}</ol>}
      {scene.cue && <strong className="demo-cue">{scene.cue}</strong>}
      <div className={`demo-run ${cut === 2 ? 'demo-pressed' : ''}`}><Symbol name="run" />{cut === 2 && <DemoHand />}</div>
    </div>
    <p role="status" aria-live="polite" aria-atomic="true">{t(demoId === 'add-run' ? `demo.cut${cut}` : `demo.scenes.${demoId}.${cut}`)}{alt !== altKey && <span className="demo-scene-alt"> {alt}</span>}</p>
    <span aria-hidden="true">{cut + 1} / 4</span>
    <div className="demo-controls">
      <button disabled={cut === 0} onClick={controller.back}>{t('demo.back')}</button><button disabled={cut === 3} onClick={controller.next}>{t('demo.next')}</button>
      {!reduced && <button disabled={cut === 3} onClick={controller.pause}>{t(paused ? 'demo.resume' : 'demo.pause')}</button>}
      <button onClick={() => controller.restart(reduced)}>{t('demo.again')}</button>
      <button onClick={() => { onSeen(); onClose() }}>{t('demo.skip')}</button>
      <button onClick={onClose}>{t('close')}</button>
    </div>
  </div></div>
}
