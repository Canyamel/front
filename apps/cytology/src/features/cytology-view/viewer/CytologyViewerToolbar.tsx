import React, { useCallback } from 'react'
import { Button, Space, Tooltip, Typography } from 'antd'

import { getAccentOutlineButtonStyle } from '@medml/ui'

import type { SegmentType } from '@cytology/core/types/segments'
import { useCytologyView } from '@cytology/model'

/**
 * Управление режимом правки.
 */
const CytologyViewerToolbar: React.FC = () => {
	const { info, editor, segmentTypes, currentType, setCurrentType } = useCytologyView()

	// Рисовать некуда, пока не выбран тип сегмента, — выбираем первый сами.
	const handleStart = useCallback(() => {
		if (!currentType && segmentTypes.length > 0) setCurrentType(segmentTypes[0].code as SegmentType)
		editor.start()
	}, [currentType, editor, segmentTypes, setCurrentType])

	// Ревизии правятся только с последней: на старой правка некуда сохранится.
	const isLastRevision = info?.is_last ?? true

	return (
		<div style={{ marginBottom: 16 }}>
			<Space wrap size={[12, 12]} style={{ display: 'flex', justifyContent: 'center' }}>
				{editor.isEditing ? (
					<>
						<Typography.Text type='secondary'>
							Выберите тип сегмента справа и обведите объект на снимке.
						</Typography.Text>

						<Button type='primary' onClick={editor.save} loading={editor.isSaving}>
							Сохранить
						</Button>
						<Button onClick={editor.cancel} disabled={editor.isSaving}>
							Отмена
						</Button>

						{!editor.hasChanges && (
							<Typography.Text type='secondary'>Пока нет несохранённых изменений.</Typography.Text>
						)}
					</>
				) : (
					<Tooltip title={isLastRevision ? undefined : 'Для редактирования перейдите на последнюю ревизию'}>
						<Button
							type='default'
							onClick={handleStart}
							disabled={!isLastRevision}
							style={{ ...getAccentOutlineButtonStyle(), borderRadius: '20px' }}
						>
							Изменить результаты
						</Button>
					</Tooltip>
				)}
			</Space>
		</div>
	)
}

export default CytologyViewerToolbar
