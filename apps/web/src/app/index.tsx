import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { AppRouter } from './router'
import { Toaster } from '@/shared/ui/sonner'
import './styles/globals.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppRouter />
      <Toaster position="bottom-right" />
    </BrowserRouter>
  </StrictMode>,
)
