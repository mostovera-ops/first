import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useStore } from './store'
import { useAuth } from './store/auth'
import { useProfile } from './store/profile'
import { useUI } from './store/ui'

// Expose stores in dev for E2E testing / debugging only.
if (import.meta.env.DEV) {
  Object.assign(window as unknown as Record<string, unknown>, {
    __store: useStore,
    __auth: useAuth,
    __profile: useProfile,
    __ui: useUI,
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
