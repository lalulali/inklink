/**
 * Feature: Error Boundary Component
 * Purpose: Catch and display graceful UI fallbacks on application-level errors
 * Dependencies: React, shadcn/ui Alert components
 */

"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { 
  AlertTriangleIcon, 
  RotateCcwIcon,
  RefreshCwIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Global Error Boundary class component
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center" id="inklink-error-fallback">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            <AlertTriangleIcon className="h-8 w-8" />
          </div>
          <div className="max-w-md space-y-2">
            <h1 className="text-xl font-bold tracking-tight">Something went wrong</h1>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
              We encountered a critical error while rendering the app.
              Your work is likely autosaved, so you can safely reload.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => window.location.reload()}
            >
                <RefreshCwIcon className="h-4 w-4" />
                <span>Reload App</span>
            </Button>
            <Button 
                variant="secondary" 
                size="sm" 
                className="gap-2"
                onClick={() => this.setState({ hasError: false })}
            >
                <RotateCcwIcon className="h-4 w-4" />
                <span>Try Recovering</span>
            </Button>
          </div>
          
          {process.env.NODE_ENV === "development" && (
             <pre className="mt-8 max-h-[200px] w-full max-w-2xl overflow-auto rounded-lg bg-slate-100 p-4 text-left text-[11px] font-mono text-slate-800 border">
                 {this.state.error?.stack}
             </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
