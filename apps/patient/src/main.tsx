import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import { Providers } from "./app/providers";
import { App } from "./app/App";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("CareFlow Patient root element was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <Providers>
        <App />
      </Providers>
    </BrowserRouter>
  </StrictMode>
);
