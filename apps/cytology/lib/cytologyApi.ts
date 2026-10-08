import { ApiFormRequestError, apiFormRequest, authorizedFetch, baseApi } from '@medml/store'
import { describeServerErrorBody } from '@medml/shared'
import type { FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'
import type { SerializedError } from '@reduxjs/toolkit'
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
	details?: CytologyInfoDetailsDto | null
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
		image_group?: CytologyInfoGroupDto
	}
}

type CytologyInfoGroupDto = {
	id?: string | number
	patient_card?: string | number
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

/**
 * Точки контура для сохранения.
 *
 * В спеке шлюза (`/cytology/segment/group/create/{id}`,
 * `PATCH /cytology/segment/update/{id}`) `x` и `y` — целые и не меньше нуля,
 * а вьювер отдаёт дробные координаты: ogen отбивает такой запрос как 400.
 * Координаты здесь — пиксели исходного снимка, округление ничего не теряет.
 */
export function toPixelPoints(points: CytologyPoint[]): CytologyPoint[] {
	return points.map(({ x, y }) => ({
		x: Math.max(0, Math.round(x)),
		y: Math.max(0, Math.round(y)),
	}))
}

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

/**
 * Запрос, который `queryFn` отдаёт своим обработчикам.
 *
 * RTK объявляет его возвращающим `MaybePromise`, но эти типы наружу не
 * экспортирует, а `await` одинаково работает с обоими вариантами.
 */
type CytologySubQuery = (args: string | FetchArgs) => Promise<{ data?: unknown; error?: FetchBaseQueryError }>

/** Плоская карточка исследования из ответа шлюза. */
function normalizeCytologyInfo(raw: CytologyInfoRawResponse): CytologyInfoResponse {
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
			patient_card: raw.info?.patient_card ?? (group?.patient_card == null ? undefined : String(group.patient_card)),
			diagnosis: group?.diagnosis,
			is_last: group?.is_last,
			calcitonin: group?.calcitonin,
			calcitonin_in_flush: group?.calcitonin_in_flush,
			thyroglobulin: group?.thyroglobulin,
		},
	}
}

/** Ревизия, от которой сделана копия. */
function parentRevisionId(raw: CytologyInfoRawResponse): string | null {
	const group = raw.info?.image_group
	const parent = group?.prev ?? group?.parent_prev
	const id = parent == null ? '' : String(parent).trim()
	return id ? id : null
}

/** Сколько ревизий вверх ищем снимок, прежде чем сдаться. */
const MAX_IMAGE_LOOKUPS = 5

/**
 * Снимок предыдущей ревизии.
 *
 * Копии идут цепочкой, и снимка может не быть у нескольких подряд, поэтому
 * поднимаемся по `prev` до исходного исследования. Повторы и слишком длинные
 * цепочки обрываем: ошибка здесь не должна ломать страницу — вернём `null`,
 * и вьювер честно покажет, что изображения нет.
 */
async function inheritImageFromAncestors(
	raw: CytologyInfoRawResponse,
	baseQuery: CytologySubQuery,
): Promise<Pick<CytologyInfoResponse, 'image' | 'file_path'> | null> {
	const visited = new Set<string>()
	let parentId = parentRevisionId(raw)

	for (let step = 0; step < MAX_IMAGE_LOOKUPS && parentId && !visited.has(parentId); step += 1) {
		visited.add(parentId)

		const result = await baseQuery(cytologyRoutes.info(parentId))
		if (result.error) return null

		const parent = result.data as CytologyInfoRawResponse
		const image = parent.original_image?.image ?? parent.original_image?.file_path
		if (image) return { image, file_path: parent.original_image?.file_path }

		parentId = parentRevisionId(parent)
	}

	return null
}

/** Ключи, под которыми бэкенды отдают id созданной ревизии. */
const REVISION_ID_KEYS = ['id', 'pk', 'uuid', 'cytology_id', 'image_group_id', 'new_id'] as const

/** Объекты, внутрь которых стоит заглянуть за этим id. */
const REVISION_CONTAINER_KEYS = ['info', 'image_group', 'cytology', 'data', 'result'] as const

/** Пригодный id`. */
function asRevisionId(value: unknown): string | null {
	if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? String(value) : null
	if (typeof value !== 'string') return null

	const text = value.trim()
	if (!text || text === 'undefined' || text === 'null' || text === '0') return null
	return text
}

