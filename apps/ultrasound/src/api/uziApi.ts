import { baseApi } from '@medml/store'
import type { FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'

import { isThyroidBackend } from '@/lib/apiBackend'
import type { ThyroidUziApiResponse, UziContourDraft } from '@/features/uzi-view/model/types'

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

export interface SaveUziContourDraftsResult {
	saved: string[]
	failed: Array<{ key: string; message: string }>
}

/**
 * Сохранение контуров узлов отдельным `injectEndpoints`: после записи
 * мутация кладёт свежий снимок в кэш `getThyroidUziData`, а сослаться на
 * `uziApi.util` можно только после того, как `uziApi` объявлен.
 */
export const uziContourApi = uziApi.injectEndpoints({
	endpoints: builder => ({
		saveUziContourDrafts: builder.mutation<
			SaveUziContourDraftsResult,
			{ uziId: string; drafts: UziContourDraftEntry[] }
		>({
			async queryFn({ uziId, drafts }, api, _extraOptions, baseQuery) {
				const saved: string[] = []
				const failed: SaveUziContourDraftsResult['failed'] = []

				const send = async ({ key, draft }: UziContourDraftEntry) => {
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

				if (saved.length > 0) {
					const fresh = await baseQuery(`/uzi/${encodeURIComponent(uziId)}/?format=json`)
					if (fresh.data) {
						await api.dispatch(
							uziApi.util.upsertQueryData('getThyroidUziData', uziId, fresh.data as ThyroidUziApiResponse),
						)
					} else {
						api.dispatch(uziApi.util.invalidateTags([{ type: 'Uzi', id: uziId }]))
					}
				}

				return { data: { saved, failed } }
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
