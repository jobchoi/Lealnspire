import { useEffect, useState, type CSSProperties } from 'react'
import type { Program, Stage } from '../engine/types'
import { Editor } from '../components/Editor'
import { ko } from '../i18n/ko'
import { Board } from '../components/Board'
import { usePlayback } from '../hooks/usePlayback'
import { playbackSpeeds } from '../hooks/playback'
import { ResultModal } from '../components/ResultModal'
import { showNextStage } from './flow'
import { score } from '../engine/score'
import { countBlocks } from '../engine/program'
import { createProgressStore } from '../storage/progress'

type Props = { stage: Stage; progressStore: ReturnType<typeof createProgressStore>; onList: () => void; onNext: () => void; lastStage: boolean }

export function PlayPage({ stage, progressStore, onList, onNext, lastStage }: Props) {
  const [showHint, setShowHint] = useState(false)
  const [program, setProgram] = useState<Program>(() => progressStore.getProgram(stage))
  const playback = usePlayback(stage, program)
  function editProgram(nextProgram: Program) {
    setProgram(nextProgram)
    progressStore.saveProgram(stage.id, nextProgram)
  }
  useEffect(() => {
    if (playback.finished && playback.result === 'success') {
      progressStore.completeStage(stage.id, score(playback.result, countBlocks(program), stage.starBlocks), program)
    }
  }, [playback.finished, playback.result, program, progressStore, stage])
  return (
    <section className="play-page">
      <h1 tabIndex={-1} data-page-title>{ko.stage} {stage.id}: {stage.title}</h1>
      <div className="playback-controls stage-controls">
        <button type="button" onClick={onList} aria-label={ko.stageList} title={ko.stageList}><span className="control-symbol" aria-hidden="true">{ko.icons.stageList}</span><small>{ko.stageList}</small></button>
        <button type="button" aria-expanded={showHint} aria-controls="stage-hint" onClick={() => setShowHint(value => !value)} aria-label={ko.hint} title={ko.hint}><span className="control-symbol" aria-hidden="true">{ko.icons.hint}</span><small>{ko.hint}</small></button>
        {(showNextStage(progressStore.getProgress(), stage.id, lastStage) || (playback.finished && playback.result === 'success' && !lastStage)) && <button type="button" aria-label={ko.nextStage} title={ko.nextStage} onClick={onNext}><span className="control-symbol" aria-hidden="true">{ko.icons.nextStage}</span><small>{ko.nextStage}</small></button>}
      </div>
      {showHint && <p id="stage-hint" className="stage-hint">{stage.hint}</p>}
      <p className="stage-goal"><span className="goal-symbol" aria-hidden="true">{ko.goalIcon}</span> {stage.goal}</p>
      <div className="game-layout">
        <div className="map-panel" style={{ '--min-board-width': `${stage.grid[0].length * 40 + (stage.grid[0].length - 1) * 4 + 8}px`, '--compact-board-width': `${stage.grid[0].length * 56 + (stage.grid[0].length - 1) * 4 + 8}px`, '--board-ratio': stage.grid[0].length / stage.grid.length, '--mobile-board-width': `calc((22dvh - 8px) * ${stage.grid[0].length} / ${stage.grid.length})` } as CSSProperties}>
          <Board stage={stage} position={playback.frame?.pos} direction={playback.frame?.dir} bump={playback.frame?.event === 'bump'} />
          <div className="playback-controls execution-controls">
            <button className="run-button" type="button" disabled={!program.length || playback.playing} onClick={playback.play} aria-label={ko.run} title={ko.run}><span className="control-symbol" aria-hidden="true">{ko.icons.run}</span><small>{ko.run}</small></button>
            <button type="button" disabled={!program.length || playback.playing || playback.finished} onClick={playback.step} aria-label={ko.step} title={ko.step}><span className="control-symbol" aria-hidden="true">{ko.icons.step}</span><small>{ko.step}</small></button>
            <button type="button" onClick={playback.reset} aria-label={ko.reset} title={ko.reset}><span className="control-symbol" aria-hidden="true">{ko.icons.reset}</span><small>{ko.reset}</small></button>

            {Object.keys(playbackSpeeds).map(key => {
              const speed = key as keyof typeof playbackSpeeds
              return <button type="button" key={speed} aria-pressed={playback.speed === speed} aria-label={ko.speeds[speed]} title={ko.speeds[speed]} onClick={() => playback.setSpeed(speed)}><span aria-hidden="true">{ko.speedIcons[speed]}</span><small>{ko.speeds[speed]}</small></button>
            })}
          </div>
        </div>
        <Editor program={program} onChange={editProgram} maxBlocks={stage.maxBlocks} locked={playback.locked} activeBlockId={playback.frame?.activeBlockId} />
      </div>
      {playback.showResult && playback.result && <ResultModal result={playback.result} stars={score(playback.result, countBlocks(program), stage.starBlocks)} onRetry={playback.reset} onClose={playback.dismiss} onNext={onNext} lastStage={lastStage} />}
    </section>
  )
}

