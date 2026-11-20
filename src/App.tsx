import { useState } from 'react'
import type { Program } from './engine/types'
import { Editor } from './components/Editor'
import { ko } from './i18n/ko'
import { Board } from './components/Board'
import { stages } from './stages'
import { usePlayback } from './hooks/usePlayback'
import { playbackSpeeds } from './hooks/playback'
import { ResultModal } from './components/ResultModal'
import { score } from './engine/score'
import { countBlocks } from './engine/program'

function App() {
  const stage = stages[0]
  const [program, setProgram] = useState<Program>(() => stage.initialProgram ?? [])
  const playback = usePlayback(stage, program)
  return (
    <main className="app">
      <h1>{ko.title}</h1>
      <h2>{ko.stage} {stage.id}: {stage.title}</h2>
      <p>{stage.goal}</p>
      <div className="game-layout">
        <Board stage={stage} position={playback.frame?.pos} direction={playback.frame?.dir} bump={playback.frame?.event === 'bump'} />
        <Editor program={program} onChange={setProgram} maxBlocks={stage.maxBlocks} locked={playback.locked} activeBlockId={playback.frame?.activeBlockId} />
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
      {playback.showResult && playback.result && <ResultModal result={playback.result} stars={score(playback.result, countBlocks(program), stage.starBlocks)} onRetry={playback.reset} onClose={playback.dismiss} />}
    </main>
  )
}

export default App
