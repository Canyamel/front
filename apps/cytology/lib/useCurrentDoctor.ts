import { toDoctorShortName, type DoctorProfileViewModel } from '@medml/doctor_profile'
import { useGetMedDoctorQuery } from '@medml/patients'

import { isGoBackend } from './apiBackend'
import { useGetMedWorkerPatientsQuery } from './patientsApi'
import { useDoctorId } from './useDoctorId'

export type CurrentDoctor = {
	profile: DoctorProfileViewModel | null
	initials: string
	shortName: string
}

/**
 * Профиль вошедшего врача — для шапки.
 *
 * Go отдаёт профиль отдельной ручкой `/med/doctor/{id}`. В Django отдельной
 * ручки нет: профиль приходит вместе со списком пациентов
 * (`/med_worker/patients/{id}`); запрос тот же, что у страницы пациентов,
 * поэтому RTK Query берёт его из кэша, а не шлёт второй раз.
 */
export function useCurrentDoctor(): CurrentDoctor {
	const { doctorId } = useDoctorId()
	const go = isGoBackend()

	const goDoctor = useGetMedDoctorQuery(doctorId, { skip: !doctorId || !go })
	const django = useGetMedWorkerPatientsQuery({ doctorId }, { skip: !doctorId || go })

	const profile = (go ? goDoctor.data : django.data?.doctorProfile) ?? null

	return {
		profile,
		initials: profile?.initials ?? '',
		shortName: toDoctorShortName(profile),
	}
}
