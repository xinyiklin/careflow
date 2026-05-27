export const APP_URL =
  import.meta.env.VITE_APP_URL || "https://careflow.xinyiklin.com";
export const API_URL =
  import.meta.env.VITE_API_URL || "https://api.careflow.xinyiklin.com";

export const DEMO_MODE =
  import.meta.env.VITE_DEMO_MODE === "true" || import.meta.env.DEV;
