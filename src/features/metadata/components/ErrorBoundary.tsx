// Live Metadata Display - Error Boundary Component
// Catches React errors to prevent the entire metadata system from crashing

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class MetadataErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Metadata Error Boundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });

    // Report to error tracking service if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: `Metadata Error: ${error.message}`,
        fatal: false
      });
    }
  }

  public render() {
    if (this.state.hasError) {
      // Render custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="border border-red-200 dark:border-red-700 rounded-lg p-4 bg-red-50 dark:bg-red-900/20 m-4">
          <div className="flex items-start space-x-2">
            <div className="text-red-500 dark:text-red-400 text-lg">⚠️</div>
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Metadata Display Error
              </p>
              <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                The metadata display encountered an error and has been temporarily disabled.
              </p>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: undefined, errorInfo: undefined });
                  window.location.reload();
                }}
                className="mt-2 text-xs px-2 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
              >
                Reload Page
              </button>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-2">
                  <summary className="text-xs cursor-pointer text-red-600 dark:text-red-300">
                    Error Details (Development)
                  </summary>
                  <pre className="text-xs mt-1 p-2 bg-red-100 dark:bg-red-800 rounded overflow-auto max-h-32">
                    {this.state.error.message}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MetadataErrorBoundary;