/// <reference types="vite/client" />
/// <reference types="vitest" />

interface ImportMetaEnv {
  readonly VITE_CONTRACT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}