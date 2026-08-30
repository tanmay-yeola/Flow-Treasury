/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO_MODE?: string;
  readonly VITE_LOCAL_RPC?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
