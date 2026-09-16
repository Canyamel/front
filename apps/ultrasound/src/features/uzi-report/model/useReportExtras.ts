import { useCallback, useState } from 'react'

import { EMPTY_REPORT_EXTRAS, type ReportExtras } from './types'

const STORAGE_PREFIX = 'ultrasound:report-extras:'

function storageKey(uziId: string): string {
	return `${STORAGE_PREFIX}${uziId}`
}

function isEmpty(extras: ReportExtras): boolean {
	return (Object.keys(EMPTY_REPORT_EXTRAS) as (keyof ReportExtras)[]).every(key => {
		const value = extras[key]
		return typeof value === 'boolean' ? value === EMPTY_REPORT_EXTRAS[key] : !value
	})
}

function read(uziId: string): ReportExtras {
	try {
		const raw = localStorage.getItem(storageKey(uziId))
		if (!raw) return EMPTY_REPORT_EXTRAS

		const parsed = JSON.parse(raw) as Partial<ReportExtras>
		const next = { ...EMPTY_REPORT_EXTRAS }

		for (const key of Object.keys(EMPTY_REPORT_EXTRAS) as (keyof ReportExtras)[]) {
			const fallback = EMPTY_REPORT_EXTRAS[key]
			const value = parsed[key]
			if (typeof fallback === 'boolean') {
				;(next[key] as boolean) = Boolean(value ?? fallback)
			} else {
				;(next[key] as string) = String(value ?? '')
			}
		}

		return next
	} catch {
		return EMPTY_REPORT_EXTRAS
	}
}

interface ExtrasState {
	uziId: string
	extras: ReportExtras
}

export interface UseReportExtrasResult {
	extras: ReportExtras
	setExtras: (next: ReportExtras) => void
}

export function useReportExtras(uziId: string): UseReportExtrasResult {
	const [state, setState] = useState<ExtrasState>(() => ({ uziId, extras: read(uziId) }))

	// Снимок сменился без размонтирования страницы — подхватываем черновик
	// нового снимка прямо в рендере; эффект тут только добавил бы лишний кадр.
	if (state.uziId !== uziId) {
		setState({ uziId, extras: read(uziId) })
	}

	const setExtras = useCallback(
		(next: ReportExtras) => {
			try {
				if (isEmpty(next)) {
					localStorage.removeItem(storageKey(uziId))
				} else {
					localStorage.setItem(storageKey(uziId), JSON.stringify(next))
				}
			} catch {
				// Хранилище недоступно — правки всё равно остаются в состоянии
				// и попадают в заключение, теряется только их сохранение.
			}
			setState({ uziId, extras: next })
		},
		[uziId],
	)

	return { extras: state.extras, setExtras }
}
