import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorDetails = null;
      try {
        if (this.state.error?.message) {
          errorDetails = JSON.parse(this.state.error.message);
        }
      } catch {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-red-100">
            <div className="bg-red-100 p-4 rounded-full inline-flex mb-6">
              <AlertTriangle className="text-red-600 h-10 w-10" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">เกิดข้อผิดพลาดบางอย่าง</h1>
            
            {errorDetails ? (
              <div className="text-left bg-gray-50 p-4 rounded-xl mb-6 border border-gray-100">
                <p className="text-sm font-bold text-red-600 mb-2">รายละเอียดข้อผิดพลาด:</p>
                <div className="space-y-1 text-xs font-mono text-gray-600">
                  <p><span className="font-bold">Operation:</span> {errorDetails.operationType}</p>
                  <p><span className="font-bold">Path:</span> {errorDetails.path}</p>
                  <p><span className="font-bold">Error:</span> {errorDetails.error}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 mb-8">
                ขออภัย ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง
              </p>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all transform active:scale-95"
              >
                <RefreshCcw size={18} />
                รีเฟรชหน้าจอ
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center justify-center gap-2 w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all transform active:scale-95"
              >
                <Home size={18} />
                กลับหน้าหลัก
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
