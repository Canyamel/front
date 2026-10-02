import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { UserSelectAction, createOSDAnnotator } from '@annotorious/openseadragon'
import type {
	AnnotationState,
	DrawingStyle,
	ImageAnnotation,
	OpenSeadragonAnnotator,
	Selection,
	StoreChangeEvent,
} from '@annotorious/openseadragon'
// Без этих стилей холст с контурами не ложится поверх снимка — разметки не видно.
import '@annotorious/openseadragon/annotorious-openseadragon.css'

import type { PlanePoint } from '../geometry'
import type { ViewerInstance } from '../uzi-viewer/types'
import { isDrawingTool, type ViewerToolId } from '../study-viewer/tools'
import { annotationSignature, fromStoredAnnotation, toStoredAnnotation, type StoredAnnotation } from './annotorious'
import type { ViewerAnnotation, ViewerAnnotationChange, ViewerAnnotationLayer, ViewerAnnotationStyleFn } from './types'

type Annotator = OpenSeadragonAnnotator<ImageAnnotation, ImageAnnotation>

/**
 * Изменения, которые мы вносим сами (синхронизация с данными приложения),
 * помечаются как «удалённые»: Annotorious 3 не шлёт на них событий
 * create/update/delete. События остаются только на действия врача.
 * Enum `Origin` пакет наружу не отдаёт, поэтому значение строкой.
 */
const REMOTE = 'REMOTE' as never

/**
 * После снятия выделения Annotorious 3 сообщает о правке не сразу, а через
 * `setTimeout` — ждём с запасом.
 */
const SELECTION_COMMIT_DELAY_MS = 30

