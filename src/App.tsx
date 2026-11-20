import { Board } from './components/Board'
import { stages } from './stages'

function App() {
  const stage = stages[0]
  return (
    <main className="app">
      <h1>Lealnspire</h1>
      <h2>스테이지 {stage.id}: {stage.title}</h2>
      <p>{stage.goal}</p>
      <Board stage={stage} />
    </main>
  )
}

export default App
