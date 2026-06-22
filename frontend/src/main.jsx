// src/main.jsx
// Bootstrap is removed — we use our own index.css exclusively.
// This keeps the bundle small and means every style is ours to read/explain.

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
