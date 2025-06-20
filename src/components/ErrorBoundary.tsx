import React, { Component } from 'react'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-country-cream">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-country-dark mb-4">
              Oops! Something went wrong
            </h1>
            <p className="text-gray-600 mb-4">
              We're having trouble loading the page. Please refresh to try again.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-country-orange text-white px-6 py-2 rounded"
            >
              Refresh Page
            </button>
            {this.state.error && (
              <details className="mt-4 text-left max-w-md mx-auto">
                <summary className="cursor-pointer text-sm text-gray-500">
                  Error details
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary