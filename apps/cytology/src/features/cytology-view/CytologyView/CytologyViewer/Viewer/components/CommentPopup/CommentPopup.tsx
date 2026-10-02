import React from 'react'
import { Card, Flex, Typography } from 'antd'
import { formatMm, pxToMm } from '@medml/viewers'

import { useAppDispatch, useAppSelector } from '@cytology/core/hooks'
import { markAsDeleted, markAsUnDeleted } from '@cytology/core/store'

import { CommentPopupHeader } from './CommentPopupHeader/CommentPopupHeader'
import type { SegmentAnnotation } from '../../utils/generateAnnotation'

import './CommentPopup.css'

const { Title, Text } = Typography

const SEGMENT_DETAIL_FIELDS = [
	{ key: 'area', label: 'Area' },
	{ key: 'min_d', label: 'Min D' },
	{ key: 'max_d', label: 'Max D' },
	{ key: 'aspect_ratio', label: 'Aspect ratio' },
	{ key: 'circularity', label: 'Circularity' },
	{ key: 'nuclear_cytoplasmic_ratio', label: 'Nuclear cytoplasmic ratio' },
] as const

function hasSegmentDetailValue(value: unknown): boolean {
	return value !== null && value !== undefined && value !== ''
}

interface CommentPopupProps {
	annotation: SegmentAnnotation
	needInput?: boolean
	isEditingMode?: boolean
	/** Масштаб; пока не задан, размер сегмента не показываем. */
	pxPerMm?: number | null
}

const CommentPopup: React.FC<CommentPopupProps> = ({
	annotation,
	needInput = false,
	isEditingMode = false,
	pxPerMm = null,
}) => {
	// const [comment, setComment] = useState('');
	const dispatch = useAppDispatch()
	const currentSegment = useAppSelector(state => state.segment.currentSegment)

	const response = annotation.data
	const segmentId = annotation.id

	// Раньше текущий тип сегмента читался через ref, который синхронизировался
	// отдельным эффектом, а в зависимостях был указан только сам ref. Ref
	// стабилен, поэтому колбэки никогда не пересоздавались и замыкали устаревшие
	// `segmentId` и `response`. React Compiler на это ругался: выведенные им
	// зависимости не совпадали с указанными.
	//
	// Ref не нужен — значение из стора и так свежее на каждом рендере.
	// Без useCallback: в проекте включён React Compiler, он мемоизирует
	// обработчики сам. Ручная мемоизация здесь только мешала — компилятор
	// сообщал, что не может её сохранить, и отказывался оптимизировать
	// компонент целиком.
	const isNewSegment = response?.toAdd

	const onDelete = () => {
		if (segmentId && currentSegment) {
			dispatch(
				markAsDeleted({
					id: segmentId,
					segType: currentSegment,
					isNew: isNewSegment,
				}),
			)
		}
	}

	const onUndoDelete = () => {
		if (segmentId && currentSegment) {
			dispatch(markAsUnDeleted({ id: segmentId, segType: currentSegment }))
		}
	}

	// useEffect(() => {
	//     const commentBody = annotation.bodies.find(body => body.purpose === 'commenting');
	//     setComment(commentBody && commentBody.value ? commentBody.value : '');
	// }, [annotation.bodies]);

	// const onSave = useCallback(() => {
	//     const updated = {
	//         purpose: 'commenting',
	//         value: comment
	//     };

	//     const commentBody = annotation.bodies.find(body => body.purpose === 'commenting');

	//     if (commentBody) {
	//         onUpdateBody(commentBody, updated);
	//     } else {
	//         onCreateBody(updated);
	//     }
	// }, [annotation.bodies, comment, onCreateBody, onUpdateBody]);

	const filledDetailFields = response?.details
		? SEGMENT_DETAIL_FIELDS.filter(field => hasSegmentDetailValue(response.details?.[field.key]))
		: []

	// Размер по геометрии контура, а не по details с бэкенда: масштаб
	// (px/мм) задаётся врачом на этом снимке и здесь же, ни в чём другом.
	const xs = annotation.points.map(point => point.x)
	const ys = annotation.points.map(point => point.y)
	const sizeLabel =
		pxPerMm != null && xs.length > 0
			? `${formatMm(pxToMm(Math.max(...xs) - Math.min(...xs), pxPerMm))} × ${formatMm(
					pxToMm(Math.max(...ys) - Math.min(...ys), pxPerMm),
				)}`
			: null

	return (
		<>
			{response && (
				<Card
					size='small'
					// title={
					//     needInput && (
					//         <CommentPopupHeader
					//             ai={response.ai}
					//             tirads={response.tirads}
					//             handleDeleteSegment={onDelete}
					//             isEditingMode={isEditingMode}
					//         />
					//     )
					// }
					style={{ width: 350, maxHeight: 400 }}
				>
					{!needInput && (
						<CommentPopupHeader
							ai={Boolean(response.ai)}
							probs={response.details?.probs}
							handleDeleteSegment={onDelete}
							handleUndoDeleteSegment={onUndoDelete}
							isEditingMode={isEditingMode}
							deleted={response.toDelete}
						/>
					)}
					{sizeLabel && (
						<Flex vertical>
							<Title level={5} className='mb-0'>
								Размер
							</Title>
							<Text>{sizeLabel}</Text>
						</Flex>
					)}
					{filledDetailFields.length > 0 ? (
						<Flex vertical gap={8}>
							{filledDetailFields.map(field => (
								<Flex vertical key={field.key}>
									<Title level={5} className='mb-0'>
										{field.label}
									</Title>
									<Text>{response.details?.[field.key]}</Text>
								</Flex>
							))}
						</Flex>
					) : null}
					{/* {
                        needInput &&
                        <Flex vertical gap={10}>
                            <Flex vertical style={{maxHeight: 250, overflow: 'auto'}} gap={10}>
                                <CommentPopupComment
                                    author="Цыгулева К.В."
                                    dateStamp="22.11.2024"
                                >
                                    Комментарий 1ааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааа
                                </CommentPopupComment>
                                <CommentPopupComment
                                    author="Цыгулева К.В."
                                    dateStamp="23.11.2024"
                                >
                                    Комментарий 2
                                </CommentPopupComment>
                                <CommentPopupComment
                                    isSelf
                                    author="Кузов М.Ю."
                                    dateStamp="12.01.2025"
                                >
                                    Комментарий 3
                                </CommentPopupComment>
                            </Flex>
                            <Flex vertical align="end" gap={5}>
                                <Input placeholder="Комменатрий" />
                                <Button style={{ width: "fit-content" }}>Отмена</Button>
                            </Flex>
                        </Flex>
                    } */}
				</Card>
			)}
		</>
	)
}

export default CommentPopup
