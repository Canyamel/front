import '@medml/ui/styles/upload-page.scss'

import * as React from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { Button, Card } from 'antd'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { CytologyUploadPhoto, mapUploadValuesToCytologyStagedBody } from '@medml/cytology_upload'
import { PageShell } from '@medml/layout'
import { PatientCreateModal, type PatientCreateValuesCytology } from '@medml/patient_create'
import { useLazyGetMedCardQuery } from '@medml/patients'

import { isGoBackend } from '@/lib/apiBackend'
import { useCreateCytologyFromStagedMutation, useLazyGetCytologyInfoQuery } from '@/lib/cytologyApi'
import { useLazyGetPatientShotsByCardIdQuery } from '@/lib/patientProfileApi'
import { useCreateCytologyPatient } from '@/lib/useCreateCytologyPatient'
import { useCytologyPatients } from '@/lib/useCytologyPatients'
import { useDoctorId } from '@/lib/useDoctorId'

export default function UploadPhotoRoute() {
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const presetPatientCardId = searchParams.get('patientId')?.trim() ?? ''
	const { doctorId, status } = useDoctorId()

	const [createModalOpen, setCreateModalOpen] = React.useState(false)

	const { cards, isFetching } = useCytologyPatients({
		doctorId,
		enabled: status === 'authenticated',
	})

	const [createCytologyFromStaged, { isLoading }] = useCreateCytologyFromStagedMutation()
	const { createPatient, isCreating } = useCreateCytologyPatient(doctorId)
	const [fetchMedCard] = useLazyGetMedCardQuery()
	const [fetchPatientShots] = useLazyGetPatientShotsByCardIdQuery()
	const [fetchCytologyInfo] = useLazyGetCytologyInfoQuery()

	const resolveCardIdFromExistingStudy = async (patientId: string): Promise<string | null> => {
		try {
			const shots = await fetchPatientShots({ cardId: patientId, patientId }).unwrap()
			const anyStudyId = shots.studies[0]?.id
			if (!anyStudyId) return null

			const info = await fetchCytologyInfo(String(anyStudyId)).unwrap()
			const cardId = info.info?.patient_card
			return cardId == null ? null : String(cardId)
		} catch {
			return null
		}
	}

	/**
	 * `patient_card` для `POST /cytology/create`.
	 *
	 * Django отдаёт карты пациентов прямо в списке, и в поле формы уже лежит
	 * нужный идентификатор. В Go-шлюзе список возвращает самих пациентов, а
	 * ручка создания ждёт **числовой id карты** — по нему сервер достаёт и
	 * пациента, и врача. Поэтому карту приходится запрашивать отдельно.
	 */
	const resolvePatientCard = async (selected: string): Promise<string> => {
		if (!isGoBackend()) return selected

		// Штатный путь: заработает, как только шлюз начнёт отдавать `id` карты.
		const card = await fetchMedCard({ doctorId, patientId: selected }).unwrap()
		if (card.id != null) return String(card.id)

		const fromStudy = await resolveCardIdFromExistingStudy(selected)
		if (fromStudy != null) return fromStudy

		throw new Error(
			'Не удалось определить числовой id карты пациента, а `POST /cytology/create` ждёт именно его. ' +
				'У этого пациента ещё нет исследований, из которых id можно было бы вытащить. ' +
				'Чинится на бэкенде: перенести `ID` в `internal/server/med/mappers/card.go` и добавить поле `id` в схему `card`.',
		)
	}

	const patientOptions = cards.map(card => ({
		value: card.cardId,
		label: `${card.fullName}${card.policyNumber ? ` — ${card.policyNumber}` : ''}`,
	}))

	const handleCreatePatient = async (values: PatientCreateValuesCytology) => {
		if (await createPatient(values)) {
			setCreateModalOpen(false)
		}
	}

	return (
		<PageShell
			className='upload-page'
			eyebrow='ИИ ассистент'
			title='Новый снимок цитологии'
			subtitle='Заполните параметры исследования и загрузите изображение для AI-анализа.'
		>
			<Card>
				<CytologyUploadPhoto
					presetPatientCardId={presetPatientCardId}
					patientOptions={patientOptions}
					patientsLoading={isFetching}
					isSubmitting={isLoading}
					onCreate={async ({ values, uploadedFileMeta }) => {
						const body = mapUploadValuesToCytologyStagedBody(values, uploadedFileMeta)
						const patientCard = await resolvePatientCard(body.patient_card)
						return createCytologyFromStaged({ ...body, patient_card: patientCard }).unwrap()
					}}
					onSuccess={id => navigate(`/diagnostic_is_running/${encodeURIComponent(String(id))}`)}
					formFooterSlot={
						<Button
							className='upload-page__add-patient'
							icon={<PlusOutlined />}
							onClick={() => setCreateModalOpen(true)}
							disabled={isLoading}
						>
							Добавить нового пациента
						</Button>
					}
				/>
			</Card>

			<PatientCreateModal
				open={createModalOpen}
				variant='cytology'
				onCancel={() => setCreateModalOpen(false)}
				onFinish={vals => void handleCreatePatient(vals as PatientCreateValuesCytology)}
				confirmLoading={isCreating}
			/>
		</PageShell>
	)
}
