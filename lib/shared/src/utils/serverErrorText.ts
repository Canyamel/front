const MAX_LENGTH = 200

function clamp(text: string): string {
	const trimmed = text.trim()
	return trimmed.length > MAX_LENGTH ? `${trimmed.slice(0, MAX_LENGTH)}…` : trimmed
}

function findLabelled(lines: string[], label: string): string | null {
	const prefix = `${label}:`
	const found = lines.find(line => line.startsWith(prefix))
	if (!found) return null

	const value = found.slice(prefix.length).trim()
	return value || null
}

function isDjangoTracebackHead(line: string): boolean {
	return /^[A-Za-z_][\w.]*(Error|Exception)\s+at\s+\//.test(line)
}

export function describeServerErrorBody(body: unknown): string | null {
	if (typeof body !== 'string') return null

	const lines = body
		.split('\n')
		.map(line => line.trim())
		.filter(Boolean)

	if (lines.length === 0) return null

	if (lines[0].startsWith('<')) return null

	const type = findLabelled(lines, 'Exception Type')
	const value = findLabelled(lines, 'Exception Value')

	if (type && value) return clamp(`${type}: ${value}`)
	if (value) return clamp(value)
	if (type) return clamp(type)

	if (isDjangoTracebackHead(lines[0])) {
		return clamp(lines[1] ? `${lines[0]} — ${lines[1]}` : lines[0])
	}

	return clamp(lines[lines.length - 1])
}
