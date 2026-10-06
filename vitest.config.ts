import { defineConfig, type Plugin } from 'vitest/config'

/**
 * Общие пакеты читают env как `(import.meta as { env?: … }).env`: так они
 * собираются tsc без типов Vite. Сборка Vite снимает приведение до подстановки
 * env, а Vitest подменяет на `process.env` (и `vi.stubEnv`) только буквальное
 * `import.meta.env` — с приведением тест видит снимок env без подмен.
 * Плагин снимает приведение заранее, и тест видит env так же, как сборка.
 */
const unwrapImportMetaCast: Plugin = {
	name: 'medml:unwrap-import-meta-cast',
	enforce: 'pre',
	transform(code, id) {
		if (!/\.tsx?$/.test(id) || !code.includes('(import.meta as')) return null
		return code.replace(/\(import\.meta as [^)]*\)\.env/g, 'import.meta.env')
	},
}

/**
 * Юнит-тесты общих пакетов (`lib/*`, `domains/*`). Приложения тестами не
 * покрыты — их проверяют сборка и tsc.
 */
export default defineConfig({
	plugins: [unwrapImportMetaCast],
	esbuild: {
		// Корневой tsconfig унаследован от Next (`jsx: preserve`), тестам нужен
		// готовый JS.
		jsx: 'automatic',
	},
	test: {
		environment: 'node',
		include: ['lib/*/src/**/*.test.{ts,tsx}', 'domains/*/src/**/*.test.{ts,tsx}'],
	},
})
