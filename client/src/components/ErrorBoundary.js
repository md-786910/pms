import React from "react";
import { AlertTriangle, RefreshCw, Home, X } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console for debugging
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // You can also log the error to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.handleReset();
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg border border-gray-200 p-6 md:p-8">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Something went wrong
                </h1>
                <p className="text-gray-600 mb-4">
                  We're sorry, but something unexpected happened. This error has been logged and we'll look into it.
                </p>

                {process.env.NODE_ENV === "development" && this.state.error && (
                  <div className="mt-4 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <details className="cursor-pointer">
                      <summary className="text-sm font-semibold text-gray-700 mb-2">
                        Error Details (Development Mode)
                      </summary>
                      <div className="mt-2 space-y-2">
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1">
                            Error Message:
                          </p>
                          <p className="text-xs text-red-600 font-mono bg-white p-2 rounded border border-gray-200 break-all">
                            {this.state.error.toString()}
                          </p>
                        </div>
                        {this.state.errorInfo && (
                          <div>
                            <p className="text-xs font-semibold text-gray-600 mb-1">
                              Component Stack:
                            </p>
                            <pre className="text-xs text-gray-700 font-mono bg-white p-2 rounded border border-gray-200 overflow-auto max-h-48">
                              {this.state.errorInfo.componentStack}
                            </pre>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <button
                    onClick={this.handleReset}
                    className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Try Again</span>
                  </button>
                  <button
                    onClick={this.handleReload}
                    className="flex items-center justify-center space-x-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Reload Page</span>
                  </button>
                  <button
                    onClick={this.handleGoHome}
                    className="flex items-center justify-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                  >
                    <Home className="w-4 h-4" />
                    <span>Go Home</span>
                  </button>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    If this problem persists, please contact support with the error details above.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Render children normally if no error
    return this.props.children;
  }
}

export default ErrorBoundary;

