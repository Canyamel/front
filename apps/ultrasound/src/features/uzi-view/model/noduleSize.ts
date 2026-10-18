/**
 * Размеры узла, которые посчитал бэкенд.
 */

export interface NoduleDimension {
	label: 'ширина' | 'длина' | 'толщина'
	mm: number
}

/** Проекция и доля исследования — запасной источник, если у узла их нет. */
export interface StudyProjection {
	projectionType?: string
	anatomySide?: string
}

/** Положительное число из `details` или `undefined`. */
function positive(details: Record<string, unknown>, key: string): number | undefined {
	const n = Number(details[key])
	return Number.isFinite(n) && n > 0 ? n : undefined
}

/**
 * Поперечная проекция — ширина и толщина, продольная — длина и толщина.
 * Пустой список — бэкенд размеров не прислал (нет масштаба, контур врача).
 */
export function noduleDimensions(
	segmentDetails: object | null | undefined,
	study: StudyProjection = {},
): NoduleDimension[] {
	const details = (segmentDetails ?? {}) as Record<string, unknown>
	const projection = String(details.projection_type || study.projectionType || '').toLowerCase()

	const result: NoduleDimension[] = []
	const push = (label: NoduleDimension['label'], mm: number | undefined) => {
		if (mm != null) result.push({ label, mm })
	}

	if (projection === 'cross') {
		push('ширина', positive(details, 'cross_width_mm'))
		push('толщина', positive(details, 'cross_height_mm'))
	} else if (projection === 'long') {
		// Долю берём у узла, затем у исследования; если нигде нет — ту, для
		// которой бэкенд прислал размеры.
		let side = String(details.anatomy_side || study.anatomySide || '').toLowerCase()
		if (side !== 'left' && side !== 'right') {
			side = ['left', 'right'].find(s => positive(details, `long_${s}_max_dim_mm`) != null) ?? ''
		}
		if (side) {
			push('длина', positive(details, `long_${side}_max_dim_mm`))
			push('толщина', positive(details, `long_${side}_min_dim_mm`))
		}
	}

	return result
}

/** Миллиметры для показа. */
export function formatNoduleMm(mm: number): string {
	return String(Number(mm.toFixed(1)))
}
