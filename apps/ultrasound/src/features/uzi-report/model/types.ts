export interface ReportExtras {
	// Информация об исследовании
	preliminaryDiagnosis: string
	studyReason: string
	justification: string

	// Описание
	operations: string
	thyroidDescription: string
	positionComment: string
	sizeChanged: boolean
	sizeDescription: string
	mobility: string
	vascularDescription: string
	structureDescription: string
	focalChanges: string | null
	focalChangesAuto: string | null
	parathyroidDescription: string
	parathyroidMassesFound: boolean

	// Итог
	recommendations: string
}

export const EMPTY_REPORT_EXTRAS: ReportExtras = {
	preliminaryDiagnosis: '',
	studyReason: '',
	justification: '',

	operations: '',
	thyroidDescription: '',
	positionComment: '',
	sizeChanged: false,
	sizeDescription: '',
	mobility: '',
	vascularDescription: '',
	structureDescription: '',
	focalChanges: null,
	focalChangesAuto: null,
	parathyroidDescription: '',
	parathyroidMassesFound: false,

	recommendations: '',
}

/** Размеры одной доли, уже приведённые к строкам для печати. */
export interface ReportLobe {
	length: string
	width: string
	depth: string
	volume: string
}

export interface ReportNodule {
	/** Номер узла в заключении, с единицы. */
	number: number
	tirads?: number
	/**
	 * Готовая строка размеров, пустая если их нет. Поперечный снимок:
	 * «ширина 12.4 мм, толщина 8.1 мм»; продольный: «длина …, толщина …».
	 */
	size: string
	/** Локализация узла («правая доля», «перешеек»); пустая, если не установлена. */
	location: string
	source: 'ai' | 'doctor'
}

export interface ThyroidReportModel {
	organization: string
	doctorName: string
	doctorSpeciality: string

	patientName: string
	patientPolicy: string
	patientBirthDate: string
	patientAge: string

	studyDateTime: string
	deviceName: string
	projection: string

	// Информация об исследовании
	preliminaryDiagnosis: string
	studyReason: string
	justification: string

	// Описание
	operations: string
	thyroidDescription: string
	position: string
	positionComment: string
	contours: string
	sizeChanged: boolean
	sizeDescription: string
	mobility: string

	isthmus: string
	right: ReportLobe
	left: ReportLobe
	totalVolume: string

	echogenicity: string
	vascularPattern: string
	vascularDescription: string
	structure: string
	structureDescription: string

	focalChanges: string
	parathyroidDescription: string
	parathyroidMassesFound: boolean
	lymphNodes: string
	additionalData: string

	nodules: ReportNodule[]
	nodulesDescription: string
	nodulesConclusion: string

	conclusion: string
	recommendations: string
}
