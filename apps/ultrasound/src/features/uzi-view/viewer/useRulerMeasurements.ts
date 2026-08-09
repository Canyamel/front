import { useCallback, useState } from 'react'
import {
	formatMm,
	lineLengthPx,
	parseLineAnnotation,
	pxToMm,
	type MeasuredLine,
} from './measurement'

export interface RulerMeasurement {
	id: string
	line: MeasuredLine
	lengthPx: number
	/** Кадр, на котором проведено измерение. */
	page: number
}

export interface UseRulerMeasurementsResult {
	measurements: RulerMeasurement[]
	/** Добавить измерение из нарисованной аннотации. `false`, если это не отрезок. */
	addFromAnnotation: (annotation: unknown, page: number) => boolean
	remove: (id: string) => void
	clear: () => void
	/** Подпись с расстоянием; `null`, пока масштаб не задан. */
	labelFor: (measurement: RulerMeasurement, pxPerMm: number | null) => string | null
}

/**
 * Произвольные измерения линейкой.
 *
 * Живут только в состоянии вьюера: это вспомогательная разметка врача,
 * а не контуры узлов — на бэкенд они не отправляются.
 */
export function useRulerMeasurements(): UseRulerMeasurementsResult {
	const [measurements, setMeasurements] = useState<RulerMeasurement[]>([])

	const addFromAnnotation = useCallback((annotation: unknown, page: number) => {
		const line = parseLineAnnotation(annotation)
		if (!line) return false

		const lengthPx = lineLengthPx(line)
		// Случайный клик без протяжки измерением не считаем.
		if (lengthPx < 2) return false

		setMeasurements(prev => [
			...prev,
			{
				id: `ruler-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
				line,
				lengthPx,
				page,
			},
		])
		return true
	}, [])

	const remove = useCallback((id: string) => {
		setMeasurements(prev => prev.filter(item => item.id !== id))
	}, [])

	const clear = useCallback(() => setMeasurements([]), [])

	const labelFor = useCallback(
		(measurement: RulerMeasurement, pxPerMm: number | null) => {
			const mm = pxToMm(measurement.lengthPx, pxPerMm)
			return mm == null ? null : formatMm(mm)
		},
		[],
	)

	return { measurements, addFromAnnotation, remove, clear, labelFor }
}
