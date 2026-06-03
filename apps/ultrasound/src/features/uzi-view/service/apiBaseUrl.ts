/** База API (как NEXT_PUBLIC_API_BASE_URL в OLD UZI). */
export function getApiBaseUrl(): string {
	const v =
		import.meta.env.VITE_BACKEND_BASE_URL ?? import.meta.env.VITE_API_BASE_URL
	if (typeof v === 'string' && v.length > 0) {
		return v.endsWith('/') ? v : `${v}/`
	}
	// return 'http://194.226.121.145:8080/api/v1/'
	return '/api/v3/'
}
