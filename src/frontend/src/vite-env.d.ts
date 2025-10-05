/// <reference types="vite/client" />
/// <reference types="react" />
/// <reference types="react-dom" />

interface ImportMetaEnv {
  readonly VITE_REOWN_PROJECT_ID: string
  readonly VITE_FILECOIN_CALIBRATION_RPC: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}