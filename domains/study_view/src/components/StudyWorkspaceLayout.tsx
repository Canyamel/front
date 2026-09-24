import React from 'react'
import { Card, Col, Grid, Row, Typography, theme } from 'antd'
import { getSurfaceCardStyle } from '@medml/ui'

import StudyFocusBar from './StudyFocusBar'
import type { StudyFocusMode } from '../useStudyFocusMode'

const { Title, Text } = Typography

export interface StudyWorkspaceLayoutProps {
	focus: StudyFocusMode
	/** Как называется боковая панель в подписи кнопки режима просмотра. */
	sidebarLabel?: string

	/** Заголовок блока сводки над снимком. */
	overviewTitle?: string
	overviewDescription?: string
	/** Левая колонка сводки — обычно карточка пациента. */
	overviewPrimary?: React.ReactNode
	/** Правая колонка сводки — данные диагностики. */
	overviewSecondary?: React.ReactNode

	/** Заголовок карточки со снимком. */
	viewerTitle?: string
	/** Сам просмотровщик — приложение передаёт свой, домен про него не знает. */
	viewer: React.ReactNode

	/** Панель справа: форма исследования либо панель заключения. */
	sidebar?: React.ReactNode
}

/**
 * Страница исследования: сводка сверху, снимок слева, панель справа.
 *
 * До унификации эта разметка существовала в двух копиях — `UziViewPage`
 * и `CytologyView`: одни и те же `Row`/`Col` с `lg={showSidebar ? 16 : 24}`,
 * один и тот же липкий сайдбар, одни и те же карточки со своими отступами.
 * Расходились они только подписями, из-за чего правка раскладки в одном
 * контуре не доезжала до другого.
 *
 * Домен намеренно не зависит от `@medml/viewers` (см.
 * docs/architecture/dependency-rules.md): сам просмотровщик приходит слотом,
 * поэтому страницу можно собрать и над 2D-вьюером, и над DICOM.
 */
const StudyWorkspaceLayout: React.FC<StudyWorkspaceLayoutProps> = ({
	focus,
	sidebarLabel,
	overviewTitle = 'Обзор исследования',
	overviewDescription = 'Сводка по пациенту и диагностике',
	overviewPrimary,
	overviewSecondary,
	viewerTitle = 'Редактор/просмотр изображения',
	viewer,
	sidebar,
}) => {
	const { token } = theme.useToken()
	const screens = Grid.useBreakpoint()
	const cardStyle = getSurfaceCardStyle(token)

	const hasOverview = Boolean(overviewPrimary || overviewSecondary)
	const hasSidebar = Boolean(sidebar)

	return (
		<>
			<StudyFocusBar focus={focus} sidebarLabel={sidebarLabel} style={cardStyle} />

			{hasOverview && focus.showOverview && (
				<Card style={{ ...cardStyle, marginTop: 16 }} styles={{ body: { padding: 16 } }}>
					<Title level={5} style={{ marginBottom: 2 }}>
						{overviewTitle}
					</Title>
					<Text type='secondary'>{overviewDescription}</Text>

					<Row gutter={[12, 12]} style={{ marginTop: 8 }} align='stretch'>
						{overviewPrimary && (
							<Col xs={24} xl={12}>
								{overviewPrimary}
							</Col>
						)}
						{overviewSecondary && (
							<Col xs={24} xl={12}>
								{overviewSecondary}
							</Col>
						)}
					</Row>
				</Card>
			)}

			<Row gutter={[16, 16]} align='top' style={{ marginTop: 16 }}>
				<Col xs={24} lg={hasSidebar && focus.showSidebar ? 16 : 24}>
					<Card title={viewerTitle} style={cardStyle} styles={{ body: { padding: 12 } }}>
						{viewer}
					</Card>
				</Col>

				{hasSidebar && focus.showSidebar && (
					<Col xs={24} lg={8}>
						{/*
						  На широком экране панель едет вместе со страницей: врач
						  правит заключение, глядя на снимок, поэтому она должна
						  оставаться на виду. На узком липкость только мешала бы.
						*/}
						<div
							style={{
								position: screens.lg ? 'sticky' : 'static',
								top: screens.lg ? 12 : 0,
								display: 'flex',
								flexDirection: 'column',
								gap: 12,
								maxHeight: screens.lg ? 'calc(100vh - 96px)' : 'none',
								overflow: screens.lg ? 'auto' : 'visible',
								paddingRight: 2,
							}}
						>
							{sidebar}
						</div>
					</Col>
				)}
			</Row>
		</>
	)
}

export default StudyWorkspaceLayout
