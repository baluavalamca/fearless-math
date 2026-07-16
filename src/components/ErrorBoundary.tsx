/**
 * App-level error boundary — catches any render/runtime error anywhere in the
 * screen tree and shows a friendly recovery screen instead of a blank white page.
 * A kids' app must never dead-end on a crash. (Visuals have their own
 * VisualBoundary; this is the outer safety net for the whole app shell.)
 */
import { Component, ErrorInfo, ReactNode } from "react";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Console breadcrumb only — nothing leaves the device.
    console.error("FearlessMath crashed:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fm-crash">
          <div className="fm-crash-card">
            <div className="fm-crash-fox">🦊</div>
            <h1>Oops! Fraction Fox tripped.</h1>
            <p>Something went wrong — but nothing is lost. Your progress is saved. Let's start fresh.</p>
            <button className="fm-primary" onClick={() => window.location.reload()}>↻ Try again</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
