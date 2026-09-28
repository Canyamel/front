'use client'

import * as React from 'react'
import { Card, Empty, Flex, Skeleton } from 'antd'

import type { PatientProfileViewModel } from '../../types'

import './PatientProfileView.scss'

export type PatientProfileViewProps = {
	patient: PatientProfileViewModel | null | undefined
	loading?: boolean
	className?: string
	title?: React.ReactNode
	attendingDoctor?: string
	actions?: React.ReactNode
	children?: React.ReactNode
	onBack?: () => void
	/** @deprecated См. `onBack`. */
	backLabel?: string
	/** @deprecated См. `onBack`. */
	breadcrumbCurrentLabel?: string
}

/** «Соколова Анна Петровна» → «СА». */
function initialsFromFullName(fullName: string | undefined): string {
	const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
	return parts
		.slice(0, 2)
		.map(part => part[0]!.toUpperCase())
		.join('')
}

/** Строка под ФИО: «Полис 1782 9012 … · a.sokolova@mail.ru · д. р. 12.03.1984». */
function buildMetaLine(patient: PatientProfileViewModel): string {
	return [
		patient.policyNumber?.trim() ? `Полис ${patient.policyNumber.trim()}` : null,
		patient.email?.trim() || null,
		patient.birthDate?.trim() ? `д. р. ${patient.birthDate.trim()}` : null,
	]
		.filter(Boolean)
		.join(' · ')
}

function Chip({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'success' }) {
	return <span className={`patient-head__chip patient-head__chip--${tone}`}>{children}</span>
}

export function PatientProfileView({
	patient,
	loading,
	className,
	title,
	attendingDoctor,
	actions,
	children,
}: PatientProfileViewProps) {
	const diagnosis = patient?.diagnosis?.trim()

	return (
		<div className={['patient-profile', className].filter(Boolean).join(' ')}>
			<Card className='patient-head' styles={{ body: { padding: 24 } }}>
				{loading && !patient ? (
					<Skeleton avatar active paragraph={{ rows: 2 }} />
				) : patient ? (
					<Flex vertical gap={16}>
						<div className='patient-head__top'>
							<div className='patient-head__identity'>
								<span className='patient-head__avatar' aria-hidden='true'>
									{initialsFromFullName(patient.fullName)}
								</span>
								<div className='patient-head__titles'>
									<div className='patient-head__name-row'>
										<h1 className='patient-head__name'>{title ?? (patient.fullName || 'Пациент')}</h1>
										<Chip tone={patient.active ? 'success' : 'neutral'}>
											{patient.active ? 'Активен' : 'Неактивен'}
										</Chip>
									</div>
									{buildMetaLine(patient) ? <p className='patient-head__meta'>{buildMetaLine(patient)}</p> : null}
								</div>
							</div>
							{actions ? <div className='patient-head__actions'>{actions}</div> : null}
						</div>

						<div className='patient-head__chips'>
							<Chip>Диагноз: {diagnosis || 'не указан'}</Chip>
							{patient.malignancy != null ? (
								<Chip>Злокачественность: {patient.malignancy ? 'есть' : 'нет'}</Chip>
							) : null}
							{attendingDoctor ? <Chip>Лечащий врач: {attendingDoctor}</Chip> : null}
						</div>
					</Flex>
				) : (
					<Empty description='Нет данных о пациенте' />
				)}
			</Card>

			{children ? <div className='patient-profile__content'>{children}</div> : null}
		</div>
	)
}
