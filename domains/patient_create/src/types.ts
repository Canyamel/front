import type { Dayjs } from 'dayjs'

/**
 * Поля формы в духе OLD_PROJECTS/UZI (фамилия / имя / отчество отдельно).
 * Отправка на API: `fullname` = склейка через пробел.
 */
export type PatientCreateValuesUzi = {
	surname: string
	name: string
	patronymic?: string
	policy: string
	email?: string
	birthDate: Dayjs
	diagnosis: string
	active: boolean
	malignancy: boolean
}

export type PatientCreateValuesCytology = {
	lastName: string
	firstName: string
	fathersName?: string
	personalPolicy: string
	email: string
	birthDate: Dayjs
	diagnosis: string
	active: boolean
}

export type PatientCreateVariant = 'uzi' | 'cytology'
