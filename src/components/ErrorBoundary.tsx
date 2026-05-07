import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode; label?: string }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State { return { error } }

  componentDidCatch(error: Error) { console.error(`[ErrorBoundary:${this.props.label ?? 'unknown'}]`, error) }

  render() {
    if (this.state.error) {
      return (
        <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-6 text-center">
          <p className="text-red-400 font-medium mb-2">
            {this.props.label ? `${this.props.label} failed to render` : 'Something went wrong'}
          </p>
          <p className="text-xs text-gray-500 font-mono mb-4">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="text-xs px-3 py-1.5 rounded border border-red-700 text-red-400 hover:bg-red-900/30 transition-colors"
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
