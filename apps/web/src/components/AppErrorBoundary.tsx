import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'Unexpected UI error',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Keep console logging for diagnostics in production/browser devtools.
    console.error('AppErrorBoundary caught an error', { error, errorInfo });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="surface-1 w-full max-w-xl rounded-xl border border-destructive/30 p-6 shadow-xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-full bg-destructive/15 p-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Something went wrong on this page</h2>
              <p className="text-sm text-muted-foreground">Please reload the page. If it happens again, contact support.</p>
            </div>
          </div>

          <div className="rounded-md border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs text-amber-200">
            {this.state.message}
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" />
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
