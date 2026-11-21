import { selectTheme, worlds } from '../theme/themes'
import { ConceptDefs, Symbol } from '../theme/Symbols'
import { useEffect, useState, type CSSProperties } from 'react'
import { countBlocks } from '../../model/program'
import type { Stage } from '../../model/types'
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
  const [controller] = useState(() => supplied ?? new GameController(stage, progressStore))
  const { program, showHint, playing, speed } = useController(controller)
  useEffect(() => () => controller.dispose(), [controller])
  const [requestedWorld, setWorld] = useState<Stage['world']>()
  const completed = !!progressStore.getProgress().stages[stage.id]?.completed
  const theme = selectTheme(stage.world, completed, requestedWorld)
  const playback = { frame: controller.frame, result: controller.result, locked: controller.locked, finished: controller.finished, showResult: controller.showResult, playing, speed, play: controller.play, step: controller.step, reset: controller.reset, dismiss: controller.dismiss, setSpeed: controller.setSpeed }
  return (
    <section className={`play-page theme-${theme.world}`}>
      <ConceptDefs /><h1 tabIndex={-1} data-page-title>{t('stage')} {stage.id}: {t(stage.title)}</h1>
      <div className="playback-controls stage-controls">
        <button type="button" onClick={onList} aria-label={theme.buttonLabel('stageList')} title={theme.buttonLabel('stageList')}><span className="control-symbol" aria-hidden="true"><Symbol world={theme.world} name="stageList" /></span><small>{theme.buttonLabel('stageList')}</small></button>
        <button type="button" aria-expanded={showHint} aria-controls="stage-hint" onClick={controller.toggleHint} aria-label={theme.buttonLabel('hint')} title={theme.buttonLabel('hint')}><span className="control-symbol" aria-hidden="true"><Symbol world={theme.world} name="hint" /></span><small>{theme.buttonLabel('hint')}</small></button>
        {(controller.canNext && !lastStage) && <button type="button" aria-label={theme.buttonLabel('nextStage')} title={theme.buttonLabel('nextStage')} onClick={onNext}><span className="control-symbol" aria-hidden="true"><Symbol world={theme.world} name="nextStage" /></span><small>{theme.buttonLabel('nextStage')}</small></button>}
      </div>
      {completed && <div className="world-switch" role="group" aria-label={t('themes.choose')}>{worlds.map(world => <button key={world} type="button" aria-label={t(`themes.${world}.switch`)} aria-pressed={theme.world === world} onClick={() => setWorld(world)}><Symbol world={theme.world} name={world} /></button>)}</div>}
      {showHint && <p id="stage-hint" className="stage-hint">{t(stage.hint)}</p>}
      <p className="stage-goal"><span className="goal-symbol" aria-hidden="true"><Symbol world={theme.world} name="goal" /></span> {t(stage.goal)}</p>
      <div className="game-layout">
        <div className="map-panel" style={{ '--min-board-width': `${stage.grid[0].length * 40 + (stage.grid[0].length - 1) * 4 + 8}px`, '--compact-board-width': `${stage.grid[0].length * 56 + (stage.grid[0].length - 1) * 4 + 8}px`, '--board-ratio': stage.grid[0].length / stage.grid.length, '--mobile-board-width': `calc((22dvh - 8px) * ${stage.grid[0].length} / ${stage.grid.length})` } as CSSProperties}>
          {theme.world === 'handheld' && <div className="lcd-hud" aria-hidden="true"><span>STAGE {stage.id}</span><span><Symbol name="goal" /></span><span>{countBlocks(program)}/{stage.maxBlocks ?? 10}</span></div>}
          <Board failurePosition={controller.failure?.position} theme={theme} stage={stage} position={playback.frame?.pos} direction={playback.frame?.dir} bump={playback.frame?.event === 'bump'} />
          <div className="playback-controls execution-controls">
            <button className="run-button" type="button" disabled={!program.length || playback.playing} onClick={playback.play} aria-label={theme.buttonLabel('run')} title={theme.buttonLabel('run')}><span className="control-symbol" aria-hidden="true"><Symbol world={theme.world} name="run" /></span><small>{theme.runText?.()}</small></button>
            <button type="button" disabled={!program.length || playback.playing || playback.finished} onClick={playback.step} aria-label={theme.buttonLabel('step')} title={theme.buttonLabel('step')}><span className="control-symbol" aria-hidden="true"><Symbol world={theme.world} name="step" /></span><small>{theme.buttonLabel('step')}</small></button>
            <button type="button" onClick={playback.reset} aria-label={theme.buttonLabel('reset')} title={theme.buttonLabel('reset')}><span className="control-symbol" aria-hidden="true"><Symbol world={theme.world} name="reset" /></span><small>{theme.buttonLabel('reset')}</small></button>

            {Object.keys(playbackSpeeds).map(key => {
              const speed = key as keyof typeof playbackSpeeds
              return <button type="button" key={speed} aria-pressed={playback.speed === speed} aria-label={t(`speeds.${speed}`)} title={t(`speeds.${speed}`)} onClick={() => playback.setSpeed(speed)}><span aria-hidden="true">{t(`speedIcons.${speed}`)}</span><small>{t(`speeds.${speed}`)}</small></button>
            })}
          </div>
        </div>
        <Editor controller={controller.editor} failedBlockId={controller.failure?.blockId} theme={theme} program={program} onChange={controller.edit} maxBlocks={stage.maxBlocks} locked={playback.locked} activeBlockId={playback.frame?.activeBlockId} />
      </div>
      {playback.showResult && playback.result && <ResultModal onFix={controller.fix} result={playback.result} stars={controller.stars} onRetry={playback.reset} onClose={playback.dismiss} onNext={onNext} lastStage={lastStage} />}
    </section>
  )
}

