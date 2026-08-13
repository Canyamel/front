import { baseApi } from '@medml/store'

export type MedCardDto = {
	id?: number
	patient_id: string
	doctor_id: string
	diagnosis?: string
}

export type MedCard = {
	id: number | null
	patientId: string
	doctorId: string
	diagnosis: string
}

export type MedCardArgs = {
	doctorId: string
	patientId: string
}

export function mapMedCard(dto: MedCardDto): MedCard {
	return {
		id: typeof dto.id === 'number' ? dto.id : null,
		patientId: dto.patient_id,
		doctorId: dto.doctor_id,
		diagnosis: dto.diagnosis ?? '',
	}
}

export const medCardApi = baseApi.injectEndpoints({
	endpoints: builder => ({
		getMedCard: builder.query<MedCard, MedCardArgs>({
			query: ({ doctorId, patientId }) => `/med/card/${encodeURIComponent(doctorId)}/${encodeURIComponent(patientId)}`,
			transformResponse: (raw: MedCardDto) => mapMedCard(raw),
			providesTags: (_result, _error, { patientId }) => [{ type: 'Patient', id: patientId }],
		}),

		/**
		 * Обновление карты. Ручка принимает **только диагноз** — ФИО, полис и
		 * почта пациента через неё не меняются.
		 */
		updateMedCardDiagnosis: builder.mutation<MedCard, MedCardArgs & { diagnosis: string }>({
			query: ({ doctorId, patientId, diagnosis }) => ({
				url: `/med/card/${encodeURIComponent(doctorId)}/${encodeURIComponent(patientId)}`,
				method: 'PATCH',
				body: { diagnosis },
			}),
			transformResponse: (raw: MedCardDto) => mapMedCard(raw),
			invalidatesTags: (_result, _error, { patientId }) => [
				{ type: 'Patient', id: patientId },
				{ type: 'Patient', id: 'LIST' },
			],
		}),
	}),
})

export const { useGetMedCardQuery, useLazyGetMedCardQuery, useUpdateMedCardDiagnosisMutation } = medCardApi
