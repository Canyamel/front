/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_BACKEND_BASE_URL?: string
	readonly VITE_API_BASE_URL?: string
	readonly VITE_BACKEND_PROXY_TARGET?: string
	readonly VITE_ULTRASOUND_PROXY_TARGET?: string
	/** Только `true` — включить GET проверку сессии на бэкенде (по умолчанию выкл.) */
	readonly VITE_SESSION_CHECK?: string
	/** Путь относительно API base (по умолчанию `/session`) */
	readonly VITE_SESSION_PATH?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
