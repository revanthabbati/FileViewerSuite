import { Component } from 'react'

// Keeps one misbehaving file from taking down the whole workspace.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Viewer crashed:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="banner banner-error" role="alert">
        <strong>Something went wrong while rendering this view.</strong>
        <p>{String(this.state.error?.message || this.state.error)}</p>
        <button className="btn btn-secondary btn-small" style={{ marginTop: '0.75rem' }} onClick={() => this.setState({ error: null })}>
          Try again
        </button>
      </div>
    )
  }
}