function makeDraftId(): string {
	return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export interface UseAnnotoriousLayerOptions<D> {
	/** Подключать ли Annotorious вообще. */
	enabled: boolean
	/** Контуры, которые сейчас должны быть на снимке (обычно — текущий кадр). */
	annotations: ViewerAnnotation<D>[]
	readOnly: boolean
	/**
	 * Доменное разрешение рисовать. Например, в цитологии контур некуда
	 * сохранить, пока не выбран тип сегмента.
	 */
	canDraw: boolean
	style?: ViewerAnnotationStyleFn<D>
	/** Данные для только что нарисованного контура (узел, тип сегмента). */
	createData?: () => D | undefined
	onChange?: (change: ViewerAnnotationChange<D>) => void
}

export interface AnnotoriousLayer<D> {
	layer: ViewerAnnotationLayer
	selected: ViewerAnnotation<D> | null
	setTool: (tool: ViewerToolId, enabled: boolean) => void
	/** Готовый контур не от Annotorious (кисть). `false` — сохранить некуда. */
	addPolygon: (points: PlanePoint[]) => boolean
	remove: (id: string) => void
	commitSelection: () => Promise<void>
}

/**
 * Annotorious 3 поверх инстанса OpenSeadragon — один на УЗИ и цитологию.
 *
 * Приложение отдаёт список контуров, слой приводит к нему содержимое
 * Annotorious **разницей**: добавляет новые, обновляет изменившиеся, убирает
 * лишние. Полная замена (`setAnnotations(list, true)`) не годится: при
 * совпадающих id Annotorious 3 сначала рисует новую графику, потом удаляет
 * старую — и вместе с ней новую, а старая остаётся «призраком». И
 * `clearAnnotations()` не годится: он шлёт `deleteAnnotation` на каждый
 * контур, приложение приняло бы это за удаление врачом.
 *
 * Обратно — события врача: нарисовал, поправил, удалил.
 */
export function useAnnotoriousLayer<D>({
	enabled,
	annotations,
	readOnly,
	canDraw,
	style,
	createData,
	onChange,
}: UseAnnotoriousLayerOptions<D>): AnnotoriousLayer<D> {
	const annoRef = useRef<Annotator | null>(null)
	const cleanupRef = useRef<(() => void) | null>(null)
	const [annotator, setAnnotator] = useState<Annotator | null>(null)
	const [selectedId, setSelectedId] = useState<string | null>(null)
	// Выделенный контур меняет форму, пока его правят, — карточка должна ехать
	// за ним. Версия хранилища перечитывает его при любом изменении.
	const [storeVersion, setStoreVersion] = useState(0)

	// Обработчики Annotorious вешаются один раз на инстанс, свежие значения
	// они читают через ref.
	const readOnlyRef = useRef(readOnly)
	const canDrawRef = useRef(canDraw)
	const styleRef = useRef(style)
	const createDataRef = useRef(createData)
	const onChangeRef = useRef(onChange)
	const annotationsRef = useRef(annotations)
	const toolRef = useRef<{ tool: ViewerToolId; enabled: boolean }>({ tool: 'pan', enabled: false })

	useLayoutEffect(() => {
		readOnlyRef.current = readOnly
		canDrawRef.current = canDraw
		styleRef.current = style
		createDataRef.current = createData
		onChangeRef.current = onChange
		annotationsRef.current = annotations
	})

	const applyTool = useCallback(() => {
		const anno = annoRef.current
		if (!anno) return
		const { tool, enabled: toolEnabled } = toolRef.current
		// Рисовать можно только инструментами самого Annotorious и только в
		// режиме правки; на навигации, кисти и линейке рисование выключено,
		// иначе Annotorious забирает перетаскивание себе.
		const drawing = toolEnabled && isDrawingTool(tool) && canDrawRef.current && !readOnlyRef.current
		try {
			if (drawing) anno.setDrawingTool(tool as never)
			anno.setDrawingEnabled(drawing)
		} catch (error) {
			console.error(`Не удалось включить инструмент «${tool}»:`, error)
		}
	}, [])

	/** Привести содержимое Annotorious к списку приложения. */
	const sync = useCallback((list: ViewerAnnotation<D>[]) => {
		const anno = annoRef.current
		if (!anno) return
		const store = anno.state.store

		const desired = new Map(list.map(item => [item.id, item]))
		const current = new Map(store.all().map(item => [item.id, item as StoredAnnotation<D>]))

		const toDelete = [...current.keys()].filter(id => !desired.has(id))
		const toAdd: StoredAnnotation<D>[] = []
		const toUpdate: StoredAnnotation<D>[] = []

		desired.forEach((item, id) => {
			const existing = current.get(id)
			if (!existing) {
				toAdd.push(toStoredAnnotation(item))
			} else if (annotationSignature(fromStoredAnnotation(existing)) !== annotationSignature(item)) {
				toUpdate.push(toStoredAnnotation(item))
			}
		})

		if (toDelete.length === 0 && toAdd.length === 0 && toUpdate.length === 0) return

		try {
			// Уходящий выделенный контур сначала отпускаем: Annotorious досылает
			// по нему несохранённую правку, приложение её учтёт.
			const selected = anno.getSelected().map(item => item.id)
			if (selected.some(id => toDelete.includes(id))) anno.cancelSelected()

			if (toDelete.length > 0) store.bulkDeleteAnnotation(toDelete, REMOTE)
			if (toUpdate.length > 0) store.bulkUpdateAnnotation(toUpdate as ImageAnnotation[], REMOTE)
			if (toAdd.length > 0) store.bulkAddAnnotation(toAdd as ImageAnnotation[], false, REMOTE)
		} catch (error) {
			console.error('Не удалось обновить разметку снимка:', error)
		}
	}, [])

	const emit = useCallback((change: ViewerAnnotationChange<D>) => {
		try {
			onChangeRef.current?.(change)
		} catch (error) {
			console.error('Ошибка обработки изменения разметки:', error)
		}
	}, [])

	const detach = useCallback(() => {
		cleanupRef.current?.()
		cleanupRef.current = null
		const instance = annoRef.current
		annoRef.current = null
		setAnnotator(null)
		setSelectedId(null)
		if (!instance) return
		try {
			instance.destroy()
		} catch (error) {
			console.warn('Не удалось отключить разметку:', error)
		}
	}, [])

	const attach = useCallback(
		(viewer: ViewerInstance) => {
			// Один инстанс движка — один аннотатор.
			if (annoRef.current?.viewer === viewer) return
			detach()

			const instance = createOSDAnnotator<ImageAnnotation, ImageAnnotation>(viewer, {
				drawingEnabled: false,
				userSelectAction: (annotation: ImageAnnotation) =>
					readOnlyRef.current || (annotation as StoredAnnotation<D>).properties?.editable === false
						? UserSelectAction.SELECT
						: UserSelectAction.EDIT,
			})
			annoRef.current = instance

			instance.on('createAnnotation', (created: ImageAnnotation) => {
				const data = createDataRef.current?.()
				const annotation = { ...fromStoredAnnotation(created as StoredAnnotation<D>), data }
				// Данные кладём прямо на нарисованный контур: стиль и карточка
				// видят их сразу, не дожидаясь ответного списка от приложения.
				if (data !== undefined) {
					instance.state.store.updateAnnotation(
						{ ...created, properties: { data } } as StoredAnnotation<D> as ImageAnnotation,
						REMOTE,
					)
				}
				emit({ type: 'create', annotation })
			})

			instance.on('updateAnnotation', (updated: ImageAnnotation) => {
				// В хранилище уже новая форма и наши данные контура.
				const stored = (instance.state.store.getAnnotation(updated.id) ?? updated) as StoredAnnotation<D>
				emit({ type: 'update', annotation: fromStoredAnnotation(stored) })
			})

			instance.on('deleteAnnotation', (deleted: ImageAnnotation) => {
				emit({ type: 'delete', annotation: fromStoredAnnotation(deleted as StoredAnnotation<D>) })
			})

			const unsubscribeSelection = instance.state.selection.subscribe((selection: Selection) => {
				setSelectedId(selection.selected?.[0]?.id ?? null)
			})
			const onStoreChange = (_event: StoreChangeEvent<ImageAnnotation>) => setStoreVersion(v => v + 1)
			instance.state.store.observe(onStoreChange)

			cleanupRef.current = () => {
				unsubscribeSelection()
				instance.state.store.unobserve(onStoreChange)
			}

			sync(annotationsRef.current)
			applyTool()
			setAnnotator(instance)
		},
		[applyTool, detach, emit, sync],
	)

	// Отключённый слой (у приложения нет разметки) уходит со снимка.
	useEffect(() => {
		if (!enabled) detach()
	}, [enabled, detach])

	useEffect(() => detach, [detach])

	useEffect(() => {
		if (annotator) sync(annotations)
	}, [annotator, annotations, sync])

	// Стиль задаём функцией-обёрткой: новая обёртка заставляет Annotorious
	// перерисовать контуры, а читает она всегда свежий `style` из ref.
	useEffect(() => {
		if (!annotator) return
		annotator.setStyle((annotation: ImageAnnotation, state?: AnnotationState) => {
			const fn = styleRef.current
			if (!fn) return undefined as unknown as DrawingStyle
			return fn(fromStoredAnnotation(annotation as StoredAnnotation<D>), {
				selected: Boolean(state?.selected),
				hovered: Boolean(state?.hovered),
			}) as DrawingStyle
		})
	}, [annotator, style])

	// Выход из режима правки: снимаем выделение, чтобы ушли маркеры правки и
	// досохранилась незаконченная правка.
	useEffect(() => {
		if (!annotator) return
		if (readOnly && annotator.getSelected().length > 0) annotator.cancelSelected()
		applyTool()
	}, [annotator, readOnly, canDraw, applyTool])

	const setTool = useCallback(
		(tool: ViewerToolId, toolEnabled: boolean) => {
			toolRef.current = { tool, enabled: toolEnabled }
			applyTool()
		},
		[applyTool],
	)

	const addPolygon = useCallback(
		(points: PlanePoint[]) => {
			const anno = annoRef.current
			if (!anno || points.length < 3 || readOnlyRef.current || !canDrawRef.current) return false

			const annotation: ViewerAnnotation<D> = {
				id: makeDraftId(),
				points: points.map(point => ({ x: Math.round(point.x), y: Math.round(point.y) })),
				data: createDataRef.current?.(),
			}
			try {
				anno.state.store.addAnnotation(toStoredAnnotation(annotation) as ImageAnnotation, REMOTE)
			} catch (error) {
				console.error('Не удалось добавить контур:', error)
				return false
			}
			emit({ type: 'create', annotation })
			return true
		},
		[emit],
	)

	const remove = useCallback((id: string) => {
		const anno = annoRef.current
		if (!anno || readOnlyRef.current) return
		if (anno.getSelected().some(item => item.id === id)) anno.cancelSelected()
		// Удаление «от врача»: придёт обычное событие `deleteAnnotation`.
		anno.removeAnnotation(id)
	}, [])

	const commitSelection = useCallback(async () => {
		const anno = annoRef.current
		if (!anno || anno.getSelected().length === 0) return
		anno.cancelSelected()
		await new Promise(resolve => setTimeout(resolve, SELECTION_COMMIT_DELAY_MS))
	}, [])

	const selected = useMemo<ViewerAnnotation<D> | null>(() => {
		if (!annotator || !selectedId) return null
		const stored = annotator.state.store.getAnnotation(selectedId) as StoredAnnotation<D> | undefined
		return stored ? fromStoredAnnotation(stored) : null
		// storeVersion — сигнал, что контур поменялся внутри Annotorious.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [annotator, selectedId, storeVersion])

	const layer = useMemo<ViewerAnnotationLayer>(() => ({ attach, detach }), [attach, detach])

	return { layer, selected, setTool, addPolygon, remove, commitSelection }
}
