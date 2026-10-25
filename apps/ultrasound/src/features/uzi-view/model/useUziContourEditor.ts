import { useCallback, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { message } from 'antd'
import { useContourDrafts, type ViewerAnnotationApi } from '@medml/viewers'

import { useSaveUziContourDraftsMutation } from '@/api/uziApi'
import { EMPTY_NODE_EDITS, hasNodeEdits, nodeTypeChanges, nodesWithoutContours, type UziNodeEdits } from './nodeEdits'
import type { Segment, SegmentPoint, UziContourDraftData, UziContourDrafts } from './types'

export interface UziContourEditor {
	isEditing: boolean
	isSaving: boolean
	drafts: UziContourDrafts
	/** Смена класса и новые узлы — до сохранения. */
	nodeEdits: UziNodeEdits
	/** Есть несохранённые правки контуров или узлов. */
	hasChanges: boolean
	annotationApiRef: RefObject<ViewerAnnotationApi>
	start: () => void
	cancel: () => void
	save: () => Promise<void>
	setNodeType: (groupId: number, type: number) => void
	/** Новый узел заданного класса; возвращает его временный id. */
	addNode: (type: number) => number
}

export interface UseUziContourEditorOptions {
	uziId: string
	/** Снимок исследования: к нему создаются новые узлы. */
	imageId?: number
	/** Узлы с сервера — чтобы не отправлять класс, который уже стоит. */
	nodules: Segment[]
}

/**
 * Правка узлов на снимке УЗИ: контуры, класс TI-RADS и новые узлы.
 * Всё копится до «Сохранить» и сбрасывается «Отменой».
 */
export function useUziContourEditor({ uziId, imageId, nodules }: UseUziContourEditorOptions): UziContourEditor {
	const [isEditing, setIsEditing] = useState(false)
	const drafts = useContourDrafts<SegmentPoint[], UziContourDraftData>()
	const [nodeEdits, setNodeEdits] = useState<UziNodeEdits>(EMPTY_NODE_EDITS)
	const [saveDrafts, { isLoading: isSaving }] = useSaveUziContourDraftsMutation()
	const annotationApiRef = useRef<ViewerAnnotationApi>(null)

	const nodeEditsRef = useRef(nodeEdits)
	const nodulesRef = useRef(nodules)
	useLayoutEffect(() => {
		nodeEditsRef.current = nodeEdits
		nodulesRef.current = nodules
	})

	// Временные id новых узлов отрицательные: с id сервера не пересекутся.
	const nextNodeIdRef = useRef(-1)

	const { clear, settle, getLatest, create: createDraft } = drafts

	const resetNodeEdits = useCallback(() => {
		nodeEditsRef.current = EMPTY_NODE_EDITS
		setNodeEdits(EMPTY_NODE_EDITS)
	}, [])

	const updateNodeEdits = useCallback((change: (edits: UziNodeEdits) => UziNodeEdits) => {
		const next = change(nodeEditsRef.current)
		nodeEditsRef.current = next
		setNodeEdits(next)
	}, [])

	const start = useCallback(() => {
		clear()
		resetNodeEdits()
		setIsEditing(true)
	}, [clear, resetNodeEdits])

	const cancel = useCallback(() => {
		const hadChanges = getLatest().size > 0 || hasNodeEdits(nodeEditsRef.current)
		clear()
		resetNodeEdits()
		setIsEditing(false)
		if (hadChanges) message.info('Изменения отменены')
	}, [clear, getLatest, resetNodeEdits])

	const setNodeType = useCallback(
		(groupId: number, type: number) =>
			updateNodeEdits(edits => {
				if (groupId < 0) {
					return { ...edits, created: edits.created.map(node => (node.id === groupId ? { ...node, type } : node)) }
				}
				const types = new Map(edits.types)
				const saved = nodulesRef.current.find(segment => segment.id === groupId)?.details?.nodule_type
				if (saved === type) types.delete(groupId)
				else types.set(groupId, type)
				return { ...edits, types }
			}),
		[updateNodeEdits],
	)

	const addNode = useCallback(
		(type: number) => {
			const id = nextNodeIdRef.current
			nextNodeIdRef.current -= 1
			updateNodeEdits(edits => ({ ...edits, created: [...edits.created, { id, type }] }))
			return id
		},
		[updateNodeEdits],
	)

	const save = useCallback(async () => {
		// Правка выделенного контура попадает в черновик сразу, `getLatest` её видит.
		await annotationApiRef.current?.commitSelection()
		const entries = [...getLatest()].map(([key, draft]) => ({ key, draft }))
		const edits = nodeEditsRef.current
		const typeChanges = nodeTypeChanges(nodulesRef.current, edits)
		const emptyNodes = nodesWithoutContours(nodulesRef.current, getLatest())

		if (entries.length === 0 && typeChanges.length === 0 && edits.created.length === 0 && emptyNodes.length === 0) {
			resetNodeEdits()
			setIsEditing(false)
			message.success('Редактирование завершено')
			return
		}

		try {
			const result = await saveDrafts({
				uziId,
				imageId,
				drafts: entries,
				nodeTypes: typeChanges,
				newNodes: edits.created,
				deleteNodes: emptyNodes,
			}).unwrap()
			const { saved, failed, savedTypes, createdNodes, skippedNodes, deletedNodes } = result
			settle(saved)

			// Узел создан, а его контур не сохранился: контур перевешиваем на
			// настоящий id, иначе следующее «Сохранить» создало бы узел ещё раз.
			const realIds = new Map(createdNodes.map(node => [String(node.tempId), node.id]))
			for (const { key, draft } of entries) {
				const real = draft.data?.group != null ? realIds.get(String(draft.data.group)) : undefined
				if (real != null && draft.kind === 'create' && !saved.includes(key)) {
					createDraft(key, draft.points, { ...draft.data, group: real })
				}
			}

			const done = new Set([...createdNodes.map(node => node.tempId), ...skippedNodes])
			updateNodeEdits(current => {
				const types = new Map(current.types)
				savedTypes.forEach(id => types.delete(id))
				return { types, created: current.created.filter(node => !done.has(node.id)) }
			})

			if (deletedNodes.length > 0) {
				message.info(
					deletedNodes.length === 1
						? 'Узел без контуров удалён'
						: `Удалено узлов без контуров: ${deletedNodes.length}`,
				)
			}

			if (skippedNodes.length > 0) {
				message.warning(
					skippedNodes.length === 1
						? 'Новый узел без контура не сохранён'
						: `Новые узлы без контура не сохранены: ${skippedNodes.length}`,
				)
			}

			if (failed.length === 0) {
				resetNodeEdits()
				setIsEditing(false)
				message.success('Изменения сохранены')
				return
			}

			console.error('Не сохранено:', failed)
			const [first] = failed
			message.error(
				failed.length === 1
					? `Не сохранено: ${first.message}`
					: `Не сохранено изменений: ${failed.length}. ${first.message}`,
			)
		} catch (error) {
			console.error('Ошибка сохранения разметки:', error)
			message.error('Ошибка при сохранении изменений')
		}
	}, [getLatest, saveDrafts, settle, createDraft, updateNodeEdits, resetNodeEdits, uziId, imageId])

	const hasChanges = drafts.hasChanges || hasNodeEdits(nodeEdits)

	return useMemo(
		() => ({
			isEditing,
			isSaving,
			drafts,
			nodeEdits,
			hasChanges,
			annotationApiRef,
			start,
			cancel,
			save,
			setNodeType,
			addNode,
		}),
		[isEditing, isSaving, drafts, nodeEdits, hasChanges, start, cancel, save, setNodeType, addNode],
	)
}
