import { useEffect, useState } from 'react'
import type { Program, Stage } from '../engine/types'
import { Editor } from '../components/Editor'
import { ko } from '../i18n/ko'
import { Board } from '../components/Board'
import { usePlayback } from '../hooks/usePlayback'
import { playbackSpeeds } from '../hooks/playback'
import { ResultModal } from '../components/ResultModal'
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
    <section>
      <h1 tabIndex={-1} data-page-title>{ko.stage} {stage.id}: {stage.title}</h1>
      <div className="playback-controls">
        <button type="button" onClick={onList}>{ko.stageList}</button>
        <button type="button" aria-expanded={showHint} aria-controls="stage-hint" onClick={() => setShowHint(value => !value)}>{ko.hint}</button>
      </div>
      {showHint && <p id="stage-hint">{stage.hint}</p>}
      <p>{stage.goal}</p>
      <div className="game-layout">
        <Board stage={stage} position={playback.frame?.pos} direction={playback.frame?.dir} bump={playback.frame?.event === 'bump'} />
        <Editor program={program} onChange={editProgram} maxBlocks={stage.maxBlocks} locked={playback.locked} activeBlockId={playback.frame?.activeBlockId} />
      </div>
      <div className="playback-controls">
        <button type="button" disabled={!program.length || playback.playing} onClick={playback.play}>{ko.run}</button>
        <button type="button" disabled={!program.length || playback.playing || playback.finished} onClick={playback.step}>{ko.step}</button>
        <button type="button" onClick={playback.reset}>{ko.reset}</button>
        <span>{ko.speed}</span>
        {Object.keys(playbackSpeeds).map(key => {
          const speed = key as keyof typeof playbackSpeeds
          return <button type="button" key={speed} aria-pressed={playback.speed === speed} onClick={() => playback.setSpeed(speed)}>{ko.speeds[speed]}</button>
        })}
      </div>
      {playback.showResult && playback.result && <ResultModal result={playback.result} stars={score(playback.result, countBlocks(program), stage.starBlocks)} onRetry={playback.reset} onClose={playback.dismiss} onNext={onNext} lastStage={lastStage} />}
    </section>
  )
}

