import { toDoctorShortName } from '@medml/doctor_profile'

import { useGetDoctorProfileQuery, type DoctorProfile } from '../doctorApi'
import { useDoctorId } from './useDoctorId'

export type CurrentDoctor = {
	profile: DoctorProfile | null
	initials: string
	shortName: string
}

export function useCurrentDoctor(): CurrentDoctor {
	const { doctorId } = useDoctorId()
	const { data } = useGetDoctorProfileQuery(doctorId, { skip: !doctorId })
	const profile = data ?? null

	return {
		profile,
		initials: profile?.initials ?? '',
		shortName: toDoctorShortName(profile),
	}
}
