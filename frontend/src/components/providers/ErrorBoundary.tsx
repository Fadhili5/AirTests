import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <DefaultErrorFallback error={this.state.error} onReset={() => this.setState({ hasError: false, error: undefined })} />;
    }
    return this.props.children;
  }
}

function DefaultErrorFallback({ error, onReset }: { error?: Error; onReset: () => void }) {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-rose-400/20 bg-[#0c1522] p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-400/15">
          <AlertIcon className="h-6 w-6 text-rose-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-100">Module Error</h3>
        <p className="mt-2 text-sm text-slate-400">
          {error?.message || "An unexpected error occurred in this module."}
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={onReset}
            className="rounded-lg bg-cyan-400/15 px-4 py-2 text-sm font-medium text-cyan-300 border border-cyan-400/20 hover:bg-cyan-400/25 transition-colors"
          >
            Retry
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10 transition-colors"
          >
            Reload App
          </button>
        </div>
      </div>
    </div>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}
