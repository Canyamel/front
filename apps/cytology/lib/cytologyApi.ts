import { ApiFormRequestError, apiFormRequest, authorizedFetch, baseApi } from '@medml/store'
import type { FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'
import type { ContourDraft } from '@medml/viewers'
import type { CytologyStagedCreateFields } from '@medml/cytology-upload'
import { CYTOLOGY_STAGED_CREATE_URL, formatCytologyUploadApiError } from '@medml/cytology-upload'

import { buildCopyBody, cytologyRoutes, goMissingEndpoints } from './cytologyRoutes'
import { CYTOLOGY_SEGMENT_TYPES } from './cytologySegmentTypes'

export function cytologyFormFieldToString(value: unknown): string {
	if (value == null || value === '') return ''
	if (typeof value === 'number') {
		return Number.isFinite(value) ? String(value) : ''
	}
	return String(value).trim()
}

/** Файл из antd Upload / Dragger. */
export function resolveUploadFile(file: File | (Blob & { name?: string })): File {
	if (file instanceof File) return file
	const name = file.name ?? 'upload.svs'
	return new File([file], name, { type: file.type || 'application/octet-stream' })
}

export function buildCreateCytologyFormData(body: CreateCytologyBody): FormData {
	const formData = new FormData()
	const image = resolveUploadFile(body.image)
	formData.append('image', image)
	formData.append('diagnostic_marking', body.diagnostic_marking)
	formData.append('diagnostic_number', body.diagnostic_number)
	formData.append('material_type', body.material_type)
	formData.append('calcitonin', body.calcitonin)
	formData.append('thyroglobulin', body.thyroglobulin)
	formData.append('calcitonin_in_flush', body.calcitonin_in_flush)
	formData.append('patient_card', body.patient_card)
	return formData
}

export function formatCreateCytologyError(error: unknown): string {
	return formatCytologyUploadApiError(error)
}

export function mapUploadValuesToCreateCytologyBody(
	file: File | Blob,
	values: Record<string, unknown>,
): CreateCytologyBody {
	return {
		image: resolveUploadFile(file),
		diagnostic_marking: cytologyFormFieldToString(values.marking),
		diagnostic_number: cytologyFormFieldToString(values.number),
		material_type: cytologyFormFieldToString(values.localization),
		calcitonin: cytologyFormFieldToString(values.calcitonin),
		thyroglobulin: cytologyFormFieldToString(values.thyroglobulin),
		calcitonin_in_flush: cytologyFormFieldToString(values.calcInSense),
		patient_card: cytologyFormFieldToString(values.patientCard),
	}
}

export type CreateCytologyBody = {
	image: File | Blob
	diagnostic_marking: string
	diagnostic_number: string
	material_type: string
	calcitonin: string
	thyroglobulin: string
	calcitonin_in_flush: string
	patient_card: string
}

export type CytologyProcessingStatus = 'pending' | 'processing' | 'ready' | 'failed'

export type CytologyProcessingStatusResponse = {
	image_id: number
	processing_status: CytologyProcessingStatus
}

export type CreateCytologyResponse = {
	id?: string | number
	image_id?: number
	processing_status?: CytologyProcessingStatus
}

export type CytologyPatientDto = {
	id?: string | number
	fullname?: string
	first_name?: string
	last_name?: string
	fathers_name?: string
	email?: string
	policy?: string
	personal_policy?: string
	active?: boolean
	is_active?: boolean
	malignancy?: boolean
	birth_date?: string
}

export type CytologyPatientCardDto = {
	id?: string | number
	diagnosis?: string
	patient?: number
	acceptance_datetime?: string
}

export type CytologyInfoDetailsDto = {
	probs?: number[]
	cell_characteristics?: Record<string, number>
	cluster_characteristics?: Record<string, number>
}

export type CytologyInfoResponse = {
	id?: string | number
	status?: string
	diagnostic_marking?: string
	diagnostic_number?: string | number
	diagnos_date?: string
	material_type?: string
	details?: {
		probs?: number[]
	}
	file_path?: string
	image?: string
	info?: {
		id?: string | number
		patient?: CytologyPatientDto
		patient_card?: string
		diagnosis?: string
		is_last?: boolean
		calcitonin?: number
		calcitonin_in_flush?: number
		thyroglobulin?: number
	}
}

type CytologyInfoRawResponse = {
	original_image?: {
		id?: string | number
		image?: string
		file_path?: string
	}
	info?: {
		patient?: CytologyPatientDto
		patient_card?: string
		image_group?: {
			id?: string | number
			diagnostic_marking?: string
			diagnostic_number?: string | number
			diagnos_date?: string
			material_type?: string
			is_last?: boolean
			details?: {
				probs?: number[]
			}
			patient_card?: string | number
			diagnosis?: string
			calcitonin?: number
			calcitonin_in_flush?: number
			thyroglobulin?: number
		}
	}
}

type CytologyInfoGroupDto = {
	id?: string | number
	diagnostic_marking?: string
	diagnostic_number?: string | number
	diagnos_date?: string
	material_type?: string
	details?: CytologyInfoDetailsDto | null
	diagnosis?: string
	calcitonin?: number
	calcitonin_in_flush?: number
	thyroglobulin?: number
	is_last?: boolean
	prev?: string | number | null
	parent_prev?: string | number | null
	original_image?: number | null
}

export type CytologyPoint = {
	id?: number
	uid?: number
	x: number
	y: number
}

export type CytologySegmentDetails = {
	area?: number
	probs?: number[]
	min_d?: number
	max_d?: number
	aspect_ratio?: number
	circularity?: number
	nuclear_cytoplasmic_ratio?: number
	[key: string]: unknown
}

export type CytologySegmentType = {
	code: string
	label: string
	color: string
}

type PaginatedResponse<T> = {
	results?: T[]
	count?: number
	next?: string | null
	previous?: string | null
}

export type CytologySegmentGroup = {
	id: number
	data: Array<{
		id: number
		points: CytologyPoint[]
		// Go-шлюз отдаёт details строкой с JSON, Django — объектом.
		details?: CytologySegmentDetails | string
	}>
	// В go-ответе тип может отсутствовать: он уже задан query-параметром.
	seg_type?: string
	is_ai?: boolean
	group_type?: string
}

export type CytologySegmentStack = {
	id: number | string
	points: CytologyPoint[]
	details?: CytologySegmentDetails
	seg_type: string
	is_ai?: boolean
}

/** Сегмент без доменных подробностей — то, что нужно для сопоставления. */
export type CytologySegmentShape = Pick<CytologySegmentStack, 'id' | 'seg_type' | 'is_ai' | 'points'>

export type CreateSegmentPayload = {
	seg_type: string
	data: {
		points: CytologyPoint[]
	}
}

export type PatchSegmentPayload = {
	points?: CytologyPoint[]
	details?: CytologySegmentDetails
	[key: string]: unknown
}

export type PatchCytologyInfoPayload = {
	patient_card?: {
		patient?: number
		diagnosis?: string
	}
	details?: {
		material_type?: string
		calcitonin?: number
		calcitonin_in_flush?: number
		thyroglobulin?: number
	}
	material_type?: string
	calcitonin?: number
	calcitonin_in_flush?: number
	thyroglobulin?: number
	[key: string]: unknown
}

export type ReviseCopyResponse = {
	id: string | number
	pk?: string | number
}

export type CytologyHistoryItem = {
	id: number
	diagnos_date?: string
	diagnostic_marking?: string
	diagnostic_number?: number
	material_type?: string
	is_last?: boolean
	[key: string]: unknown
}

export type CytologyHistoryResponse = PaginatedResponse<CytologyHistoryItem>

export function flattenSegmentGroups(
	response: CytologySegmentGroup[] | PaginatedResponse<CytologySegmentGroup>,
	requestedType: string,
): CytologySegmentStack[] {
	const groups: CytologySegmentGroup[] = Array.isArray(response) ? response : (response?.results ?? [])

	return groups.flatMap(segmentGroup =>
		(segmentGroup.data ?? []).map(segmentData => ({
			id: segmentData.id,
			seg_type: segmentGroup.seg_type ?? requestedType,
			is_ai: segmentGroup.is_ai,
			points: segmentData.points ?? [],
			details: parseSegmentDetails(segmentData.details),
		})),
	)
}

/** `details` приходит объектом (Django) либо строкой с JSON (Go). */
function parseSegmentDetails(value: CytologySegmentDetails | string | undefined): CytologySegmentDetails | undefined {
	if (value == null) return undefined
	if (typeof value !== 'string') return value
	if (value.trim() === '') return undefined

	try {
		const parsed: unknown = JSON.parse(value)
		return parsed && typeof parsed === 'object' ? (parsed as CytologySegmentDetails) : undefined
	} catch {
		// Битый JSON не должен ронять отрисовку сегментов.
		return undefined
	}
}

export const cytologyApi = baseApi.injectEndpoints({
	endpoints: builder => ({
		createCytology: builder.mutation<CreateCytologyResponse, CreateCytologyBody>({
			async queryFn(body, api) {
				try {
					const data = await apiFormRequest<CreateCytologyResponse>(
						cytologyRoutes.create(),
						buildCreateCytologyFormData(body),
						api,
					)
					return { data }
				} catch (error) {
					if (error instanceof ApiFormRequestError) {
						return {
							error: {
								status: error.status,
								data: error.data,
							} satisfies FetchBaseQueryError,
						}
					}
					return {
						error: {
							status: 'FETCH_ERROR',
							error: String(error),
						} satisfies FetchBaseQueryError,
					}
				}
			},
			invalidatesTags: () => [{ type: 'Cytology', id: 'LIST' }],
		}),
		createCytologyFromStaged: builder.mutation<CreateCytologyResponse, CytologyStagedCreateFields>({
			async queryFn(body, api) {
				try {
					// Загрузка большого .svs идёт минутами — за это время access-токен
					// успевает истечь. authorizedFetch обновит его перед отправкой.
					const response = await authorizedFetch(
						CYTOLOGY_STAGED_CREATE_URL,
						{
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify(body),
						},
						api,
					)

					const text = await response.text()
					let data: unknown = null
					if (text.length > 0) {
						try {
							data = JSON.parse(text)
						} catch {
							data = text
						}
					}

					if (!response.ok) {
						return {
							error: {
								status: response.status,
								data,
							} satisfies FetchBaseQueryError,
						}
					}

					return { data: data as CreateCytologyResponse }
				} catch (error) {
					return {
						error: {
							status: 'FETCH_ERROR',
							error: String(error),
						} satisfies FetchBaseQueryError,
					}
				}
			},
			invalidatesTags: () => [{ type: 'Cytology', id: 'LIST' }],
		}),
		getCytologyInfo: builder.query<CytologyInfoResponse, string>({
			query: id => cytologyRoutes.info(id),
			transformResponse: (raw: CytologyInfoRawResponse): CytologyInfoResponse => {
				const group = raw.info?.image_group
				const original = raw.original_image
				return {
					id: group?.id ?? original?.id,
					diagnostic_marking: group?.diagnostic_marking,
					diagnostic_number: group?.diagnostic_number,
					diagnos_date: group?.diagnos_date,
					material_type: group?.material_type,
					details: group?.details,
					file_path: original?.file_path,
					image: original?.image ?? original?.file_path,
					info: {
						id: group?.id,
						patient: raw.info?.patient,
						patient_card:
							raw.info?.patient_card ?? (group?.patient_card == null ? undefined : String(group.patient_card)),
						diagnosis: group?.diagnosis,
						is_last: group?.is_last,
						calcitonin: group?.calcitonin,
						calcitonin_in_flush: group?.calcitonin_in_flush,
						thyroglobulin: group?.thyroglobulin,
					},
				}
			},
			providesTags: (_result, _error, id) => [{ type: 'Cytology', id }],
		}),
		/**
		 * Справочник типов сегментов.
		 *
		 * В Go-шлюзе такой ручки нет — там `seg_type` это enum в спеке.
		 * Возвращаем статический список из `cytologySegmentTypes.ts`, чтобы
		 * вызывающие компоненты не знали о разнице бэкендов.
		 */
		getCytologyTypes: builder.query<CytologySegmentType[], string>({
			async queryFn(id, api, extraOptions, baseQuery) {
				if (goMissingEndpoints.segmentTypes()) {
					return { data: CYTOLOGY_SEGMENT_TYPES }
				}

				const result = await baseQuery(`/cytology/${encodeURIComponent(id)}/segments/types/`)
				if (result.error) return { error: result.error }

				const payload = result.data as PaginatedResponse<CytologySegmentType>
				return { data: payload?.results ?? [] }
			},
			providesTags: (_result, _error, id) => [{ type: 'Segments', id }],
		}),
		/**
		 * Сегменты всех типов исследования, плоским списком. Бэкенд отдаёт их
		 * по одному типу за запрос — запросы идут параллельно. Тип, который не
		 * загрузился, пропускаем: снимок остаётся рабочим с остальными.
		 */
		getCytologySegments: builder.query<CytologySegmentStack[], { id: string; types: string[] }>({
			async queryFn({ id, types }, _api, _extraOptions, baseQuery) {
				const results = await Promise.all(
					types.map(async type => ({ type, result: await baseQuery(cytologyRoutes.segmentsByType(id, type)) })),
				)
				const loaded = results.filter(({ result }) => !result.error)
				if (results.length > 0 && loaded.length === 0) return { error: results[0].result.error! }

				return {
					data: loaded.flatMap(({ type, result }) =>
						flattenSegmentGroups(result.data as CytologySegmentGroup[] | PaginatedResponse<CytologySegmentGroup>, type),
					),
				}
			},
			providesTags: (_result, _error, { id, types }) =>
				types.map(type => ({ type: 'Segments' as const, id: `${id}:${type}` })),
		}),
		/**
		 * Сохранение правок как новой ревизии исследования — одним вызовом
		 *
		 * Бэкенд правит не исходное исследование, а его копию (`/cytology/copy`):
		 * 1. копируем исследование;
		 * 2. у копии свои id сегментов — сопоставляем их с исходными по типу,
		 *    признаку ИИ и точкам. Загружаем только типы, где сегменты меняли
		 *    или удаляли: новым сегментам сопоставление не нужно;
		 * 3. новые и изменённые сегменты и заключение, затем удаления.
		 *
		 * Если копия не создалась, мутация падает целиком. Дальше ошибка одного
		 * сегмента не отменяет остальные: ревизия уже есть, в ответе видно, что
		 * в неё не попало.
		 */
		saveCytologyRevision: builder.mutation<SaveCytologyRevisionResult, SaveCytologyRevisionArgs>({
			async queryFn({ sourceId, sourceSegments, drafts, info }, _api, _extraOptions, baseQuery) {
				const copy = await baseQuery({ url: cytologyRoutes.copy(), method: 'POST', body: buildCopyBody(sourceId) })
				if (copy.error) return { error: copy.error }
				const copyData = copy.data as ReviseCopyResponse
				const revisionId = String(copyData.id ?? copyData.pk)

				const saved: string[] = []
				const failed: SaveCytologyRevisionResult['failed'] = []

				const segTypeOf = ({ key, draft }: CytologyContourDraftEntry) =>
					draft.data?.segType ?? sourceSegments.find(segment => String(segment.id) === key)?.seg_type

				// id сегментов копии для правок и удалений
				const touchedTypes = new Set(
					drafts.filter(entry => entry.draft.kind !== 'create').flatMap(entry => segTypeOf(entry) ?? []),
				)
				const copiedIds = new Map<string, string>()
				const typesWithoutCopy = new Set<string>()
				await Promise.all(
					[...touchedTypes].map(async type => {
						const result = await baseQuery(cytologyRoutes.segmentsByType(revisionId, type))
						if (result.error) {
							typesWithoutCopy.add(type)
							return
						}
						const copied = flattenSegmentGroups(
							result.data as CytologySegmentGroup[] | PaginatedResponse<CytologySegmentGroup>,
							type,
						)
						matchCopiedSegments(
							sourceSegments.filter(segment => segment.seg_type === type),
							copied,
						).forEach((copyId, sourceId) => copiedIds.set(sourceId, copyId))
					}),
				)

				const send = async (key: string, request: FetchArgs | string) => {
					if (typeof request === 'string') {
						failed.push({ key, message: request })
						return
					}
					const result = await baseQuery(request)
					if (result.error) failed.push({ key, message: formatSaveError(result.error) })
					else saved.push(key)
				}

				const requestFor = (entry: CytologyContourDraftEntry): FetchArgs | string => {
					const { key, draft } = entry
					if (draft.kind === 'create') {
						const segType = segTypeOf(entry)
						if (!segType) return 'Не выбран тип сегмента'
						return {
							url: cytologyRoutes.segmentGroupCreate(revisionId),
							method: 'POST',
							body: { seg_type: segType, data: { points: draft.points } } satisfies CreateSegmentPayload,
						}
					}
					const copyId = copiedIds.get(key)
					if (!copyId) {
						const segType = segTypeOf(entry)
						return segType && typesWithoutCopy.has(segType)
							? 'Не удалось загрузить сегменты новой ревизии'
							: 'Сегмент не найден в новой ревизии'
					}
					if (draft.kind === 'delete') return { url: cytologyRoutes.segmentUpdate(copyId), method: 'DELETE' }
					return {
						url: cytologyRoutes.segmentUpdate(copyId),
						method: 'PATCH',
						body: { points: draft.points } satisfies PatchSegmentPayload,
					}
				}

				await Promise.all([
					...drafts.filter(entry => entry.draft.kind !== 'delete').map(entry => send(entry.key, requestFor(entry))),
					...(info
						? [send(CYTOLOGY_INFO_DRAFT_KEY, { url: cytologyRoutes.update(revisionId), method: 'PATCH', body: info })]
						: []),
				])
				await Promise.all(
					drafts.filter(entry => entry.draft.kind === 'delete').map(entry => send(entry.key, requestFor(entry))),
				)

				return { data: { revisionId, saved, failed } }
			},
			invalidatesTags: (_result, _error, { sourceId }) => [
				{ type: 'Cytology', id: 'LIST' },
				{ type: 'Cytology', id: String(sourceId) },
				{ type: 'Cytology', id: `history:${sourceId}` },
			],
		}),
		getCytologyHistory: builder.query<CytologyHistoryResponse, string>({
			query: id => cytologyRoutes.history(id),
			providesTags: (_result, _error, id) => [{ type: 'Cytology', id: `history:${id}` }],
		}),
		getProcessingStatus: builder.query<CytologyProcessingStatusResponse, string>({
			async queryFn(id, api, extraOptions, baseQuery) {
				if (goMissingEndpoints.processingStatus()) {
					return { data: { image_id: Number(id) || 0, processing_status: 'ready' } }
				}

				const result = await baseQuery(`/cytology/${encodeURIComponent(id)}/processing-status/`)
				if (result.error) return { error: result.error }
				return { data: result.data as CytologyProcessingStatusResponse }
			},
		}),
	}),
})

export const {
	useCreateCytologyMutation,
	useCreateCytologyFromStagedMutation,
	useGetCytologyInfoQuery,
	useLazyGetCytologyInfoQuery,
	useGetCytologyTypesQuery,
	useGetCytologySegmentsQuery,
	useSaveCytologyRevisionMutation,
	useGetCytologyHistoryQuery,
	useGetProcessingStatusQuery,
} = cytologyApi

/**
 * Правки контуров для новой ревизии — черновик `useContourDrafts`. Ключ —
 * id сегмента на сервере, у нового сегмента — его id во вьюере.
 */
export type CytologyContourDraft = ContourDraft<CytologyPoint[], { segType: string }>

export interface CytologyContourDraftEntry {
	key: string
	draft: CytologyContourDraft
}

export interface SaveCytologyRevisionArgs {
	/** Исследование, с которого снимается ревизия. */
	sourceId: string | number
	/** Его сегменты — для сопоставления с сегментами копии. */
	sourceSegments: CytologySegmentShape[]
	drafts: CytologyContourDraftEntry[]
	/** Изменённое заключение, если врач его правил. */
	info?: PatchCytologyInfoPayload
}

export interface SaveCytologyRevisionResult {
	revisionId: string
	/** Ключи правок, которые попали в ревизию (заключение — `CYTOLOGY_INFO_DRAFT_KEY`). */
	saved: string[]
	failed: Array<{ key: string; message: string }>
}

/** Ключ заключения в `saved` / `failed` ответа `saveCytologyRevision`. */
export const CYTOLOGY_INFO_DRAFT_KEY = 'info'

/**
 * Сопоставить сегменты копии с исходными: id в копии новые, а тип, признак
 * ИИ и точки те же. Возвращает id исходного сегмента → id в копии.
 */
function matchCopiedSegments(source: CytologySegmentShape[], copied: CytologySegmentShape[]): Map<string, string> {
	const signature = (segment: CytologySegmentShape) =>
		`${segment.seg_type}:${Boolean(segment.is_ai)}:${[...segment.points]
			.sort((a, b) => a.x - b.x || a.y - b.y)
			.map(point => `${point.x},${point.y}`)
			.join('|')}`

	const copiedBySignature = new Map<string, CytologySegmentShape[]>()
	copied.forEach(segment => {
		const key = signature(segment)
		copiedBySignature.set(key, [...(copiedBySignature.get(key) ?? []), segment])
	})

	const result = new Map<string, string>()
	source.forEach(segment => {
		const match = copiedBySignature.get(signature(segment))?.shift()
		if (match) result.set(String(segment.id), String(match.id))
	})
	return result
}

function formatSaveError(error: FetchBaseQueryError): string {
	const data = error.data as { detail?: unknown } | undefined
	if (typeof data?.detail === 'string') return data.detail
	return typeof error.status === 'number' ? `Ошибка ${error.status}` : 'Сервер недоступен'
}
