import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./index.css";
import router from "./app/router";
import AppProviders from "./app/providers";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("CareFlow root element was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>
);