function findRevisionId(value: unknown, depth = 0): string | null {
	if (typeof value === 'string' || typeof value === 'number') return asRevisionId(value)
	if (!value || typeof value !== 'object' || depth > 2) return null

	const record = value as Record<string, unknown>
	for (const key of REVISION_ID_KEYS) {
		const id = asRevisionId(record[key])
		if (id) return id
	}
	for (const key of REVISION_CONTAINER_KEYS) {
		const nested = findRevisionId(record[key], depth + 1)
		if (nested) return nested
	}
	return null
}

/**
 * Id новой ревизии из ответа `POST /cytology/copy`.
 *
 * В спеке это `{id, pk}`, но оба поля помечены `readOnly` и шлюз их не всегда заполняет — прилетает `{}`.
 */
function extractRevisionId(data: unknown, meta: unknown): string | null {
	const fromBody = findRevisionId(data)
	if (fromBody) return fromBody

	const response = (meta as { response?: { headers?: { get?: (name: string) => string | null } } } | undefined)
		?.response
	const location = response?.headers?.get?.('location') ?? null
	return asRevisionId(location?.split('?')[0].split('/').filter(Boolean).pop())
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
		/**
		 * Карточка исследования.
		 *
		 * Если снимка в ответе нет, берём его у предыдущей ревизии: шлюз не
		 * переносит `original_image` на копию (`POST /cytology/copy` отдаёт
		 * `"original_image": {}`), хотя изображение у ревизии то же самое.
		 * Когда это починят на бэкенде, лишний запрос перестанет уходить сам
		 * собой — он делается только при пустом снимке.
		 */
		getCytologyInfo: builder.query<CytologyInfoResponse, string>({
			async queryFn(id, _api, _extraOptions, baseQuery) {
				const result = await baseQuery(cytologyRoutes.info(id))
				if (result.error) return { error: result.error }

				const raw = result.data as CytologyInfoRawResponse
				const data = normalizeCytologyInfo(raw)
				if (data.image) return { data }

				const inherited = await inheritImageFromAncestors(raw, baseQuery as CytologySubQuery)
				return { data: inherited ? { ...data, ...inherited } : data }
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

				const revisionId = extractRevisionId(copy.data, copy.meta)
				if (!revisionId) {
					console.error('Ответ POST /cytology/copy без id новой ревизии:', copy.data)
					return {
						error: {
							status: 'CUSTOM_ERROR',
							error: 'Шлюз не вернул id новой ревизии',
							data: { message: 'Шлюз не вернул id новой ревизии — правки не сохранены' },
						},
					}
				}

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
					if (result.error) failed.push({ key, message: formatApiError(result.error) })
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
							body: { seg_type: segType, data: { points: toPixelPoints(draft.points) } } satisfies CreateSegmentPayload,
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
						body: { points: toPixelPoints(draft.points) } satisfies PatchSegmentPayload,
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

function statusOf(error: FetchBaseQueryError): number | undefined {
	if (typeof error.status === 'number') return error.status
	if (error.status === 'PARSING_ERROR') return error.originalStatus
	return undefined
}

/** Ключи, в которых бэкенды держат текст ошибки. */
const ERROR_TEXT_KEYS = ['error_message', 'message', 'detail', 'error'] as const

/**
 * Текст ошибки запроса — для сообщения врачу и для разбора проблем.
 *
 * Бэкенды отвечают по-разному: Django кладёт текст в `detail`, Go-шлюз —
 * в `message`, на 404 и 500 может прийти просто строка. Статус дописываем
 * всегда: без него не видно, ручки нет (404) или она отказала (400, 500).
 */
export function formatApiError(error: FetchBaseQueryError | SerializedError | undefined): string {
	if (!error) return 'Неизвестная ошибка'
	// `SerializedError` прилетает, когда запрос даже не ушёл (ошибка в коде).
	if (!('status' in error)) return error.message?.trim() || 'Неизвестная ошибка'

	if (error.status === 'CUSTOM_ERROR' || error.status === 'FETCH_ERROR' || error.status === 'TIMEOUT_ERROR') {
		const data = error.data as { message?: unknown } | undefined
		if (typeof data?.message === 'string' && data.message.trim()) return data.message.trim()
		return error.error
	}

	const status = statusOf(error)
	const body = error.data

	let text: string | null = null
	if (body && typeof body === 'object') {
		const data = body as Record<string, unknown>
		for (const key of ERROR_TEXT_KEYS) {
			const value = data[key]
			if (typeof value === 'string' && value.trim()) {
				text = value.trim()
				break
			}
		}
	} else if (typeof body === 'string') {
		text = describeServerErrorBody(body)
	}

	if (status == null) return text ?? 'Сервер недоступен'
	return text ? `${status}: ${text}` : `Ошибка ${status}`
}
