/**
 * main.tsx — Entry point for the Blog panel.
 *
 * Uses the @anomalous/sdk/panel API:
 *   <PanelApp> handles all bridge setup, handshake, and theme sync.
 *   The blog component uses PanelRouter for in-memory client-side routing.
 */

import { createRoot } from "react-dom/client";
import { PanelApp } from "@anomalous/sdk/panel";
import { App } from "./panel";
import "../app/app.css";

const root = document.getElementById("root");
if (!root) throw new Error("No #root element found");

createRoot(root).render(
  <PanelApp>
    <App />
  </PanelApp>,
);
