import { useCallback, useMemo, useRef, useState, type RefObject } from 'react'
import { message } from 'antd'
import { useContourDrafts, type ViewerAnnotationApi } from '@medml/viewers'

import { useSaveUziContourDraftsMutation } from '@/api/uziApi'
import type { SegmentPoint, UziContourDraftData, UziContourDrafts } from './types'

export interface UziContourEditor {
	isEditing: boolean
	isSaving: boolean
	drafts: UziContourDrafts
	annotationApiRef: RefObject<ViewerAnnotationApi>
	start: () => void
	cancel: () => void
	save: () => Promise<void>
}

/**
 * Правка контуров узлов на снимке УЗИ.
 */
export function useUziContourEditor({ uziId }: { uziId: string }): UziContourEditor {
	const [isEditing, setIsEditing] = useState(false)
	const drafts = useContourDrafts<SegmentPoint[], UziContourDraftData>()
	const [saveDrafts, { isLoading: isSaving }] = useSaveUziContourDraftsMutation()
	const annotationApiRef = useRef<ViewerAnnotationApi>(null)

	const { clear, settle, getLatest } = drafts

	const start = useCallback(() => {
		clear()
		setIsEditing(true)
	}, [clear])

	const cancel = useCallback(() => {
		const hadChanges = getLatest().size > 0
		clear()
		setIsEditing(false)
		if (hadChanges) message.info('Изменения контуров отменены')
	}, [clear, getLatest])

	const save = useCallback(async () => {
		// Правка выделенного контура попадает в черновик сразу, `getLatest` её видит.
		await annotationApiRef.current?.commitSelection()
		const entries = [...getLatest()].map(([key, draft]) => ({ key, draft }))
		if (entries.length === 0) {
			setIsEditing(false)
			message.success('Редактирование контуров завершено')
			return
		}

		try {
			const { saved, failed } = await saveDrafts({ uziId, drafts: entries }).unwrap()
			settle(saved)

			if (failed.length === 0) {
				setIsEditing(false)
				message.success('Контуры сохранены')
				return
			}

			console.error('Не сохранены контуры:', failed)
			const [first] = failed
			message.error(
				failed.length === 1
					? `Контур не сохранён: ${first.message}`
					: `Не сохранено контуров: ${failed.length} из ${entries.length}. ${first.message}`,
			)
		} catch (error) {
			console.error('Ошибка сохранения контуров:', error)
			message.error('Ошибка при сохранении контуров')
		}
	}, [getLatest, saveDrafts, settle, uziId])

	return useMemo(
		() => ({ isEditing, isSaving, drafts, annotationApiRef, start, cancel, save }),
		[isEditing, isSaving, drafts, start, cancel, save],
	)
}
