/**
 * Печатный отчёт по цитологическому исследованию.
 */

/** Поля, которые заполняет врач. На сервере их нет — живут в черновике. */
export interface CytologyReportExtras {
	studyReason: string
	clinicalData: string
	/**
	 * Заключение врача. Пустое — в документ идёт диагноз из карты, а если и
	 * его нет, то категория Bethesda по разметке.
	 */
	conclusion: string
	recommendations: string
	/** Печатать таблицу характеристик. */
	withCharacteristics: boolean
	/** Печатать перечень найденных объектов. */
	withSegments: boolean
}

export const EMPTY_CYTOLOGY_REPORT_EXTRAS: CytologyReportExtras = {
	studyReason: '',
	clinicalData: '',
	conclusion: '',
	recommendations: '',
	withCharacteristics: true,
	withSegments: true,
}

/** Строка таблицы характеристик. */
export interface ReportCharacteristic {
	name: string
	value: string
	reference: string
	verdict: string
}

/** Строка перечня найденного: тип объекта и сколько их. */
export interface ReportSegmentRow {
	name: string
	total: number
	byAi: number
	byDoctor: number
}

export interface CytologyReportModel {
	/** Шапка: кто и когда. */
	patientName: string
	patientBirthDate: string
	patientPolicy: string
	doctorName: string
	printedAt: string

	/** Исследование. */
	studyNumber: string
	studyDate: string
	materialType: string
	category: string

	/** Лабораторные показатели. */
	calcitonin: string
	calcitoninInFlush: string
	thyroglobulin: string

	/** Заполняется врачом. */
	studyReason: string
	clinicalData: string
	conclusion: string
	recommendations: string

	characteristics: ReportCharacteristic[]
	segments: ReportSegmentRow[]
}
