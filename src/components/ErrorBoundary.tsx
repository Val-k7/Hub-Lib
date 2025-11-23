import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { logger } from "@/lib/logger";
import { withTranslation, WithTranslation } from "react-i18next";

interface Props extends WithTranslation {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Logger l'erreur avec contexte
    logger.error(
      "Erreur capturée par ErrorBoundary",
      error,
      {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      }
    );

    this.setState({ errorInfo });

    // Appeler le callback personnalisé si fourni
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full p-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">{this.props.t('error.title')}</h1>
              <p className="text-muted-foreground">
                {this.props.t('error.description')}
              </p>
            </div>

            {this.state.error && (
              <details className="text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  {this.props.t('error.technicalDetails')}
                </summary>
                <div className="mt-2 p-3 bg-muted rounded-md text-xs space-y-2">
                  <div>
                    <strong>Erreur:</strong> {this.state.error.name}
                  </div>
                  <div>
                    <strong>Message:</strong> {this.state.error.message}
                  </div>
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <strong>Composant:</strong>
                      <pre className="mt-1 overflow-auto max-h-32 text-xs">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex gap-3 justify-center pt-4">
              <Button onClick={this.handleReset} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                {this.props.t('common.retry')}
              </Button>
              <Button onClick={this.handleGoHome} className="gap-2">
                <Home className="h-4 w-4" />
                {this.props.t('error.goHome')}
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default withTranslation()(ErrorBoundary);
