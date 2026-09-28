export function isNotFoundError(error: unknown): boolean {
	if (!error || typeof error !== 'object') return false
	const { status, data } = error as { status?: unknown; data?: unknown }

	if (status === 404) return true
	if (typeof status !== 'number' || status < 400) return false

	const text = typeof data === 'string' ? data : JSON.stringify(data ?? '')
	return /не\s+найден|not\s+found|no\s+rows|invalid\s+uuid|invalid\s+UUID/i.test(text)
}
