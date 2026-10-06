import { useCallback, useState } from 'react'

import { EMPTY_CYTOLOGY_REPORT_EXTRAS, type CytologyReportExtras } from './types'

const STORAGE_PREFIX = 'cytology:report-extras:'

function storageKey(cytologyId: string): string {
	return `${STORAGE_PREFIX}${cytologyId}`
}

function isEmpty(extras: CytologyReportExtras): boolean {
	return (Object.keys(EMPTY_CYTOLOGY_REPORT_EXTRAS) as (keyof CytologyReportExtras)[]).every(key => {
		const value = extras[key]
		const fallback = EMPTY_CYTOLOGY_REPORT_EXTRAS[key]
		return typeof fallback === 'boolean' ? value === fallback : !value
	})
}

function read(cytologyId: string): CytologyReportExtras {
	try {
		const raw = localStorage.getItem(storageKey(cytologyId))
		if (!raw) return EMPTY_CYTOLOGY_REPORT_EXTRAS

		const parsed = JSON.parse(raw) as Partial<CytologyReportExtras>
		const next = { ...EMPTY_CYTOLOGY_REPORT_EXTRAS }

		for (const key of Object.keys(EMPTY_CYTOLOGY_REPORT_EXTRAS) as (keyof CytologyReportExtras)[]) {
			const fallback = EMPTY_CYTOLOGY_REPORT_EXTRAS[key]
			const value = parsed[key]
			if (typeof fallback === 'boolean') {
				;(next[key] as boolean) = typeof value === 'boolean' ? value : fallback
			} else {
				;(next[key] as string) = String(value ?? '')
			}
		}

		return next
	} catch {
		return EMPTY_CYTOLOGY_REPORT_EXTRAS
	}
}

interface ExtrasState {
	cytologyId: string
	extras: CytologyReportExtras
}

export interface UseCytologyReportExtrasResult {
	extras: CytologyReportExtras
	setExtras: (next: CytologyReportExtras) => void
}

/**
 * Черновик полей отчёта. Хранится в браузере на каждое исследование: на
 * сервере этих полей нет, а терять набранный текст при переходе между
 * снимками нельзя.
 */
export function useCytologyReportExtras(cytologyId: string): UseCytologyReportExtrasResult {
	const [state, setState] = useState<ExtrasState>(() => ({ cytologyId, extras: read(cytologyId) }))

	// Исследование сменилось без размонтирования страницы — подхватываем
	// черновик нового прямо в рендере, иначе будет лишний кадр со старым.
	if (state.cytologyId !== cytologyId) {
		setState({ cytologyId, extras: read(cytologyId) })
	}

	const setExtras = useCallback(
		(next: CytologyReportExtras) => {
			try {
				if (isEmpty(next)) localStorage.removeItem(storageKey(cytologyId))
				else localStorage.setItem(storageKey(cytologyId), JSON.stringify(next))
			} catch {
				// Хранилище недоступно: правки остаются в состоянии и попадают
				// в документ, теряется только сохранение между открытиями.
			}
			setState({ cytologyId, extras: next })
		},
		[cytologyId],
	)

	return { extras: state.extras, setExtras }
}
