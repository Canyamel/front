import React from 'react'
import { elementToImagePoint, imageToElementPoint } from '../uzi-viewer/coords'
import type { ViewerInstance } from '../uzi-viewer/types'
import type { PlanePoint } from '../geometry'
import { lineLabelAnchor, lineLengthPx } from './measurement'
import type { MeasuredLine } from './measurement'
import type { RulerMeasurement } from './useRulerMeasurements'

export interface RulerOverlayProps {
	viewer: ViewerInstance | null
	/** Слой перехватывает мышь только когда линейка выбрана. */
	active: boolean
	measurements: RulerMeasurement[]
	currentPage: number
	pxPerMm: number | null
	labelFor: (measurement: RulerMeasurement, pxPerMm: number | null) => string | null
	onAdd: (line: MeasuredLine, page: number) => void
	onRemove: (id: string) => void
}

const LINE_COLOR = '#06B6D4'
const DRAFT_COLOR = '#22D3EE'

/**
 * Подписи — белые с тёмной обводкой: снимок бывает и светлым, и тёмным, а
 * `paintOrder: 'stroke'` кладёт обводку под заливку, поэтому текст читается в
 * обоих случаях. Стили инлайновые: пакет визуализации не поставляет css,
 * чтобы приложениям не приходилось подключать его отдельно.
 */
const LABEL_STYLE: React.CSSProperties = {
	fontSize: 13,
	fontWeight: 600,
	fill: '#ffffff',
	paintOrder: 'stroke',
	stroke: 'rgba(15, 23, 42, 0.85)',
	strokeWidth: 3.5,
	strokeLinejoin: 'round',
	pointerEvents: 'none',
	userSelect: 'none',
}

const HINT_STYLE: React.CSSProperties = {
	...LABEL_STYLE,
	fontSize: 11,
	fontWeight: 500,
	strokeWidth: 3,
}

/**
 * Линейка: рисование отрезков и их подписи в мм.
 *
 * Слой полностью самостоятельный — библиотека разметки здесь не участвует.
 * Через плагин линейка работала ровно один раз: после первого же
 * `createAnnotation` он выходил из режима рисования, и протяжка снова двигала
 * снимок. Плюс руббербенд рисует сам плагин, поэтому показать длину прямо во
 * время протяжки было нечем.
 *
 * Именно поэтому слой живёт в `@medml/viewers`, а не рядом с конкретным
 * движком разметки: ему нужен только инстанс OSD для пересчёта координат,
 * поэтому он одинаково работает и над Annotorious 2 (УЗИ), и над
 * Annotorious 3 (цитология).
 *
 * Координаты храним в системе снимка и пересчитываем в экранные на каждое
 * движение вьюпорта — так линии держатся за изображение при зуме.
 */
const RulerOverlay: React.FC<RulerOverlayProps> = ({
	viewer,
	active,
	measurements,
	currentPage,
	pxPerMm,
	labelFor,
	onAdd,
	onRemove,
}) => {
	const rootRef = React.useRef<SVGSVGElement>(null)

	// Отрезок, который сейчас тянут, и позиция курсора до начала протяжки:
	// без видимой точки старта неочевидно, что нужно зажать кнопку.
	const [draft, setDraft] = React.useState<{ start: PlanePoint; end: PlanePoint } | null>(null)
	const [hover, setHover] = React.useState<PlanePoint | null>(null)

	// Своего состояния для позиций нет — на движение вьюпорта просто
	// заставляем слой перерисоваться.
	const [, forceRedraw] = React.useReducer((x: number) => x + 1, 0)

	React.useEffect(() => {
		if (!viewer) return

		const handler = () => forceRedraw()
		viewer.addHandler('animation', handler)
		viewer.addHandler('resize', handler)
		viewer.addHandler('open', handler)

		return () => {
			viewer.removeHandler('animation', handler)
			viewer.removeHandler('resize', handler)
			viewer.removeHandler('open', handler)
		}
	}, [viewer])

	// Инструмент сменили — недорисованный отрезок и курсор сбрасываем.
	React.useEffect(() => {
		if (!active) {
			setDraft(null)
			setHover(null)
		}
	}, [active])

	const toImagePoint = React.useCallback(
		(clientX: number, clientY: number): PlanePoint | null => {
			const root = rootRef.current
			if (!viewer || !root) return null

			const rect = root.getBoundingClientRect()
			return elementToImagePoint(viewer, clientX - rect.left, clientY - rect.top)
		},
		[viewer],
	)

	const toElement = React.useCallback(
		(point: PlanePoint) => (viewer ? imageToElementPoint(viewer, point.x, point.y) : null),
		[viewer],
	)

	const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
		// Только левая кнопка: правой и средней пусть управляет OSD.
		if (event.button !== 0) return

		const point = toImagePoint(event.clientX, event.clientY)
		if (!point) return

		event.currentTarget.setPointerCapture(event.pointerId)
		setDraft({ start: point, end: point })
	}

	const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
		const point = toImagePoint(event.clientX, event.clientY)
		if (!point) return

		setHover(point)
		setDraft(prev => (prev ? { start: prev.start, end: point } : null))
	}

	const finishStroke = (event: React.PointerEvent<SVGSVGElement>) => {
		try {
			event.currentTarget.releasePointerCapture(event.pointerId)
		} catch {
			/* указатель мог быть уже отпущен */
		}

		if (!draft) return
		setDraft(null)

		const line: MeasuredLine = {
			x1: draft.start.x,
			y1: draft.start.y,
			x2: draft.end.x,
			y2: draft.end.y,
		}
		// Одиночный клик без протяжки измерением не считаем.
		if (lineLengthPx(line) < 2) return

		onAdd(line, currentPage)
	}

	if (!viewer) return null

	const visible = measurements.filter(item => item.page === currentPage)
	if (!active && visible.length === 0) return null

	const draftLine: MeasuredLine | null = draft
		? { x1: draft.start.x, y1: draft.start.y, x2: draft.end.x, y2: draft.end.y }
		: null

	return (
		<svg
			ref={rootRef}
			className='medml-viewer-ruler-layer'
			style={{
				position: 'absolute',
				inset: 0,
				width: '100%',
				height: '100%',
				zIndex: 950,
				// В неактивном состоянии слой сквозной: он не должен мешать
				// ни разметке, ни панорамированию.
				pointerEvents: active ? 'auto' : 'none',
				cursor: active ? 'crosshair' : undefined,
				touchAction: active ? 'none' : undefined,
			}}
			onPointerDown={active ? handlePointerDown : undefined}
			onPointerMove={active ? handlePointerMove : undefined}
			onPointerUp={active ? finishStroke : undefined}
			onPointerCancel={active ? finishStroke : undefined}
			onPointerLeave={active ? () => setHover(null) : undefined}
		>
			{visible.map(measurement => (
				<MeasurementShape
					key={measurement.id}
					line={measurement.line}
					label={labelFor(measurement, pxPerMm)}
					toElement={toElement}
					onRemove={() => onRemove(measurement.id)}
				/>
			))}

			{/* Отрезок в процессе построения — с живой подписью. */}
			{draftLine && (
				<MeasurementShape
					line={draftLine}
					label={labelFor(
						{ id: 'draft', line: draftLine, lengthPx: lineLengthPx(draftLine), page: currentPage },
						pxPerMm,
					)}
					toElement={toElement}
					color={DRAFT_COLOR}
					dashed
				/>
			)}

			{/* Точка под курсором: показывает, откуда начнётся отрезок. */}
			{active && !draft && hover && <HoverCursor point={hover} toElement={toElement} />}
		</svg>
	)
}

