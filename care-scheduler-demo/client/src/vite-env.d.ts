interface ImportMetaEnv {
  readonly VITE_API_BASE: string
  // add more VITE_* env vars here if you create them
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}