import { useCallback, useMemo, useRef, useState, type RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import { message } from 'antd'
import { useContourDrafts, type ViewerAnnotationApi } from '@medml/viewers'

import { CYTOLOGY_INFO_DRAFT_KEY } from '@/lib/cytologyApi'

import { useSaveCytologyRevisionMutation } from '../core/service/cytology'
import type { ICytologyInfoPatch } from '../core/types/cytology'
import type { IPoint, ISegmentStack } from '../core/types/segments'
import type { CytologyContourDraftData, CytologyContourDrafts } from './types'

export interface CytologyContourEditor {
	isEditing: boolean
	isSaving: boolean
	drafts: CytologyContourDrafts
	annotationApiRef: RefObject<ViewerAnnotationApi>
	editedInfo: ICytologyInfoPatch | null
	setEditedInfo: (info: ICytologyInfoPatch) => void
	hasChanges: boolean
	start: () => void
	cancel: () => void
	save: () => Promise<void>
}

export interface UseCytologyContourEditorOptions {
	cytologyId: string
	segments: ISegmentStack[]
}

/**
 * Правка разметки цитологии: черновик правок поверх данных сервера и одна мутация на сохранение.
 *
 * Отличие в бэкенде: исследование не правится на месте, правки сохраняются
 * новой ревизией (`saveCytologyRevision`), и после сохранения страница
 * переходит на неё. Без правок ревизия не создаётся.
 */
export function useCytologyContourEditor({
	cytologyId,
	segments,
}: UseCytologyContourEditorOptions): CytologyContourEditor {
	const navigate = useNavigate()
	const [isEditing, setIsEditing] = useState(false)
	const [editedInfo, setEditedInfo] = useState<ICytologyInfoPatch | null>(null)
	const drafts = useContourDrafts<IPoint[], CytologyContourDraftData>()
	const [saveRevision, { isLoading: isSaving }] = useSaveCytologyRevisionMutation()
	const annotationApiRef = useRef<ViewerAnnotationApi>(null)

	const { clear, getLatest } = drafts
	/*
	 * Ревизия снимается с того же id, по которому открыта страница.
	 *
	 * Раньше здесь стоял `info?.id`, но это другой id: в ответе шлюза это
	 * числовой `info.image_group.id`, а `POST /cytology/copy` ждёт uuid
	 * исследования (у Django оба совпадали, поэтому расхождение не всплывало).
	 * Шлюз отбивал такой запрос ошибкой про `id`, и правки не сохранялись.
	 */
	const sourceId = cytologyId

	const reset = useCallback(() => {
		clear()
		setEditedInfo(null)
	}, [clear])

	const start = useCallback(() => {
		reset()
		setIsEditing(true)
	}, [reset])

	const cancel = useCallback(() => {
		reset()
		setIsEditing(false)
	}, [reset])

	const save = useCallback(async () => {
		// Правка выделенного контура попадает в черновик сразу, `getLatest` её видит.
		await annotationApiRef.current?.commitSelection()
		const entries = [...getLatest()].map(([key, draft]) => ({ key, draft }))
		if (entries.length === 0 && !editedInfo) {
			setIsEditing(false)
			message.info('Изменений нет — ревизия не создана')
			return
		}

		try {
			const { revisionId, saved, failed } = await saveRevision({
				sourceId,
				sourceSegments: segments,
				drafts: entries,
				// Внутри `editedInfo` уже есть `diagnostic_number` — шлюз требует его
				// в каждом PATCH заключения, см. `prepareCytologyInfo`.
				info: editedInfo ? { ...editedInfo } : undefined,
			}).unwrap()

			if (saved.length === 0 && failed.length > 0) {
				/*
				 * Ревизия создалась, но ни одна правка в неё не легла — обычно
				 * потому, что у текущего бэкенда нет ручек правки сегментов.
				 * Остаёмся на странице и сохраняем черновик: врач не теряет
				 * работу и может повторить, когда бэкенд её примет.
				 */
				console.error('Правки не попали в ревизию:', failed)
				message.error(`Правки не сохранились: ${failed[0].message}`)
				return
			}

			// Черновик относится к старой ревизии: на новой у сегментов свои id.
			reset()
			setIsEditing(false)

			if (failed.length === 0) {
				message.success('Ревизия сохранена')
			} else {
				console.error('В ревизию не попали правки:', failed)
				const infoFailed = failed.some(item => item.key === CYTOLOGY_INFO_DRAFT_KEY)
				const segmentsFailed = failed.length - (infoFailed ? 1 : 0)
				message.warning(
					[
						'Ревизия сохранена не полностью.',
						segmentsFailed > 0 ? `Не сохранено сегментов: ${segmentsFailed}.` : '',
						infoFailed ? 'Заключение не сохранено.' : '',
						failed[0].message,
					]
						.filter(Boolean)
						.join(' '),
				)
			}
			navigate(`/cytology/${encodeURIComponent(revisionId)}`)
		} catch (error) {
			console.error('Ошибка сохранения ревизии:', error)
			message.error('Не удалось сохранить ревизию')
		}
	}, [editedInfo, getLatest, navigate, reset, saveRevision, segments, sourceId])

	return useMemo(
		() => ({
			isEditing,
			isSaving,
			drafts,
			annotationApiRef,
			editedInfo,
			setEditedInfo,
			hasChanges: drafts.hasChanges || editedInfo != null,
			start,
			cancel,
			save,
		}),
		[isEditing, isSaving, drafts, editedInfo, start, cancel, save],
	)
}
