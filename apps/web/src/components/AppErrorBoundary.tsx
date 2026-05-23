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

    const isDevModuleUrl = /\.tsx(\?|$)/i.test(this.state.message);
    const isChunkError =
      /Failed to fetch dynamically imported module/i.test(this.state.message) ||
      /Loading chunk/i.test(this.state.message);

    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="surface-1 w-full max-w-xl rounded-xl border border-destructive/30 p-6 shadow-xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-full bg-destructive/15 p-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Something went wrong on this page</h2>
              <p className="text-sm text-muted-foreground">
                {isDevModuleUrl
                  ? 'The site is not serving a production build. Redeploy using npm run build and serve the dist folder (not the Vite dev server).'
                  : isChunkError
                    ? 'A page file failed to load — often after an update. Reload once; if it persists, clear cache or contact support.'
                    : 'Please reload the page. If it happens again, contact support.'}
              </p>
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/50 px-3 py-2 font-mono text-xs text-foreground">
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
