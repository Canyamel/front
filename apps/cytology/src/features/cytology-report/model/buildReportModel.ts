import type { DoctorProfileViewModel } from '@medml/doctor_profile'
import { toDoctorShortName } from '@medml/doctor_profile'

import { getHighestProbIndex } from '@cytology/core/functions/highestProb'
import type { ICytologyInfo } from '@cytology/core/types/cytology'
import type { ISegmentStack } from '@cytology/core/types/segments'
import { segmentsTranslated } from '@cytology/core/types/segments'
import { characteristicsDict } from '../../cytology-view/sidebar/CytologyDiagnosis/CytologyInfo/CharacteristicsTable/props'

import type { CytologyReportExtras, CytologyReportModel, ReportCharacteristic, ReportSegmentRow } from './types'

const DASH = '—'

/** Локализация забора материала. */
const MATERIAL_TYPES: Record<string, string> = {
	GS: 'Генитальный мазок',
	TP: 'Щитовидная железа',
	BP: 'Молочная железа',
	PTP: 'Околощитовидная железа',
	LNP: 'Лимфатический узел',
}

function text(value: string | number | null | undefined): string {
	if (value == null) return DASH
	const trimmed = String(value).trim()
	return trimmed || DASH
}

function date(value: string | undefined): string {
	if (!value) return DASH
	const parsed = new Date(value)
	return Number.isNaN(parsed.valueOf()) ? DASH : parsed.toLocaleDateString('ru-RU')
}

function patientName(info: ICytologyInfo): string {
	const { last_name, first_name, fathers_name } = info.patient
	return text([last_name, first_name, fathers_name].filter(Boolean).join(' '))
}

/**
 * Характеристики клеток и скоплений одной таблицей — те же названия, нормы и
 * оценка, что показывает панель исследования.
 */
function buildCharacteristics(info: ICytologyInfo): ReportCharacteristic[] {
	const details = info.details
	if (!details) return []

	const combined = { ...details.cell_characteristics, ...details.cluster_characteristics }

	return (Object.keys(combined) as Array<keyof typeof combined>).flatMap(key => {
		const meta = characteristicsDict[key as keyof typeof characteristicsDict]
		if (!meta) return []

		const value = combined[key]
		const hasReference = 'ref' in meta && meta.ref
		const normStart = 'normStart' in meta ? meta.normStart : undefined
		const normEnd = 'normEnd' in meta ? meta.normEnd : undefined

		let verdict = DASH
		let reference = DASH

		if (hasReference && normStart != null && normEnd != null) {
			reference = normStart === normEnd ? String(normStart) : `${normStart} – ${normEnd}`
			const inNorm = value >= normStart && value <= normEnd
			if (inNorm) {
				verdict = 'норма'
			} else {
				const deviation = value < normStart ? normStart - value : value - normEnd
				verdict = deviation >= 40 ? 'нарушение' : 'отклонение'
			}
		}

		return [{ name: meta.name, value: text(value), reference, verdict }]
	})
}

/** Сколько объектов каждого типа нашла разметка и кто их поставил. */
function buildSegments(segments: ISegmentStack[]): ReportSegmentRow[] {
	const counters = new Map<string, ReportSegmentRow>()

	for (const segment of segments) {
		const name = segmentsTranslated[segment.seg_type] ?? segment.seg_type
		const row = counters.get(name) ?? { name, total: 0, byAi: 0, byDoctor: 0 }
		row.total += 1
		if (segment.is_ai) row.byAi += 1
		else row.byDoctor += 1
		counters.set(name, row)
	}

	return [...counters.values()].sort((a, b) => b.total - a.total)
}

export interface BuildCytologyReportArgs {
	info: ICytologyInfo
	segments: ISegmentStack[]
	doctor?: DoctorProfileViewModel | null
	extras: CytologyReportExtras
}

export function buildCytologyReportModel({
	info,
	segments,
	doctor,
	extras,
}: BuildCytologyReportArgs): CytologyReportModel {
	const category = getHighestProbIndex(info.details?.probs)

	// Врач не заполнил заключение — печатаем диагноз из карты, а если нет и
	// его, то категорию, которую дала разметка. Пустое заключение в
	// документе хуже, чем выведенное из данных.
	const conclusion = extras.conclusion.trim() || info.diagnosis?.trim() || category

	return {
		patientName: patientName(info),
		patientBirthDate: date(info.patient.birth_date),
		patientPolicy: text(info.patient.personal_policy),
		doctorName: text(toDoctorShortName(doctor) || doctor?.fullName),
		printedAt: new Date().toLocaleDateString('ru-RU'),

		studyNumber: text([info.diagnostic_marking, info.diagnostic_number].filter(Boolean).join('-') || undefined),
		studyDate: date(info.diagnos_date),
		materialType: text(MATERIAL_TYPES[info.material_type] ?? info.material_type),
		category,

		calcitonin: text(info.calcitonin),
		calcitoninInFlush: text(info.calcitonin_in_flush),
		thyroglobulin: text(info.thyroglobulin),

		studyReason: text(extras.studyReason),
		clinicalData: text(extras.clinicalData),
		conclusion,
		recommendations: text(extras.recommendations),

		characteristics: extras.withCharacteristics ? buildCharacteristics(info) : [],
		segments: extras.withSegments ? buildSegments(segments) : [],
	}
}
