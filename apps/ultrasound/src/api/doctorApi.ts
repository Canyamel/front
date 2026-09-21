import { baseApi } from '@medml/store'

/**
 * Профиль врача.
 *
 * Бэкенд (Django, `medweb/medml`):
 * - `GET /med_worker/update/{id}` — `MedWorkerChangeView`. Несмотря на «update»
 *   в пути, view подмешивает `RetrieveModelMixin` и явно определяет `get()`,
 *   поэтому отдаёт профиль по id (`MedWorkerCommonSerializer`).
 *
 * Счётчик уведомлений убран вместе с сервисом `inner_mail` на бэкенде.
 */

/** Ответ `MedWorkerCommonSerializer`. */
export type MedWorkerDto = {
	id: number
	last_name: string
	first_name: string
	fathers_name: string
	/** Медицинская организация. */
	med_organization: string
	/** Должность — в макете показывается как специальность. */
	job: string | null
	/** Удалённый эксперт — в макете чип «Удалённая работа». */
	is_remote_worker: boolean
	expert_details: string
}

/** Профиль врача в виде, удобном для UI. */
export type DoctorProfile = {
	id: number
	fullName: string
	initials: string
	lastName: string
	firstName: string
	fathersName: string
	/** Специальность (должность). */
	speciality: string | null
	/** Клиника. */
	organization: string | null
	isRemoteWorker: boolean
	/** Опыт и сертификаты (свободный текст). */
	expertDetails: string
}

/** Поля, которые принимает `MedWorkerChangeView` при обновлении. */
export type UpdateDoctorProfileBody = {
	doctorId: string
	last_name: string
	first_name: string
	fathers_name: string
	job: string
	med_organization: string
	is_remote_worker: boolean
	expert_details: string
}

function buildInitials(lastName: string, firstName: string): string {
	const a = lastName?.trim()?.[0] ?? ''
	const b = firstName?.trim()?.[0] ?? ''
	return `${a}${b}`.toUpperCase()
}

function toDoctorProfile(dto: MedWorkerDto): DoctorProfile {
	const fullName = [dto.last_name, dto.first_name, dto.fathers_name]
		.filter(part => part && part.trim())
		.join(' ')

	return {
		id: dto.id,
		fullName,
		initials: buildInitials(dto.last_name, dto.first_name),
		lastName: dto.last_name ?? '',
		firstName: dto.first_name ?? '',
		fathersName: dto.fathers_name ?? '',
		speciality: dto.job?.trim() || null,
		organization: dto.med_organization?.trim() || null,
		isRemoteWorker: Boolean(dto.is_remote_worker),
		expertDetails: dto.expert_details ?? '',
	}
}

export const doctorApi = baseApi.injectEndpoints({
	endpoints: builder => ({
		getDoctorProfile: builder.query<DoctorProfile, string>({
			query: doctorId => ({
				url: `/med_worker/update/${encodeURIComponent(doctorId)}`,
			}),
			transformResponse: (response: MedWorkerDto) => toDoctorProfile(response),
			providesTags: (_r, _e, doctorId) => [{ type: 'MedWorker', id: doctorId }],
		}),

		/**
		 * `MedWorkerChangeView` — UpdateAPIView, поэтому PATCH обновляет
		 * профиль частично. View проверяет, что правит сам владелец
		 * (`request.user.id != kwargs['id']` → отказ).
		 */
		updateDoctorProfile: builder.mutation<MedWorkerDto, UpdateDoctorProfileBody>({
			query: ({ doctorId, ...body }) => ({
				url: `/med_worker/update/${encodeURIComponent(doctorId)}`,
				method: 'PATCH',
				body,
			}),
			invalidatesTags: (_r, _e, { doctorId }) => [
				{ type: 'MedWorker', id: doctorId },
			],
		}),
	}),
})

export const {
	useGetDoctorProfileQuery,
	useUpdateDoctorProfileMutation,
} = doctorApi
