import React from "react";
import { createRoot } from "react-dom/client";
import { Studio } from "./app/Studio";
class Boundary extends React.Component<
  { children: React.ReactNode },
  { error: string }
> {
  state = { error: "" };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  render() {
    return this.state.error ? (
      <main className="fatal">
        <h1>[ STUDIO INTERRUPTED ]</h1>
        <p>Your local draft is kept in this browser.</p>
        <pre>{this.state.error}</pre>
        <button onClick={() => location.reload()}>Reload studio</button>
        <a href="https://github.com/kawaiipantsu/strudel-xxc/issues">
          Report issue
        </a>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <Boundary>
    <Studio />
  </Boundary>,
);
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () =>
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .catch(() => {}),
  );
}
