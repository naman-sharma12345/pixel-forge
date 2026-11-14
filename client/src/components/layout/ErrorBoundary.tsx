import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui'
import { Logo } from './Logo'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <Logo />
        <div className="pixelated flex h-20 w-20 items-center justify-center rounded-panel border border-danger/40 bg-danger/10 font-pixel text-xl text-danger">
          404
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-xl font-semibold text-text">The forge glitched</h1>
          <p className="max-w-md text-sm text-muted">
            {this.state.error.message || 'Something unexpected happened. The pixels will realign.'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => window.location.reload()}>Reload</Button>
          <Button onClick={() => { this.setState({ error: null }); window.location.assign('/') }}>Go home</Button>
        </div>
      </div>
    )
  }
}
