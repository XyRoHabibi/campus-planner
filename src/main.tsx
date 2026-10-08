import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@/app/App'
import { installStore } from '@/lib/pwa/install'
import { setupServiceWorker } from '@/lib/pwa/register'
import '@/styles/index.css'

// Tangkap `beforeinstallprompt` sedini mungkin (bisa terjadi sebelum React dimuat).
installStore.init()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

setupServiceWorker()
