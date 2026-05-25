import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import type { Plugin } from 'vite'

/**
 * `next-auth/react` обращается к Node-глобалу `process` в браузере — в Vite его нет.
 * Инжектим минимальный `process` до загрузки модулей.
 */
function processPolyfillPlugin(mode: string): Plugin {
	const nodeEnv = mode === 'production' ? 'production' : 'development'
	return {
		name: 'ultrasound-process-polyfill',
		transformIndexHtml: {
			order: 'pre',
			handler() {
				return [
					{
						tag: 'script',
						children: `globalThis.process={env:{NODE_ENV:${JSON.stringify(nodeEnv)}}};`,
						injectTo: 'head-prepend',
					},
				]
			},
		},
	}
}

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '')
	const proxyTarget =
		env.VITE_BACKEND_PROXY_TARGET ??
		env.VITE_ULTRASOUND_PROXY_TARGET ??
		env.ULTRASOUND_API_PROXY_TARGET ??
		'http://localhost:8080'

	return {
		plugins: [processPolyfillPlugin(mode), react()],
		resolve: {
			dedupe: ['react', 'react-dom'],
			alias: {
				'@': path.resolve(__dirname, 'src'),
				'@medml/ui': path.resolve(__dirname, '../../lib/ui/src'),
				'@medml/patient_view': path.resolve(
					__dirname,
					'../../domains/patient_view/src',
				),
			},
		},
		server: {
			proxy: {
				'/api': {
					target: proxyTarget,
					changeOrigin: true,
				},
			},
		},
	}
})
