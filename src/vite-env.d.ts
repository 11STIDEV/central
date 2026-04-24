/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL do backend (sem / no fim). Só se o front e a API tiverem origens diferentes. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
