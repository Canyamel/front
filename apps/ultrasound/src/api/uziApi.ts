import { baseApi } from '@medml/store'
import type { FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'

import { isThyroidBackend } from '@/lib/apiBackend'
import type { ThyroidUziApiResponse, UziContourDraft } from '@/features/uzi-view/model/types'
import type { NewUziNode, UziNodeTypeChange } from '@/features/uzi-view/model/nodeEdits'

function normalizeListResults<T>(response: unknown): T[] {
	if (Array.isArray(response)) return response as T[]
	if (response && typeof response === 'object') {
		const results = (response as { results?: unknown }).results
		if (Array.isArray(results)) return results as T[]
	}
	return []
}

export type UziDeviceDto = {
	id: string
	name: string
}

export const uziApi = baseApi.injectEndpoints({
	endpoints: builder => ({
		getUziDevices: builder.query<UziDeviceDto[], void>({
			query: () => ({ url: '/uzi/devices/' }),
			transformResponse: (response: unknown) =>
				normalizeListResults<UziDeviceDto>(response).map(d => ({
					id: String(d.id),
					name: d.name,
				})),
		}),

		/**
		 * Новый аппарат (thyroid). Если аппарат с таким названием уже есть,
		 * бэкенд вернёт его, а не создаст дубль.
		 */
		createUziDevice: builder.mutation<UziDeviceDto, string>({
			query: name => ({ url: '/uzi/devices/', method: 'POST', body: { name } }),
			transformResponse: (response: { id: number | string; name: string }) => ({
				id: String(response.id),
				name: response.name,
			}),
			async onQueryStarted(_name, { dispatch, queryFulfilled }) {
				try {
					const { data: device } = await queryFulfilled
					dispatch(
						uziApi.util.updateQueryData('getUziDevices', undefined, list => {
							if (!list.some(item => item.id === device.id)) {
								list.push(device)
								list.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
							}
						}),
					)
				} catch {
					// Ошибку покажет вызывающий код.
				}
			},
		}),

		/** Thyroid: полный bundle для ResultsPage (`?format=json`). */
		getThyroidUziData: builder.query<ThyroidUziApiResponse, string>({
			query: uziId => `/uzi/${encodeURIComponent(uziId)}/?format=json`,
			providesTags: (_result, _error, uziId) => [{ type: 'Uzi', id: uziId }],
		}),

		updateThyroidUziData: builder.mutation<void, { uziId: string; data: unknown }>({
			query: ({ uziId, data }) => ({
				url: `/uzi/${encodeURIComponent(uziId)}/update/`,
				method: 'PUT',
				body: data,
			}),
			invalidatesTags: (_result, _error, { uziId }) => [{ type: 'Uzi', id: uziId }],
		}),

		/**
		 * Ручной масштаб снимка (калибровка линейкой), `null` — сброс.
		 *
		 * Бэкенд под этот масштаб пересчитывает размеры узлов и ЩЖ в мм и
		 * отвечает уже после пересчёта, поэтому следом перечитываем снимок.
		 */
		saveUziManualScale: builder.mutation<null, { uziId: string; pxPerMm: number | null }>({
			async queryFn({ uziId, pxPerMm }, api, _extraOptions, baseQuery) {
				const saved = await baseQuery({
					url: `/uzi/${encodeURIComponent(uziId)}/scale/`,
					method: 'PUT',
					body: { px_per_mm: pxPerMm },
				})
				if (saved.error) return { error: saved.error }

				const fresh = await baseQuery(`/uzi/${encodeURIComponent(uziId)}/?format=json`)
				if (fresh.data) {
					const { info, segmentation } = fresh.data as ThyroidUziApiResponse
					api.dispatch(
						uziApi.util.updateQueryData('getThyroidUziData', uziId, draft => {
							draft.info = info
							draft.segmentation = segmentation
						}),
					)
				} else {
					api.dispatch(uziApi.util.invalidateTags([{ type: 'Uzi', id: uziId }]))
				}

				return { data: null }
			},
		}),

		uploadUziDiagnostic: builder.mutation<
			unknown,
			{
				file: File
				projection: string
				projectionSide?: string
				/** Thyroid: id карты (`patient_card`). Med: id пациента (`external_id`). */
				patientRefId: string
				deviceId: string
			}
		>({
			query: ({ file, projection, projectionSide, patientRefId, deviceId }) => {
				const formData = new FormData()
				if (isThyroidBackend()) {
					formData.append('original_image', file)
					formData.append('projection_type', projection)
					if (projectionSide) {
						formData.append('projection_side', projectionSide)
					}
					formData.append('patient_card', patientRefId)
					formData.append('uzi_device', deviceId)
					return {
						url: '/uzi/create/',
						method: 'POST',
						body: formData,
					}
				}
				formData.append('file', file)
				formData.append('projection', projection)
				if (projectionSide) {
					formData.append('projectionSide', projectionSide)
				}
				formData.append('external_id', patientRefId)
				formData.append('device_id', deviceId)
				return {
					url: '/uzi',
					method: 'POST',
					body: formData,
				}
			},
			invalidatesTags: () => [{ type: 'Patient', id: 'LIST' }],
		}),
	}),
})

export const {
	useGetUziDevicesQuery,
	useCreateUziDeviceMutation,
	useUploadUziDiagnosticMutation,
	useGetThyroidUziDataQuery,
	useUpdateThyroidUziDataMutation,
	useSaveUziManualScaleMutation,
} = uziApi

/** Правка контура в запросе сохранения: ключ черновика и сама правка. */
export interface UziContourDraftEntry {
	key: string
	draft: UziContourDraft
}

export interface SaveUziContourDraftsArgs {
	uziId: string
	imageId?: number
	drafts: UziContourDraftEntry[]
	nodeTypes?: UziNodeTypeChange[]
	newNodes?: readonly NewUziNode[]
	/** Узлы, у которых не осталось контуров: удаляются после сохранения контуров. */
	deleteNodes?: number[]
}

export interface SaveUziContourDraftsResult {
	/** Ключи сохранённых правок контуров. */
	saved: string[]
	failed: Array<{ key: string; message: string }>
	/** Узлы, у которых сохранён новый класс. */
	savedTypes: number[]
	createdNodes: Array<{ tempId: number; id: number }>
	/** Новые узлы без единого контура — на сервер не отправлялись. */
	skippedNodes: number[]
	/** Удалённые узлы без контуров. */
	deletedNodes: number[]
}

/**
 * Сохранение контуров узлов отдельным `injectEndpoints`: после записи
 * мутация кладёт свежий снимок в кэш `getThyroidUziData`, а сослаться на
 * `uziApi.util` можно только после того, как `uziApi` объявлен.
 */
export const uziContourApi = uziApi.injectEndpoints({
	endpoints: builder => ({
		saveUziContourDrafts: builder.mutation<SaveUziContourDraftsResult, SaveUziContourDraftsArgs>({
			async queryFn(
				{ uziId, imageId, drafts, nodeTypes = [], newNodes = [], deleteNodes = [] },
				api,
				_extraOptions,
				baseQuery,
			) {
				const saved: string[] = []
				const failed: SaveUziContourDraftsResult['failed'] = []
				const savedTypes: number[] = []
				const createdNodes: SaveUziContourDraftsResult['createdNodes'] = []
				const skippedNodes: number[] = []
				const deletedNodes: number[] = []

				// 1. Новые узлы. Без контура узел не нужен — такие пропускаем.
				const drawnGroups = new Set(
					drafts.filter(entry => entry.draft.kind === 'create').map(entry => String(entry.draft.data?.group)),
				)
				const realGroup = new Map<string, number>()
				for (const node of newNodes) {
					if (!drawnGroups.has(String(node.id))) {
						skippedNodes.push(node.id)
						continue
					}
					if (imageId == null) {
						failed.push({ key: `node:${node.id}`, message: 'Нет снимка, к которому добавить узел' })
						continue
					}
					const result = await baseQuery({
						url: `/uzi/segment/group/create/solo/${encodeURIComponent(imageId)}/`,
						method: 'POST',
						body: { details: { source_type: 'nodule', nodule_type: node.type } },
					})
					const id = (result.data as { id?: unknown } | undefined)?.id
					if (result.error || typeof id !== 'number') {
						failed.push({
							key: `node:${node.id}`,
							message: result.error ? formatSaveError(result.error) : 'Сервер не вернул id узла',
						})
						continue
					}
					realGroup.set(String(node.id), id)
					createdNodes.push({ tempId: node.id, id })
				}

				// 2. Классы TI-RADS. PATCH: остальные поля `details` (вероятности
				// модели, размеры) сервер должен оставить как есть.
				await Promise.all(
					nodeTypes.map(async ({ id, type, aiType }) => {
						const result = await baseQuery({
							url: `/uzi/segment/group/update/${encodeURIComponent(id)}/`,
							method: 'PATCH',
							body: { details: { nodule_type: type, ...(aiType != null ? { ai_nodule_type: aiType } : {}) } },
						})
						if (result.error) failed.push({ key: `type:${id}`, message: formatSaveError(result.error) })
						else savedTypes.push(id)
					}),
				)

				// 3. Контуры. Контуры новых узлов перевешиваем на id с сервера.
				const send = async ({ key, draft: original }: UziContourDraftEntry) => {
					const group = original.data?.group
					const mapped = group != null ? realGroup.get(String(group)) : undefined
					const draft = mapped != null ? { ...original, data: { ...original.data, group: mapped } } : original
					if (draft.data?.group != null && Number(draft.data.group) < 0) {
						failed.push({ key, message: 'Узел для контура не создан' })
						return
					}
					const request = contourDraftRequest(key, draft)
					if (typeof request === 'string') {
						failed.push({ key, message: request })
						return
					}
					const result = await baseQuery(request)
					if (result.error) failed.push({ key, message: formatSaveError(result.error) })
					else saved.push(key)
				}

				await Promise.all(drafts.filter(entry => entry.draft.kind !== 'delete').map(send))
				await Promise.all(drafts.filter(entry => entry.draft.kind === 'delete').map(send))

				// 4. Узлы без контуров. Если какой-то контур узла не сохранился, на
				// сервере у узла контур ещё есть — узел не трогаем.
				const failedKeys = new Set(failed.map(item => item.key))
				await Promise.all(
					deleteNodes.map(async id => {
						const pending = drafts.some(
							entry => failedKeys.has(entry.key) && String(entry.draft.data?.group) === String(id),
						)
						if (pending) return
						const result = await baseQuery({
							url: `/uzi/segment/group/update/${encodeURIComponent(id)}/`,
							method: 'DELETE',
						})
						if (result.error) failed.push({ key: `node-delete:${id}`, message: formatSaveError(result.error) })
						else deletedNodes.push(id)
					}),
				)

				if (saved.length > 0 || savedTypes.length > 0 || createdNodes.length > 0 || deletedNodes.length > 0) {
					const fresh = await baseQuery(`/uzi/${encodeURIComponent(uziId)}/?format=json`)
					if (fresh.data) {
						await api.dispatch(
							uziApi.util.upsertQueryData('getThyroidUziData', uziId, fresh.data as ThyroidUziApiResponse),
						)
					} else {
						api.dispatch(uziApi.util.invalidateTags([{ type: 'Uzi', id: uziId }]))
					}
				}

				return { data: { saved, failed, savedTypes, createdNodes, skippedNodes, deletedNodes } }
			},
		}),
	}),
})

export const { useSaveUziContourDraftsMutation } = uziContourApi

function contourDraftRequest(key: string, draft: UziContourDraft): FetchArgs | string {
	const group = draft.data?.group

	if (draft.kind === 'create') {
		if (group == null || group === '') return 'Не выбран узел для нового контура'
		return { url: '/uzi/segment/add/', method: 'POST', body: { points: draft.points, segment_group: group } }
	}

	const url = `/uzi/segment/update/${encodeURIComponent(key)}/`
	if (draft.kind === 'delete') return { url, method: 'DELETE' }
	return { url, method: 'PUT', body: { points: draft.points, ...(group != null ? { segment_group: group } : {}) } }
}

function formatSaveError(error: FetchBaseQueryError): string {
	const data = error.data as { detail?: unknown } | undefined
	if (typeof data?.detail === 'string') return data.detail
	return typeof error.status === 'number' ? `Ошибка ${error.status}` : 'Сервер недоступен'
}
