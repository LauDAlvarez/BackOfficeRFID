import { Component, type ErrorInfo, type PropsWithChildren } from 'react'
import { StatePanel } from './StatePanel'

export class ErrorBoundary extends Component<
  PropsWithChildren,
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV)
      console.error('Error de la aplicación:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto max-w-2xl p-6 pt-20">
          <StatePanel
            role="alert"
            icon="info"
            title="No pudimos mostrar esta página"
            description="Ocurrió un error inesperado. Volvé a cargar la aplicación para intentarlo nuevamente."
          >
            <a href="/" className="button-primary">
              Volver al inicio
            </a>
          </StatePanel>
        </main>
      )
    }
    return this.props.children
  }
}
