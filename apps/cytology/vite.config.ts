import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

import { cytologyUploadApiPlugin } from '../../lib/cytology-upload/src/vitePlugin'
import { normalizeBasePath } from '../../lib/shared/src/utils/normalizeBasePath'

function processPolyfillPlugin(mode: string) {
	const nodeEnv = mode === 'production' ? 'production' : 'development'
	return {
		name: 'cytology-process-polyfill',
		transformIndexHtml: {
			order: 'pre' as const,
			handler() {
				return [
					{
						tag: 'script',
						children: `globalThis.process={env:{NODE_ENV:${JSON.stringify(nodeEnv)}}};`,
						injectTo: 'head-prepend' as const,
					},
				]
			},
		},
	}
}

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '')

	// Префикс, под которым приложение опубликовано: `/cytology/` в сборке
	// (.env.production), корень в разработке. От него зависят адреса ассетов,
	// basename роутера и адреса API (`withBasePath`).
	const basePath = normalizeBasePath(env.VITE_BASE_PATH)

	const backend = env.VITE_CYTOLOGY_BACKEND === 'go' ? 'go' : 'python'
	const isGo = backend === 'go'

	const defaultProxyTarget = isGo ? 'http://85.143.115.142:8080' : 'http://msa.mephi.ru:7000'
	const proxyTarget =
		env.VITE_CYTOLOGY_PROXY_TARGET ?? env.VITE_API_PROXY_TARGET ?? env.VITE_PROXY_TARGET ?? defaultProxyTarget
	const dziProxyTarget = env.VITE_DZI_PROXY_TARGET ?? 'http://msa.mephi.ru:8005'
	const apiBaseUrl = env.VITE_API_BASE_URL ?? (isGo ? '/api/v1' : '/api/v3')
	const dziBaseUrl = env.VITE_DZI_API_BASE_URL ?? '/api/bid/v1/dzi'
	const cytologyCreatePath =
		env.VITE_CYTOLOGY_CREATE_PATH ?? `${apiBaseUrl.replace(/\/$/, '')}/cytology/create${isGo ? '' : '/'}`

	const proxy: Record<string, { target: string; changeOrigin: boolean }> = isGo
		? { '/api': { target: proxyTarget, changeOrigin: true } }
		: {
				'/api/bid': { target: dziProxyTarget, changeOrigin: true },
				'/api': { target: proxyTarget, changeOrigin: true },
			}

	return {
		base: basePath,
		plugins: [
			processPolyfillPlugin(mode),
			react(),
			cytologyUploadApiPlugin({
				apiProxyTarget: proxyTarget,
				cytologyCreatePath,
			}),
		],
		define: {
			'import.meta.env.VITE_CYTOLOGY_BACKEND': JSON.stringify(backend),
			'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiBaseUrl),
			'import.meta.env.VITE_DZI_API_BASE_URL': JSON.stringify(dziBaseUrl),
			'import.meta.env.VITE_AUTH_REFRESH_PATH': JSON.stringify(
				env.VITE_AUTH_REFRESH_PATH ?? (isGo ? '/refresh' : '/auth/token/refresh/'),
			),
			'import.meta.env.VITE_AUTH_REFRESH_HEADER_TOKEN': JSON.stringify(
				env.VITE_AUTH_REFRESH_HEADER_TOKEN ?? (isGo ? 'false' : 'true'),
			),
		},
		resolve: {
			dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom', 'openseadragon'],
			alias: {
				'@': path.resolve(__dirname, './src'),
				'@cytology': path.resolve(__dirname, './src/features/cytology-view'),
				'@medml/ui/styles': path.resolve(__dirname, '../../lib/ui/src/styles'),
				'@medml/ui': path.resolve(__dirname, '../../lib/ui/src'),
				'@medml/layout': path.resolve(__dirname, '../../domains/layout/src'),
				'@medml/doctor_profile': path.resolve(__dirname, '../../domains/doctor_profile/src'),
				'@medml/patient_view': path.resolve(__dirname, '../../domains/patient_view/src'),
				'@medml/study_view': path.resolve(__dirname, '../../domains/study_view/src'),
				'@medml/subscriptions': path.resolve(__dirname, '../../domains/subscriptions/src'),
				'@medml/viewers': path.resolve(__dirname, '../../lib/viewers/src'),
				'@medml/patient_create': path.resolve(__dirname, '../../domains/patient_create/src'),
			},
		},
		server: {
			port: 3001,
			proxy,
		},
	}
})
