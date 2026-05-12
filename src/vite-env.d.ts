/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL do backend (sem / no fim). Só se o front e a API tiverem origens diferentes. */
  readonly VITE_API_BASE_URL?: string;
  /** `1` = em dev, usar o proxy /api do Vite em vez do URL directo à porta 3001. */
  readonly VITE_USE_VITE_PROXY?: string;
  /** Lista CSV de e-mails com acesso à Administração do painel de senhas. */
  readonly VITE_PAINEL_ADMIN_EMAILS?: string;
  /** Nome parcial/exato da voz usada nas chamadas do painel de senhas. */
  readonly VITE_PAINEL_VOICE_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
