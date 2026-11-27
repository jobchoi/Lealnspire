import { useEffect, useRef, useState } from 'react'
import { allStages as stages, isLastStage } from '../model/stages'
import { AppController } from '../controller/AppController'
import { useController } from './hooks/useController'
import { HomePage } from './pages/HomePage'
import { StageSelectPage } from './pages/StageSelectPage'
import { PredictionPage } from './pages/PredictionPage'
import { PlayPage } from './pages/PlayPage'
import { i18n, resolveLocale, type Locale } from '../i18n/I18n'
function App({ controller: supplied, onLanguageChange }: { controller?: AppController; onLanguageChange?: (locale: Locale) => void } = {}) {
  const [controller] = useState(() => supplied ?? new AppController())
  const [locale, setLocale] = useState(() => resolveLocale(i18n.locale, controller.repository.getLanguage()))
  useEffect(() => {
    document.documentElement.lang = locale
    document.title = i18n.t('title')
  }, [locale])
  const changeLanguage = () => {
    const next = locale === 'ko' ? 'en' : 'ko'
    i18n.locale = next
    controller.repository.saveLanguage(next)
    setLocale(next)
    onLanguageChange?.(next)
  }
  const screen = useController(controller)
  const main = useRef<HTMLElement>(null)
  const pageKey = screen.page === 'play' ? `play-${screen.index}` : screen.page
  useEffect(() => { main.current?.querySelector<HTMLElement>('[data-page-title]')?.focus() }, [pageKey])
  const progress = controller.progress
  return <main className="app" ref={main}>
    {screen.page === 'home' && <HomePage locale={locale} onLanguageChange={changeLanguage} progress={progress} onStart={controller.start} onContinue={controller.openStage} onList={controller.list} persistent={controller.repository.persistent} onClear={controller.clearProgress} />}
    {screen.page === 'list' && <StageSelectPage progress={progress} onSelect={controller.openStage} onHome={controller.home} onPrediction={controller.openPrediction} />}
    {screen.page === 'prediction' && controller.prediction && <PredictionPage controller={controller.prediction} onBack={controller.list} />}
    {screen.page === 'play' && <PlayPage key={screen.index} stage={stages[screen.index]} progressStore={controller.repository} controller={controller.game} onList={controller.list} lastStage={isLastStage(screen.index)} onNextUnit={controller.nextUnit} onNext={controller.next} />}
  </main>
}
export default App
