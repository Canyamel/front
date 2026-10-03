import type { ViewerAnnotation, ViewerAnnotationStyle, ViewerAnnotationStyleFn } from '@medml/viewers'

import type { ISegmentDetails, ISegmentStack, SegmentType } from '../core/types/segments'
import type { CytologyContourDraft } from '../model/types'

/** Доменные данные контура сегмента: по ним строятся стиль и карточка. */
export interface CytologyAnnotationData {
	ai?: boolean
	seg_type?: SegmentType
	/** Что с сегментом в черновике: новый, изменён или помечен на удаление. */
	draft?: CytologyContourDraft['kind']
	details?: ISegmentDetails
}

/** Контур сегмента на снимке цитологии. */
export type CytologyAnnotation = ViewerAnnotation<CytologyAnnotationData>

/**
 * Сегменты типа `segType` с наложенным черновиком. Изменённые — с новыми точками, новые —
 * под id черновика (он же id контура во вьюере).
 *
 * Удалённый сегмент со снимка не пропадает: в цитологии удаление — пометка
 * в ревизии, её видно на контуре и можно отменить в карточке.
 */
export function buildCytologyAnnotations(
	segments: ISegmentStack[],
	drafts: ReadonlyMap<string, CytologyContourDraft>,
	segType: SegmentType | null,
): CytologyAnnotation[] {
	if (!segType) return []

	const annotations = segments
		.filter(segment => segment.seg_type === segType)
		.map(segment => {
			const id = String(segment.id)
			const draft = drafts.get(id)
			return buildAnnotation(id, draft?.kind === 'update' ? draft.points : segment.points, {
				ai: segment.is_ai,
				seg_type: segment.seg_type,
				draft: draft?.kind,
				details: segment.details,
			})
		})

	drafts.forEach((draft, id) => {
		if (draft.kind === 'create' && draft.data?.segType === segType) {
			annotations.push(buildAnnotation(id, draft.points, { ai: false, seg_type: segType, draft: 'create' }))
		}
	})

	return annotations
}

function buildAnnotation(
	id: string,
	points: ReadonlyArray<{ x: number; y: number }>,
	data: CytologyAnnotationData,
): CytologyAnnotation {
	return { id, points: points.map(point => ({ x: point.x, y: point.y })), data }
}

// --- оформление ---------------------------------------------------------

interface CytologyAnnotationStyleConfig extends ViewerAnnotationStyle {
	hover?: ViewerAnnotationStyle
}

const DRAFT_STYLES: Record<'create' | 'update' | 'delete' | 'default', CytologyAnnotationStyleConfig> = {
	update: { stroke: '#53fa00ff', fill: '#53fa0056', hover: { stroke: '#287800ff', fill: '#28780055' } },
	create: { stroke: '#00d995', fill: '#00d99547', hover: { stroke: '#00d995', fill: '#67d2b56e' } },
	delete: { stroke: '#ff6200', fill: '#f6600b40', hover: { stroke: '#ff6200', fill: '#f6600b82' } },
	default: { stroke: '#00d0fa', fill: '#0dc9f059', hover: { stroke: '#00768e', fill: '#0a99b880' } },
}

const FILL_ALPHA: Record<'muted' | 'create' | 'update' | 'delete' | 'default', [fill: number, hover: number]> = {
	muted: [0.18, 0.24],
	delete: [0.2, 0.3],
	update: [0.42, 0.55],
	create: [0.28, 0.4],
	default: [0.35, 0.5],
}

type HexColor = `#${string}`

export const FALLBACK_SEGMENT_COLOR: HexColor = '#00d995'

export interface CytologyAnnotationStyleOptions {
	isEditing: boolean
	activeType: SegmentType | null
}

/**
 * Оформление контура: цвет — от типа сегмента, прозрачность — от его
 * состояния в черновике. В режиме правки чужие типы и нетронутые сегменты
 * ИИ приглушены — их не правят.
 */
export function createCytologyAnnotationStyle(
	colorsByType: Record<string, string>,
	options: CytologyAnnotationStyleOptions,
): ViewerAnnotationStyleFn<CytologyAnnotationData> {
	return (annotation, state) => {
		const data = annotation.data
		if (!data) return undefined
		const style = resolveStyle(data, colorsByType, options)
		return state.hovered && style.hover ? style.hover : style
	}
}

function resolveStyle(
	data: CytologyAnnotationData,
	colorsByType: Record<string, string>,
	options: CytologyAnnotationStyleOptions,
): CytologyAnnotationStyleConfig {
	const color = data.seg_type ? colorsByType[data.seg_type] : undefined
	if (!color) return DRAFT_STYLES[data.draft ?? 'default']

	const muted = options.isEditing && (data.seg_type !== options.activeType || (Boolean(data.ai) && data.draft == null))
	const [fillAlpha, hoverAlpha] = FILL_ALPHA[muted ? 'muted' : (data.draft ?? 'default')]
	const stroke = normalizeHex6(color) ?? FALLBACK_SEGMENT_COLOR

	return {
		stroke,
		fill: colorToHex8(color, fillAlpha),
		hover: { stroke, fill: colorToHex8(color, hoverAlpha) },
	}
}

function normalizeHex6(color: string): HexColor | null {
	const trimmed = color.trim()

	if (trimmed.startsWith('#')) {
		const hex = trimmed.slice(1)
		if (/^[0-9a-f]{3}$/i.test(hex)) {
			return `#${hex
				.split('')
				.map(c => c + c)
				.join('')}`
		}
		if (/^[0-9a-f]{6}$/i.test(hex)) return `#${hex}`
		if (/^[0-9a-f]{8}$/i.test(hex)) return `#${hex.slice(0, 6)}`
	}

	const rgba = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
	if (rgba) {
		const toHex = (n: number) => n.toString(16).padStart(2, '0')
		return `#${toHex(Number(rgba[1]))}${toHex(Number(rgba[2]))}${toHex(Number(rgba[3]))}`
	}

	return null
}

/** #RRGGBBAA — Annotorious 3.0.x корректно применяет прозрачность только так (не через fillOpacity). */
function colorToHex8(color: string, alpha: number): HexColor {
	const base = normalizeHex6(color) ?? FALLBACK_SEGMENT_COLOR
	const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
		.toString(16)
		.padStart(2, '0')
	return `${base}${a}`
}
