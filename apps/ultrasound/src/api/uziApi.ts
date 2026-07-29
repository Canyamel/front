import { baseApi } from '@medml/store'

import { isThyroidBackend } from '@/lib/apiBackend'
import type { ThyroidUziApiResponse } from '@/features/thyroid-results/thyroidResultsTypes'

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

/** Кадры снимка (как в OLD UZI `IUziPage`). */
export type UziImagePageDto = {
	id: string
	uzi_id: string
	page: number
}

/** Узел с TIRADS (как в OLD `INode`). */
export type UziNodeDto = {
	id: string
	uzi_id: string
	ai: boolean
	validation: string
	tirads_23: number
	tirads_4: number
	tirads_5: number
}

export type UziSegmentDto = {
	id: string
	node_id: string
	image_id: string
	ai: boolean
	contor: { x: number; y: number }[]
	tirads_23: number
	tirads_4: number
	tirads_5: number
}

export type UziImageNodesSegmentsDto = {
	nodes?: UziNodeDto[]
	segments?: UziSegmentDto[]
}

export type UziInfoDto = {
	id: string
	projection: string
	checked: boolean
	external_id: string
	author_id: string
	device_id: number
	status: string
	create_at: string
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

		getUziInfo: builder.query<UziInfoDto, string>({
			query: uziId => ({ url: `/uzi/${encodeURIComponent(uziId)}` }),
		}),

		getUziImagePages: builder.query<UziImagePageDto[], string>({
			query: uziId => ({ url: `/uzi/${encodeURIComponent(uziId)}/images` }),
		}),

		getUziNodes: builder.query<UziNodeDto[], string>({
			query: uziId => ({ url: `/uzi/${encodeURIComponent(uziId)}/nodes` }),
		}),

		getUziImageNodesSegments: builder.query<UziImageNodesSegmentsDto, string>({
			query: imageId => ({
				url: `/uzi/image/${encodeURIComponent(imageId)}/nodes-segments`,
			}),
		}),

		/** Thyroid: полный bundle для ResultsPage (`?format=json`). */
		getThyroidUziData: builder.query<ThyroidUziApiResponse, string>({
			query: uziId => `/uzi/${encodeURIComponent(uziId)}/?format=json`,
			providesTags: (_result, _error, uziId) => [{ type: 'Uzi', id: uziId }],
		}),

		updateThyroidUziData: builder.mutation<
			void,
			{ uziId: string; data: unknown }
		>({
			query: ({ uziId, data }) => ({
				url: `/uzi/${encodeURIComponent(uziId)}/update/`,
				method: 'PUT',
				body: data,
			}),
			invalidatesTags: (_result, _error, { uziId }) => [
				{ type: 'Uzi', id: uziId },
			],
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
	useGetUziInfoQuery,
	useGetUziImagePagesQuery,
	useGetUziNodesQuery,
	useGetUziImageNodesSegmentsQuery,
	useGetThyroidUziDataQuery,
	useUpdateThyroidUziDataMutation,
} = uziApi
