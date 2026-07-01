/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLINICIAN_URL?: string;
  readonly VITE_PATIENT_URL?: string;
  readonly VITE_GITHUB_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
