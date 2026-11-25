import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './view/App.tsx'
import { AppController } from './controller/AppController'
import { ProgressRepository } from './model/ProgressRepository'
import { i18n, resolveLocale } from './i18n/I18n'

let repository: ProgressRepository
try { repository = new ProgressRepository(globalThis.localStorage) } catch { repository = new ProgressRepository() }
const controller = new AppController(repository)
i18n.locale = resolveLocale(new URLSearchParams(globalThis.location.search).get('lang'), repository.getLanguage())
repository.saveLanguage(resolveLocale(i18n.locale, undefined))
const syncLanguageUrl = (locale: string) => {
  const url = new URL(globalThis.location.href)
  url.searchParams.set('lang', locale)
  globalThis.history.replaceState(null, '', url)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App controller={controller} onLanguageChange={syncLanguageUrl} />
  </StrictMode>,
)
