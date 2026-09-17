import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from './app/App'
import { AppProviders } from './app/AppProviders'
import './app/styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('No se encontró el contenedor de la aplicación.')

createRoot(root).render(
  <StrictMode>
    <AppProviders>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppProviders>
  </StrictMode>,
)
