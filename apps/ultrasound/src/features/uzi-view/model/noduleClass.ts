import type { SegmentDetails } from './types'

interface NoduleLike {
	is_ai?: boolean
	details?: SegmentDetails
}

/** Категорию TI-RADS поставил специалист.*/
export function isClassSetByDoctor(segment: NoduleLike | undefined): boolean {
	if (!segment) return false
	if (!segment.is_ai) return true
	const aiType = segment.details?.ai_nodule_type
	return aiType != null && aiType !== segment.details?.nodule_type
}

/** Вероятности категорий от ассистента; старые исследования пишут их как `tirads_N`. */
const PROBABILITY_KEYS: Array<[number, Array<keyof SegmentDetails | 'tirads_2' | 'tirads_3'>]> = [
	[2, ['nodule_2', 'tirads_2']],
	[3, ['nodule_3', 'tirads_3']],
	[4, ['nodule_4']],
	[5, ['nodule_5']],
]

export interface AiClassProbability {
	type: number
	/** 0..1 */
	probability: number
}

export function aiClassProbabilities(details: SegmentDetails | undefined): AiClassProbability[] {
	const source = (details ?? {}) as Record<string, unknown>
	return PROBABILITY_KEYS.flatMap(([type, keys]) => {
		const value = keys.map(key => source[key]).find(item => typeof item === 'number' && Number.isFinite(item))
		return typeof value === 'number' ? [{ type, probability: value }] : []
	})
}

/** Категория, в которой ассистент уверен больше всего; `undefined` — вероятностей нет. */
export function topAiClass(details: SegmentDetails | undefined): AiClassProbability | undefined {
	const best = aiClassProbabilities(details).reduce<AiClassProbability | undefined>(
		(top, item) => (top == null || item.probability > top.probability ? item : top),
		undefined,
	)
	return best && best.probability > 0 ? best : undefined
}

export function formatPercent(value: number): string {
	return `${(value * 100).toFixed(1)}%`
}
