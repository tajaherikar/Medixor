'use client';

import React, { ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console for debugging
    console.error('Error caught by boundary:', error);
    console.error('Error info:', errorInfo);
    
    // In production, you could send this to an error tracking service like Sentry
    // Sentry.captureException(error, { extra: errorInfo });
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback?.(this.state.error!, this.reset) || (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
            <div className="rounded-lg bg-white shadow-xl max-w-md w-full p-6 border border-red-100">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                <h1 className="text-lg font-semibold text-red-900">Something went wrong</h1>
              </div>

              <div className="mb-6 bg-red-50 rounded p-3 border border-red-200">
                <p className="text-sm text-red-700 font-mono leading-relaxed break-words">
                  {this.state.error?.message || 'An unexpected error occurred'}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={this.reset}
                  variant="default"
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-4 text-center">
                If this keeps happening, please refresh the page or contact support.
              </p>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
