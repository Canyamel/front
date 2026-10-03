import React, { useContext, useMemo } from 'react'
import { Button, Flex, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

import { ModalContext } from '@medml/ui'
import { prepareCytologyInfo } from '@cytology/core/functions/prepareCytologyInfo'
import type { SegmentType } from '@cytology/core/types/segments'
import { useCytologyView } from '@cytology/model'

import DiagnosisCard from '../DiagnosisCard/DiagnosisCard'
import ConclusionModal from '../ConclusionModal/ConclusionModal'
import AddSegmentTypeModal from './AddSegmentTypeModal'

import './CytologyDiagnosisEdit.css'

const { Text } = Typography

interface CytologyDiagnosisEditProps {
	onClickCard: (segmentType: SegmentType) => void
}

/** Правка ревизии: выбор типа сегментов, заключение, сохранение. */
const CytologyDiagnosisEdit: React.FC<CytologyDiagnosisEditProps> = ({ onClickCard }) => {
	const { open } = useContext(ModalContext)
	const { info, segmentTypes, segments, currentType, setCurrentType, editor } = useCytologyView()

	const segmentColorByCode = useMemo(
		() => new Map(segmentTypes.map(type => [type.code, type.color])),
		[segmentTypes],
	)

	// Типы, сегментов которых на снимке ещё нет, — ни с сервера, ни новых.
	const availableTypes = useMemo(() => {
		const used = new Set<string>(segments.map(segment => segment.seg_type))
		editor.drafts.drafts.forEach(draft => {
			if (draft.kind === 'create' && draft.data) used.add(draft.data.segType)
		})
		return segmentTypes.map(type => type.code as SegmentType).filter(code => !used.has(code))
	}, [segments, segmentTypes, editor.drafts.drafts])

	const handleAddSegmentType = () => {
		open({ content: <AddSegmentTypeModal options={availableTypes} onSubmit={setCurrentType} /> })
	}

	const handleEditConclusion = () => {
		const initData = editor.editedInfo ?? (info ? prepareCytologyInfo(info) : null)
		if (initData) {
			open({ content: <ConclusionModal initData={initData} onSubmit={editor.setEditedInfo} /> })
		}
	}

	return (
		<div className='cytology-edit-panel'>
			<div className='cytology-diagnosis-groups'>
				<Text className='cytology-section-label'>Группы сегментов</Text>
				<div className='cytology-diagnosis-cards-wrapper'>
					{segmentTypes.map(segmentType => (
						<DiagnosisCard
							segmentType={segmentType.code as SegmentType}
							label={segmentType.label}
							color={segmentColorByCode.get(segmentType.code)}
							isActive={currentType === (segmentType.code as SegmentType)}
							onClick={() => onClickCard(segmentType.code as SegmentType)}
							key={segmentType.code}
							editMode
						/>
					))}
				</div>
			</div>
			<div className='cytology-diagnosis-edit-wrapper'>
				{availableTypes.length > 0 && (
					<Button className='cytology-diagnosis-button' onClick={handleAddSegmentType}>
						<PlusOutlined />
						<Text className='text-inherit'>Добавить тип сегмента</Text>
					</Button>
				)}
				<Flex vertical gap={10}>
					<Button className='cytology-diagnosis-button' onClick={handleEditConclusion}>
						Редактировать заключение
					</Button>
					<Button type='primary' onClick={editor.save} loading={editor.isSaving}>
						Сохранить ревизию
					</Button>
					<Button type='primary' onClick={editor.cancel} disabled={editor.isSaving}>
						Вернуться в режим просмотра без сохранения
					</Button>
				</Flex>
			</div>
		</div>
	)
}

export default CytologyDiagnosisEdit
