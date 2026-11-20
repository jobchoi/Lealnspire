import { useEffect, useRef, useState } from 'react'
import { stages } from './stages'
import { createProgressStore, isUnlocked } from './storage/progress'
import { HomePage } from './pages/HomePage'
import { StageSelectPage } from './pages/StageSelectPage'
import { PlayPage } from './pages/PlayPage'

type Screen = { page: 'home' | 'list' } | { page: 'play'; index: number }
function App() {
  const [progressStore] = useState(() => createProgressStore())
  const [screen, setScreen] = useState<Screen>({ page: 'home' })
  const main = useRef<HTMLElement>(null)
  useEffect(() => {
    main.current?.querySelector<HTMLElement>('[data-page-title]')?.focus()
  }, [screen])
  function openStage(index: number) {
    if (isUnlocked(progressStore.getProgress(), index)) setScreen({ page: 'play', index })
  }
  const progress = progressStore.getProgress()
  return <main className="app" ref={main}>
    {screen.page === 'home' && <HomePage progress={progress} onStart={() => openStage(0)} onContinue={openStage} onList={() => setScreen({ page: 'list' })} />}
    {screen.page === 'list' && <StageSelectPage progress={progress} onSelect={openStage} onHome={() => setScreen({ page: 'home' })} />}
    {screen.page === 'play' && <PlayPage key={screen.index} stage={stages[screen.index]} progressStore={progressStore} onList={() => setScreen({ page: 'list' })} lastStage={screen.index === stages.length - 1} onNext={() => {
      if (screen.index === stages.length - 1) setScreen({ page: 'list' })
      else openStage(screen.index + 1)
    }} />}
  </main>
}
export default App
