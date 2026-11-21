import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './view/App.tsx'
import { AppController } from './controller/AppController'
import { ProgressRepository } from './model/ProgressRepository'
import { i18n } from './i18n/I18n'

let repository: ProgressRepository
try { repository = new ProgressRepository(globalThis.localStorage) } catch { repository = new ProgressRepository() }
const controller = new AppController(repository)
i18n.locale = new URLSearchParams(globalThis.location.search).get('lang') ?? 'ko'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App controller={controller} />
  </StrictMode>,
)
