import type { Segment, UziContourDraft } from './types'
import { applyUziContourDrafts, hasDrawableFrame, type DisplaySegment } from '../viewer/uziAnnotations'

/** Классы TI-RADS, которые врач может поставить узлу. */
export const TIRADS_CLASSES = [2, 3, 4, 5] as const

export const TIRADS_OPTIONS = TIRADS_CLASSES.map(type => ({ value: type, label: `TI-RADS ${type}` }))

/** Узел, который врач добавил, но ещё не сохранил. */
export interface NewUziNode {
	id: number
	type: number
}

/** Несохранённые правки узлов. */
export interface UziNodeEdits {
	types: ReadonlyMap<number, number>
	created: readonly NewUziNode[]
}

/** Смена класса узла в запросе сохранения. */
export interface UziNodeTypeChange {
	id: number
	type: number
	aiType?: number
}

export const EMPTY_NODE_EDITS: UziNodeEdits = { types: new Map(), created: [] }

export function isNewNodeId(id: string | number | null | undefined): boolean {
	return id != null && Number(id) < 0
}

export function hasNodeEdits(edits: UziNodeEdits): boolean {
	return edits.types.size > 0 || edits.created.length > 0
}

/** Узлы с правками врача: новый класс и ещё не сохранённые узлы в конце списка. */
export function applyNodeEdits(segments: Segment[], edits: UziNodeEdits): Segment[] {
	if (!hasNodeEdits(edits)) return segments

	const changed = segments.map(segment => {
		const type = edits.types.get(segment.id)
		if (type == null) return segment
		// Как после сохранения: категория ассистента запоминается.
		const aiType = segment.details?.ai_nodule_type ?? (segment.is_ai ? segment.details?.nodule_type : undefined)
		return { ...segment, details: { ...segment.details, nodule_type: type, ai_nodule_type: aiType } }
	})
	const created = edits.created.map(
		(node): Segment => ({
			id: node.id,
			is_ai: false,
			details: { source_type: 'nodule', nodule_type: node.type },
			data: [],
		}),
	)
	return [...changed, ...created]
}

function hasContours(segment: DisplaySegment | undefined): boolean {
	return (segment?.data ?? []).some(contour => hasDrawableFrame(contour.points ?? []))
}

/**
 * Сохранённые узлы, у которых после правок не останется ни одного контура
 * ни на одном кадре, — их удаляем вместе с контурами. Узел, у которого
 * контур есть хотя бы на одном кадре кинопетли, остаётся.
 *
 * Узел врача без контуров удаляется, даже если контуры стёрли раньше:
 * без контура он только висит в легенде. Узел ассистента без контуров
 * с сервера (старые исследования) не трогаем — только если контуры стёрли сейчас.
 */
export function nodesWithoutContours(segments: Segment[], drafts: ReadonlyMap<string, UziContourDraft>): number[] {
	return applyUziContourDrafts(segments, drafts)
		.filter(segment => segment.id > 0 && !hasContours(segment))
		.filter(segment => !segment.is_ai || hasContours(segments.find(item => item.id === segment.id)))
		.map(segment => segment.id)
}

/** Изменения классов для запроса; правки, вернувшие узлу его класс, отбрасываются. */
export function nodeTypeChanges(segments: Segment[], edits: UziNodeEdits): UziNodeTypeChange[] {
	const changes: UziNodeTypeChange[] = []
	edits.types.forEach((type, id) => {
		const segment = segments.find(item => item.id === id)
		if (!segment || segment.details?.nodule_type === type) return

		const current = segment.details?.nodule_type
		const keepAiType = segment.is_ai && segment.details?.ai_nodule_type == null && current != null
		changes.push({ id, type, ...(keepAiType ? { aiType: current } : {}) })
	})
	return changes
}
