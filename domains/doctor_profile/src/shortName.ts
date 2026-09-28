import type { DoctorProfileViewModel } from './types'

export function toDoctorShortName(
	profile: Pick<DoctorProfileViewModel, 'lastName' | 'firstName' | 'fathersName' | 'fullName'> | null | undefined,
): string {
	if (!profile) return ''
	const last = profile.lastName?.trim() ?? ''
	const initials = [profile.firstName, profile.fathersName]
		.map(part => part?.trim()?.[0])
		.filter(Boolean)
		.map(letter => `${letter!.toUpperCase()}.`)
		.join(' ')
	if (last) return initials ? `${last} ${initials}` : last
	return profile.fullName?.trim() ?? ''
}
