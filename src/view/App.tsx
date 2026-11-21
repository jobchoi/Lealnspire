import { useEffect, useRef, useState } from 'react'
import { stages } from '../model/stages'
import { AppController } from '../controller/AppController'
import { useController } from './hooks/useController'
import { HomePage } from './pages/HomePage'
import { StageSelectPage } from './pages/StageSelectPage'
import { PlayPage } from './pages/PlayPage'
function App({ controller: supplied }: { controller?: AppController } = {}) {
  const [controller] = useState(() => supplied ?? new AppController())
  const screen = useController(controller)
  const main = useRef<HTMLElement>(null)
  const pageKey = screen.page === 'play' ? `play-${screen.index}` : screen.page
  useEffect(() => { main.current?.querySelector<HTMLElement>('[data-page-title]')?.focus() }, [pageKey])
  const progress = controller.progress
  return <main className="app" ref={main}>
    {screen.page === 'home' && <HomePage progress={progress} onStart={controller.start} onContinue={controller.openStage} onList={controller.list} persistent={controller.repository.persistent} onClear={controller.clearProgress} />}
    {screen.page === 'list' && <StageSelectPage progress={progress} onSelect={controller.openStage} onHome={controller.home} />}
    {screen.page === 'play' && <PlayPage key={screen.index} stage={stages[screen.index]} progressStore={controller.repository} controller={controller.game} onList={controller.list} lastStage={screen.index === stages.length - 1} onNext={controller.next} />}
  </main>
}
export default App
