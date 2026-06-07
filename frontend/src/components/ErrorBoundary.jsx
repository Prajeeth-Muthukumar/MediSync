import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', color: '#f8fafc', background: '#0f172a', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2 style={{ color: '#ef4444' }}>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '20px', background: '#1e293b', padding: '20px', borderRadius: '8px' }}>
            <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>View Error Details</summary>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          <button 
            onClick={() => window.location.href = '/'} 
            style={{ marginTop: '20px', padding: '10px 20px', background: '#38bdf8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Return to Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