interface MeasurementShapeProps {
	line: MeasuredLine
	label: string | null
	toElement: (point: PlanePoint) => PlanePoint | null
	color?: string
	dashed?: boolean
	onRemove?: () => void
}

/** Отрезок с засечками, подписью и (для сохранённых) крестиком удаления. */
const MeasurementShape: React.FC<MeasurementShapeProps> = ({
	line,
	label,
	toElement,
	color = LINE_COLOR,
	dashed = false,
	onRemove,
}) => {
	const start = toElement({ x: line.x1, y: line.y1 })
	const end = toElement({ x: line.x2, y: line.y2 })
	if (!start || !end) return null

	const anchorImage = lineLabelAnchor(line, 16)
	const anchor = toElement({ x: anchorImage.x, y: anchorImage.y })

	return (
		<g>
			<line
				x1={start.x}
				y1={start.y}
				x2={end.x}
				y2={end.y}
				stroke={color}
				strokeWidth={2}
				strokeLinecap='round'
				strokeDasharray={dashed ? '6 4' : undefined}
			/>

			{[start, end].map((point, index) => (
				<circle
					key={index}
					cx={point.x}
					cy={point.y}
					r={4}
					fill='#FFFFFF'
					stroke={color}
					strokeWidth={2}
				/>
			))}

			{label && anchor && (
				<text
					x={anchor.x}
					y={anchor.y}
					textAnchor='middle'
					dominantBaseline='middle'
					style={LABEL_STYLE}
					transform={`rotate(${anchorImage.angleDeg} ${anchor.x} ${anchor.y})`}
				>
					{label}
				</text>
			)}

			{onRemove && (
				<g
					style={{ cursor: 'pointer', pointerEvents: 'auto' }}
					onPointerDown={event => event.stopPropagation()}
					onClick={onRemove}
				>
					<circle cx={end.x + 14} cy={end.y - 14} r={9} fill='#E11D48' />
					<text
						x={end.x + 14}
						y={end.y - 14}
						textAnchor='middle'
						dominantBaseline='central'
						fill='#FFFFFF'
						fontSize={12}
						fontWeight='bold'
					>
						×
					</text>
				</g>
			)}
		</g>
	)
}

/** Прицел под курсором — иначе непонятно, что нужно зажать и протянуть. */
const HoverCursor: React.FC<{
	point: PlanePoint
	toElement: (point: PlanePoint) => PlanePoint | null
}> = ({ point, toElement }) => {
	const at = toElement(point)
	if (!at) return null

	return (
		<g pointerEvents='none'>
			<circle cx={at.x} cy={at.y} r={5} fill='none' stroke={LINE_COLOR} strokeWidth={2} />
			<circle cx={at.x} cy={at.y} r={1.5} fill={LINE_COLOR} />
			<text x={at.x + 14} y={at.y - 12} style={HINT_STYLE}>
				Зажмите и протяните
			</text>
		</g>
	)
}

export default RulerOverlay
