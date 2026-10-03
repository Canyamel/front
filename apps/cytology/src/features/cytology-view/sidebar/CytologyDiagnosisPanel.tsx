import React from 'react'

import type { SegmentType } from '@cytology/core/types/segments'
import { useCytologyView } from '@cytology/model'

import { CYTOLOGY_EDITING_ENABLED } from '@/lib/cytologyFeatures'

import CytologyDiagnosisEdit from './CytologyDiagnosisEdit/CytologyDiagnosisEdit'
import CytologyDiagnosis from './CytologyDiagnosis/CytologyDiagnosis'

/** Панель справа: заключение и группы сегментов, в правке — редактор ревизии. */
const CytologyDiagnosisPanel: React.FC = () => {
	const { segmentTypes, currentType, setCurrentType, editor } = useCytologyView()

	const handleClickCard = (segmentType: SegmentType) => {
		// В правке тип выбран всегда: в него рисует врач.
		if (editor.isEditing) setCurrentType(segmentType)
		else setCurrentType(segmentType === currentType ? null : segmentType)
	}

	const handleOpenEdit = () => {
		if (!currentType && segmentTypes.length > 0) setCurrentType(segmentTypes[0].code as SegmentType)
		editor.start()
	}

	return (
		<div>
			{editor.isEditing && CYTOLOGY_EDITING_ENABLED ? (
				<CytologyDiagnosisEdit onClickCard={handleClickCard} />
			) : (
				<CytologyDiagnosis openEdit={handleOpenEdit} onClickCard={handleClickCard} />
			)}
		</div>
	)
}

export default CytologyDiagnosisPanel
