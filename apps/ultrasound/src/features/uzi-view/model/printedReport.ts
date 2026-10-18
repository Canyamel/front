import { THYROID_DIMENSION_KEYS } from './thyroidDimensions'

/**
 * Поля формы исследования, которые печатаются в заключении и правятся в его
 * окне. Их значения на момент печати запоминаются (`rememberPrintedReport`).
 */
export const PRINTED_REPORT_FIELDS = [
	'position',
	'profile',
	'echogenicity',
	'cdk',
	'structure',
	'rln',
	'additional_data',
	'diagnosis',
	'volume',
	...THYROID_DIMENSION_KEYS,
] as const

/**
 * Заполнение заключения на момент печати.
 *
 * `basis` — значения сервера на момент печати. Поле восстанавливается из
 * снимка, только пока сервер его не поменял: сохранённая позже правка
 * важнее напечатанной.
 */
export interface PrintedReportSnapshot {
	values: Record<string, unknown>
	basis: Record<string, unknown>
}

const STORAGE_PREFIX = 'ultrasound:report-printed:'

export function readPrintedReport(uziId: string): PrintedReportSnapshot | null {
	try {
		const raw = localStorage.getItem(`${STORAGE_PREFIX}${uziId}`)
		if (!raw) return null
		const parsed = JSON.parse(raw) as Partial<PrintedReportSnapshot>
		if (!parsed.values || typeof parsed.values !== 'object') return null
		return { values: parsed.values, basis: parsed.basis && typeof parsed.basis === 'object' ? parsed.basis : {} }
	} catch {
		return null
	}
}

export function writePrintedReport(uziId: string, snapshot: PrintedReportSnapshot): void {
	try {
		localStorage.setItem(`${STORAGE_PREFIX}${uziId}`, JSON.stringify(snapshot))
	} catch {
		// Хранилище недоступно — заключение напечатано, теряется только снимок.
	}
}

/** Значения указанных полей; отсутствующие — как пустые. */
export function pickPrintedFields(values: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {}
	for (const field of PRINTED_REPORT_FIELDS) result[field] = values[field] ?? null
	return result
}
