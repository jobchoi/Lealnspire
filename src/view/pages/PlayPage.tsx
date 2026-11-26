import { courseCompleted } from '../../controller/flow'
import { Fragment } from 'react'
import glossary from '../../i18n/glossary.json'
import { selectTheme, worlds } from '../theme/themes'
import { ConceptDefs, Symbol } from '../theme/Symbols'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { FunctionProgram } from '../../model/program'
import type { Stage } from '../../model/types'
import { bonusStages } from '../../model/stages'
import { Editor } from '../components/Editor'
import { t } from '../../i18n/I18n'
import { Board } from '../components/Board'
import { GameController } from '../../controller/GameController'
import { useController } from '../hooks/useController'
import { playbackSpeeds } from '../../controller/playback'
import { ResultModal } from '../components/ResultModal'
import { createProgressStore } from '../../model/ProgressRepository'

type Props = { stage: Stage; progressStore: ReturnType<typeof createProgressStore>; onList: () => void; onNext: () => void; lastStage: boolean; controller?: GameController }

export function PlayPage({ stage, progressStore, onList, onNext, lastStage, controller: supplied }: Props) {
  const page = useRef<HTMLElement>(null)
  const [controller] = useState(() => supplied ?? new GameController(stage, progressStore))
  const { doc, program, hintStep, playing, speed } = useController(controller)
  useEffect(() => () => controller.dispose(), [controller])
  const [requestedWorld, setWorld] = useState<Stage['world']>()
  const completed = !!progressStore.getProgress().stages[stage.id]?.completed
  const theme = selectTheme(stage.world, completed, requestedWorld)
  const displayStage = controller.displayStage
  const logicEnabled = stage.id.startsWith('u6-')
  const search = stage.search
  const searchFrame = controller.frame?.search
  const symbolText = (text: string) => text.split('🎯').map((part, index) => <Fragment key={index}>{index > 0 && <span className="search-target-inline" role="img" aria-label={t('search.target', { value: search?.target ?? 7 })}><Symbol name="target" /></span>}{part}</Fragment>)
  const listsEnabled = !!stage.lists
  const list = stage.lists?.[controller.variant]
  const listFrame = controller.frame?.list
  const eventsEnabled = stage.events === true
  const events = controller.frame?.events
  const signals = stage.signals?.[controller.variant] ?? []
  const signalName = (signal: string) => t(`events.${({ '◇': 'diamond', '○': 'circle', '△': 'triangle' } as Record<string, string>)[signal]}`)
  const signalIcons = (items: string[]) => items.length ? items.map((signal, index) => <span key={index} role="img" aria-label={signalName(signal)}><Symbol name={({ '◇': 'diamond', '○': 'circle', '△': 'triangle' } as Record<string, string>)[signal]} /></span>) : <span>{t('events.empty')}</span>
  const returnsEnabled = stage.returns === true
  const paramsEnabled = stage.params === true
  const variablesEnabled = listsEnabled || stage.id.startsWith('u5-') || paramsEnabled
  const variableValue = controller.frame?.variables?.A ?? stage.variantVariables?.[controller.variant]?.A ?? 0
  const calledFunction = doc.functions.find(fn => fn.id === controller.frame?.call?.fn)
  const returnIcon = doc.functions.find(fn => fn.id === controller.returned?.fn)?.icon
  const variableChange = controller.frame?.variableChange?.to === variableValue ? controller.frame.variableChange : undefined
  const check = controller.frame?.check
  const playback = { frame: controller.frame, result: controller.result, locked: controller.locked, finished: controller.finished, showResult: controller.showResult, playing, speed, play: controller.play, step: controller.step, reset: controller.reset, dismiss: controller.dismiss, setSpeed: controller.setSpeed }
  const restoreFocus = useCallback((previous: Element | null, fixed: boolean) => {
    const root = page.current
    if (!root?.isConnected) return
    const available = (element: Element | null): element is HTMLElement => element instanceof HTMLElement && element.isConnected && (element.tabIndex >= 0 || element.hasAttribute('tabindex')) && !element.matches(':disabled, [aria-disabled="true"]') && element.getClientRects().length > 0
    const tile = fixed ? Array.from(root.querySelectorAll<HTMLButtonElement>('[data-block-id]')).find(node => node.dataset.blockId === controller.failure?.blockId) ?? null : null
    const target = fixed ? tile : previous
    if (available(target)) target.focus()
    if (!available(target) || document.activeElement !== target) root.querySelector<HTMLButtonElement>('.run-button')?.focus()
  }, [controller])
  const variantCards = stage.variants && <div className="variant-cards" role="group" aria-label={t(stage.id.startsWith('u12-') ? 'unit12' : search ? 'unit11' : listsEnabled ? 'unit10' : eventsEnabled ? 'unit9' : returnsEnabled ? 'unit8' : paramsEnabled ? 'unit7' : logicEnabled ? 'unit6' : variablesEnabled ? 'unit5' : stage.id.startsWith('u4-') ? 'unit4' : stage.id.startsWith('u3-') ? 'unit3' : 'unit2')}>{stage.variants.map((grid, index) => <button type="button" key={index} disabled={!!controller.getSnapshot().execution} aria-pressed={controller.variant === index} aria-label={t('variantLabel', { number: index + 1, total: stage.variants!.length }) + (eventsEnabled ? `, ${(stage.signals?.[index] ?? []).map(signalName).join(', ')}` : '') + (variablesEnabled && !search ? `, A = ${stage.variantVariables?.[index]?.A ?? 0}` : '')} onClick={() => controller.selectVariant(index)}><svg viewBox={`0 0 ${grid[0].length * 10} ${grid.length * 10}`} aria-hidden="true">{grid.flatMap((row, y) => [...row].map((cell, x) => <rect key={`${x},${y}`} x={x * 10 + 1} y={y * 10 + 1} width="8" height="8" fill={cell === '#' ? '#4b5563' : cell === 'G' ? '#986000' : cell === 'S' ? '#2563eb' : '#fff'} stroke="currentColor" />))}</svg><span>{variablesEnabled && !search ? <>{t('variables.map', { number: index + 1, total: stage.variants!.length })} · A={stage.variantVariables?.[index]?.A ?? 0}</> : <>{index + 1}/{stage.variants!.length}</>} {eventsEnabled && <span className="scenario-signals">{signalIcons(stage.signals?.[index] ?? [])}</span>} {controller.variantResults?.[index] ? controller.variantResults[index] === 'success' ? '✓' : '!' : ''}</span></button>)}</div>
  const variableBox = variablesEnabled && <div className="variable-box" role="status" aria-label={t('variables.status', { value: variableValue })}><span aria-hidden="true"><Symbol name="set" /> A <strong>{variableValue}</strong><span className="variable-transition">{variableChange && `${variableChange.from} → ${variableChange.to}`}</span></span><span className="sr-only">{variableChange ? t('variables.changed', variableChange) : t('variables.status', { value: variableValue })}</span></div>
  return (
    <section ref={page} className={`play-page theme-${theme.world}${stage.id === 'u12-1' ? ' synthesis-path-page' : ''}${stage.variants ? ' conditions-page' : ''}${stage.id.startsWith('u3-') || stage.id === 'u12-1' ? ' while-page' : ''}${stage.id.startsWith('u4-') || paramsEnabled ? ' functions-page' : ''}${variablesEnabled || logicEnabled ? ' variables-page' : ''}${logicEnabled ? ' logic-page' : ''}${paramsEnabled ? ' params-page' : ''}${returnsEnabled ? ' returns-page' : ''}${eventsEnabled ? ' events-page' : ''}${listsEnabled ? ' lists-page' : ''}${search ? ' search-page' : ''}`}>
      <ConceptDefs /><h1 tabIndex={-1} data-page-title>{stage.variants || bonusStages.some(bonus => bonus.id === stage.id) ? '' : `${t('stage')} ${stage.id}: `}{t(stage.title)}</h1>
      <div className="playback-controls stage-controls">
        <button type="button" onClick={onList} aria-label={theme.buttonLabel('stageList')} title={theme.buttonLabel('stageList')}><span className="control-symbol" aria-hidden="true"><Symbol world={theme.world} name="stageList" /></span><small>{theme.buttonLabel('stageList')}</small></button>
        <button type="button" aria-expanded={hintStep > 0} aria-controls="stage-hint" onClick={controller.toggleHint} aria-label={theme.buttonLabel('hint')} title={theme.buttonLabel('hint')}><span className="control-symbol" aria-hidden="true"><Symbol world={theme.world} name="hint" /></span><small>{theme.buttonLabel('hint')}</small></button>
        {(controller.canNext && !lastStage) && <button type="button" aria-label={theme.buttonLabel('nextStage')} title={theme.buttonLabel('nextStage')} onClick={onNext}><span className="control-symbol" aria-hidden="true"><Symbol world={theme.world} name="nextStage" /></span><small>{theme.buttonLabel('nextStage')}</small></button>}
      </div>
      {completed && <div className="world-switch" role="group" aria-label={t('themes.choose')}>{worlds.map(world => <button key={world} type="button" aria-label={t(`themes.${world}.switch`)} aria-pressed={theme.world === world} onClick={() => setWorld(world)}><Symbol world={theme.world} name={world} /></button>)}</div>}
      {hintStep > 0 && <div id="stage-hint" className="stage-hint">
        <p role="status"><span>{t('hintStep', { step: hintStep })}</span> {symbolText(t(stage.hints.keys[hintStep - 1]))}</p>
        <div className="hint-actions">{hintStep === 1 && <button type="button" aria-label={t('nextHint')} onClick={controller.nextHint}>{t('nextHint')}</button>}
        <button type="button" aria-label={t('closeHint')} onClick={controller.toggleHint}><span aria-hidden="true">×</span></button></div>
      </div>}
      {hintStep === 0 && !variablesEnabled && <p className="stage-goal"><span className="goal-symbol" aria-hidden="true"><Symbol world={theme.world} name="goal" /></span> {symbolText(t(stage.goal))}</p>}
      {variablesEnabled && <div className="variable-summary">
        {hintStep === 0 && <p className="stage-goal" tabIndex={0}>{symbolText(t(stage.goal))}</p>}
        {variantCards}{!search && variableBox}
        {list && <div className="list-state" role="group" aria-label={t('blocks.forEach')}>
          <strong className="concept-keyword">{glossary.list.keyword}</strong><span className="list-length">{t('lists.length', { length: list.length })}</span>
          {search && <><span className="search-target" aria-label={t('search.target', { value: search.target })}><Symbol name="target" /> = {search.target}</span><strong className="search-count" role="status" aria-live="polite">{t('search.count', { count: searchFrame?.count ?? 0, limit: search.maxComparisons })}</strong></>}
          <ol className="list-cells">{list.map((value, index) => <li key={index} className={`${search && searchFrame?.comparison?.index === index && controller.frame?.event === 'check' ? 'search-comparing' : ''} ${searchFrame?.stopped?.remaining.includes(index) && !searchFrame.checked.includes(index) ? 'search-unseen' : ''} ${listFrame?.current?.index === index ? 'list-current' : ''} ${!listFrame?.read?.error && listFrame?.read?.source === 'listAtA' && listFrame.read.index === index ? 'list-access' : ''}`}>
            <small>{t('lists.index', { index })}</small><b>{t('lists.value', { value })}</b>{searchFrame?.checked.includes(index) && <span className="search-mark" role="img" aria-label={value === search?.target ? t('search.found', { index }) : t('search.mismatch', { index })}><Symbol name={value === search?.target ? 'target' : 'no'} /></span>}
          </li>)}</ol>
          {search && <span className="search-summary" role="status">{searchFrame?.foundIndex !== undefined && <span>{t('search.found', { index: searchFrame.foundIndex })}</span>}{searchFrame?.stopped && searchFrame.stopped.remaining.some(index => !searchFrame.checked.includes(index)) && <span>{t('search.unseen')}</span>}</span>}
          <span className="list-pointers" role="status">{listFrame?.current && <span>{t('lists.eachPointer', listFrame.current)}</span>}{listFrame?.read?.source === 'listAtA' && !listFrame.read.error && <span>{t('lists.atPointer', { index: listFrame.read.index!, value: listFrame.read.value! })}</span>}{listFrame?.read?.error && <strong aria-label={t('lists.range', { index: listFrame.read.index!, length: listFrame.read.length })}>{t('lists.rangeShort', { index: listFrame.read.index!, length: listFrame.read.length })}</strong>}</span>
        </div>}
        {returnsEnabled && controller.returned && <span className="return-transfer" role="status"><span aria-hidden="true">{controller.returned.arg !== undefined ? `◆${controller.returned.arg} → ` : ''}</span>{returnIcon && <Symbol name={returnIcon} />}<span aria-hidden="true"> → ↩{controller.returned.value}{controller.returned.repeatId ? ` → ${glossary.repeat.keyword} ×${controller.returned.value}` : ''}</span><span className="sr-only">{t(`returns.received.${returnIcon}`, { value: controller.returned.value })}</span></span>}
        {paramsEnabled && calledFunction && <span className="parameter-status sr-only" role="status" key={`${controller.variant}:${playback.frame?.call?.serial ?? 0}`}>{playback.frame?.call?.arg !== undefined && t(`parameters.passed.${calledFunction.icon}`, { value: playback.frame.call.arg, a: variableValue })}</span>}
      </div>}
      {logicEnabled && check?.atoms && <div role="status" className="logic-results">{check.atoms.map((item, index) => <Fragment key={index}>{index > 0 && typeof check.condition !== 'string' && (check.condition.kind === 'and' || check.condition.kind === 'or') && <b className="logic-operator">{glossary[check.condition.kind].keyword}</b>}<span className={item.value ? 'logic-true' : 'logic-false'}>{t(`logic.${item.atom}`)}: {item.value ? '✓' : '✕'} {t(item.value ? 'logic.true' : 'logic.false')}{item.path.includes('operand') && <> → {glossary.not.keyword}: {item.result ? '✓' : '✕'} {t(item.result ? 'logic.true' : 'logic.false')}</>}</span></Fragment>)} <strong className={check.result ? 'logic-true' : 'logic-false'}>{t('logic.result')}: {check.result ? '✓' : '✕'} {t(check.result ? 'logic.true' : 'logic.false')}</strong></div>}
      <div className="game-layout">
        <div className="map-panel" style={{ '--min-board-width': `${stage.grid[0].length * 40 + (stage.grid[0].length - 1) * 4 + 8}px`, '--compact-board-width': `${stage.grid[0].length * 56 + (stage.grid[0].length - 1) * 4 + 8}px`, '--board-ratio': stage.grid[0].length / stage.grid.length, '--mobile-board-width': `calc((22dvh - 8px) * ${stage.grid[0].length} / ${stage.grid.length})` } as CSSProperties}>
          {theme.world === 'handheld' && <div className="lcd-hud" aria-hidden="true"><span>{stage.variants ? stage.id.toUpperCase() : `STAGE ${stage.id}`}</span><span><Symbol name="goal" /></span><span>{new FunctionProgram(doc).count()}/{stage.maxBlocks ?? 10}</span></div>}
          {returnsEnabled && playback.frame?.sensorAhead !== undefined && <p className="ahead-observation" role="status">▤ {t('returns.ahead')}: {playback.frame.sensorAhead}</p>}
          {!variablesEnabled && variantCards}
          <div className="sensor-board-panel">
            {stage.variants && !eventsEnabled && !variablesEnabled && !logicEnabled && <p className="sensor-status" role="status">{check && <><Symbol name={check.result ? 'yes' : 'no'} />{t(check.condition === 'clearAhead' ? check.result ? 'whileContinue' : 'whileStop' : check.result ? 'sensorBlocked' : 'sensorClear')}</>}</p>}

            {eventsEnabled && <div className="event-state">
              <div className="event-pipeline"><div aria-label={t('events.upcoming')}><small>{t('events.upcoming')}</small><span>{signalIcons(signals.slice(events?.cursor ?? 0))}</span></div><b aria-hidden="true">→</b><div aria-label={t('events.queue')}><small>{t('events.queue')}</small><span>{signalIcons(events?.queue ?? [])}</span></div><b aria-hidden="true">→</b><div aria-label={t('events.running')}><small>{t('events.running')}</small><span>{signalIcons(events?.handler ? [events.handler.signal] : [])}</span></div></div>
              <p role="status" tabIndex={0}>{events?.phase === 'unconnected' ? t('events.unconnected') : events?.phase === 'arrival' ? t('events.arrival', { signal: signalName(events.signal!) }) : events?.phase === 'end' ? t('events.end') : events?.handler ? t('events.running') : t('events.idle')}</p>
            </div>}
            <Board events={events} check={search ? undefined : check} hintHighlight={hintStep > 0 ? stage.hints.highlight : undefined} failurePosition={controller.visibleFailure?.position} theme={theme} stage={displayStage} position={playback.frame?.pos} direction={playback.frame?.dir} bump={playback.frame?.event === 'bump'} />
          </div>
          <div className="playback-controls execution-controls">
            <button className="run-button" type="button" disabled={!program.length && !doc.functions.length || playback.playing} onClick={playback.play} aria-label={theme.buttonLabel('run')} title={theme.buttonLabel('run')}><span className="control-symbol" aria-hidden="true"><Symbol world={theme.world} name="run" /></span><small>{theme.runText?.()}</small></button>
            <button type="button" disabled={!program.length && !doc.functions.length || playback.playing || playback.finished} onClick={playback.step} aria-label={theme.buttonLabel('step')} title={theme.buttonLabel('step')}><span className="control-symbol" aria-hidden="true"><Symbol world={theme.world} name="step" /></span><small>{theme.buttonLabel('step')}</small></button>
            <button type="button" onClick={playback.reset} aria-label={theme.buttonLabel('reset')} title={theme.buttonLabel('reset')}><span className="control-symbol" aria-hidden="true"><Symbol world={theme.world} name="reset" /></span><small>{theme.buttonLabel('reset')}</small></button>

            {Object.keys(playbackSpeeds).map(key => {
              const speed = key as keyof typeof playbackSpeeds
              return <button type="button" key={speed} aria-pressed={playback.speed === speed} aria-label={t(`speeds.${speed}`)} title={t(`speeds.${speed}`)} onClick={() => playback.setSpeed(speed)}><span aria-hidden="true">{t(`speedIcons.${speed}`)}</span><small>{t(`speeds.${speed}`)}</small></button>
            })}
          </div>
        </div>
        <Editor searchEnabled={!!search} listsEnabled={listsEnabled} eventsEnabled={eventsEnabled} events={events} returnsEnabled={returnsEnabled} returned={controller.returned} paramsEnabled={paramsEnabled} logicEnabled={logicEnabled} variablesEnabled={variablesEnabled && !logicEnabled} functionsEnabled={stage.id.startsWith('u4-') || paramsEnabled} call={playback.frame?.call} palette={stage.palette} conditions={!!stage.variants} checks={controller.branchChecks} controller={controller.editor} failedBlockId={controller.visibleFailure?.blockId} theme={theme} program={program} onChange={controller.edit} maxBlocks={stage.maxBlocks} locked={playback.locked} activeBlockId={playback.frame?.activeBlockId} loops={playback.frame?.loops} />
      </div>
      {playback.showResult && playback.result && <ResultModal unit12={stage.id.startsWith('u12-')} courseComplete={courseCompleted(progressStore.getProgress())} unit11={!!search} unit10={listsEnabled} unit9={eventsEnabled} unit8={returnsEnabled} notice={playback.result === 'stepLimit' ? t('stepLimitNotice') : undefined} stageLabel={stage.variants ? t(stage.title) : undefined} unit7={paramsEnabled} unit6={logicEnabled} unit5={variablesEnabled && !logicEnabled} unit4={stage.id.startsWith('u4-')} unit3={stage.id.startsWith('u3-')} unit2={!!stage.variants} failureMessage={stage.variants && playback.result !== 'success' ? t('variantFailure', { number: (controller.getSnapshot().all?.failedVariant ?? 0) + 1, reason: playback.result === 'comparisonLimit' && search ? t('search.limit', { limit: search.maxComparisons }) : playback.result === 'indexRange' && listFrame?.read ? t('lists.range', { index: listFrame.read.index!, length: listFrame.read.length }) : t(controller.whileLimited ? 'whileStepLimit' : `failures.${playback.result}`) }) : controller.whileLimited ? t('whileStepLimit') : undefined} restoreFocus={restoreFocus} onFix={controller.fix} result={playback.result} stars={controller.stars} onRetry={playback.reset} onClose={playback.dismiss} onNext={onNext} lastStage={lastStage} bonusStage={bonusStages.some(bonus => bonus.id === stage.id)} />}
    </section>
  )
}

