import React from 'react'
import { Button, Dropdown, Select, Space, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { GalleryToolbarProps } from './types'
import { TIRADS_OPTIONS } from '../model/nodeEdits'
import { getAccentOutlineButtonStyle } from '@/styles/uiPatterns'

const GalleryToolbar: React.FC<GalleryToolbarProps> = ({
	isEditMode,
	currentGroup,
	segmentOptions = [],
	onSelectGroup,
	currentType,
	onChangeType,
	onAddNode,
	onStartEdit,
	onSave,
	onCancel,
	isSaving = false,
	hasUnsavedChanges = false,
}) => {
	return (
		<div style={{ marginBottom: 16 }}>
			<Space
				wrap
				size={[12, 12]}
				style={{ display: 'flex', justifyContent: 'center' }}
			>
				{isEditMode ? (
					<>
						<Typography.Text type='secondary'>
							Выберите узел: кисть расширяет его контур, ластик подрезает,
							«Контур» обводит заново.
						</Typography.Text>

						{segmentOptions.length > 0 && (
							<Select
								value={currentGroup}
								onChange={value => onSelectGroup?.(value)}
								options={segmentOptions}
								style={{ minWidth: 220 }}
								placeholder='Выберите узел'
							/>
						)}

						{currentGroup != null && onChangeType && (
							<Select
								value={TIRADS_OPTIONS.some(option => option.value === currentType) ? currentType : undefined}
								onChange={value => onChangeType(value)}
								options={TIRADS_OPTIONS}
								style={{ minWidth: 130 }}
								placeholder='Класс узла'
								aria-label='Класс TI-RADS выбранного узла'
							/>
						)}

						{onAddNode && (
							<Dropdown
								trigger={['click']}
								menu={{
									items: TIRADS_OPTIONS.map(option => ({ key: String(option.value), label: option.label })),
									onClick: ({ key }) => onAddNode(Number(key)),
								}}
							>
								<Button icon={<PlusOutlined />}>Новый узел</Button>
							</Dropdown>
						)}

						<Button type='primary' onClick={onSave} loading={isSaving}>
							Сохранить
						</Button>
						<Button onClick={onCancel} disabled={isSaving}>
							Отмена
						</Button>
						{!hasUnsavedChanges && (
							<Typography.Text type='secondary'>
								Пока нет несохранённых изменений.
							</Typography.Text>
						)}
					</>
				) : (
					<Button
						type='default'
						onClick={onStartEdit}
						style={{ ...getAccentOutlineButtonStyle(), borderRadius: '20px' }}
					>
						Изменить результаты
					</Button>
				)}
			</Space>
		</div>
	)
}

export default GalleryToolbar
