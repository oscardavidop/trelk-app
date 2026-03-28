import { Component, type ReactNode } from 'react';
import { XCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9998] bg-tg-bg flex flex-col items-center justify-center px-8">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
            <XCircle size={32} className="text-red-400" />
          </div>
          <h1 className="text-[20px] font-extrabold text-tg-text mb-2 text-center">
            Something went wrong
          </h1>
          <p className="text-[14px] text-tg-hint text-center mb-6 max-w-[280px] leading-relaxed">
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-5 py-3 bg-tg-accent text-white rounded-[14px] font-semibold text-[14px] active:scale-95 transition-transform"
          >
            <RotateCcw size={16} />
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
