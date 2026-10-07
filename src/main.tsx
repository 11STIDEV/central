import { Component, ErrorInfo, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "32px", fontFamily: "sans-serif", maxWidth: "800px", margin: "40px auto", background: "#fef2f2", borderRadius: "12px", border: "1px solid #fecaca", color: "#991b1b" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", margin: "0 0 12px 0" }}>Erro ao carregar a aplicação</h2>
          <p style={{ fontSize: "14px", margin: "0 0 16px 0", color: "#7f1d1d" }}>
            Ocorreu um erro inesperado durante a renderização:
          </p>
          <pre style={{ background: "#ffffff", padding: "16px", borderRadius: "8px", border: "1px solid #fee2e2", overflowX: "auto", fontSize: "12px", color: "#b91c1c" }}>
            {this.state.error?.stack || this.state.error?.message}
          </pre>
          <button
            onClick={() => {
              try { localStorage.clear(); sessionStorage.clear(); } catch (_) {}
              window.location.href = "/";
            }}
            style={{ marginTop: "16px", padding: "10px 20px", background: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}
          >
            Limpar Sessão Local e Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
