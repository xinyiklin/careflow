import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Landing is a single static marketing page (no client routing), so it needs
// no SPA rewrite. Port 5175 is the next free slot in CareFlow's 5173-5180
// reservation (clinician 5173, patient 5174).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "localhost",
    port: 5175,
    strictPort: true,
  },
});
