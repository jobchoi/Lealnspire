import { useState } from 'react'
import type { Program } from './engine/types'
import { Editor } from './components/Editor'
import { ko } from './i18n/ko'
import { Board } from './components/Board'
import { stages } from './stages'

function App() {
  const stage = stages[0]
  const [program, setProgram] = useState<Program>(() => stage.initialProgram ?? [])
  return (
    <main className="app">
      <h1>{ko.title}</h1>
      <h2>{ko.stage} {stage.id}: {stage.title}</h2>
      <p>{stage.goal}</p>
      <div className="game-layout">
        <Board stage={stage} />
        <Editor program={program} onChange={setProgram} maxBlocks={stage.maxBlocks} />
      </div>
    </main>
  )
}

export default App
