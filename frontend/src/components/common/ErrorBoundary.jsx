import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-12 min-h-[400px] text-center glass-surface rounded-2xl border-dashed border-2 border-destructive/20 m-4">
          <div className="bg-destructive/10 p-4 rounded-full mb-6">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-2 tracking-tight">Đã có lỗi xảy ra</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Chúng tôi rất tiếc vì sự cố này. Vui lòng thử tải lại trang hoặc liên hệ hỗ trợ nếu vấn đề tiếp diễn.
          </p>
          <Button 
            onClick={this.handleReset}
            className="rounded-xl px-8 font-bold flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Tải lại trang
          </Button>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-muted/50 rounded-lg text-left w-full max-w-2xl overflow-auto border border-white/5">
              <p className="text-xs font-mono text-destructive mb-2 font-bold uppercase tracking-widest">Debug Info (Dev Only):</p>
              <pre className="text-xs font-mono opacity-70">
                {this.state.error?.toString()}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
