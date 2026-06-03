/**
 * main.tsx — Entry point for the Blog panel.
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
