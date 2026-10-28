import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function StrobiApp() {
  return (
    <main className="demo">
      <h1>Strobi Avatar</h1>
      <p>Avatar integration is being prepared.</p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StrobiApp />
  </React.StrictMode>
);
