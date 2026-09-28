import React from 'react'
import { Card, Col, Grid, Row, Typography, theme } from 'antd'
import { getSurfaceCardStyle } from '@medml/ui'

import StudyFocusBar from './StudyFocusBar'
import type { StudyFocusMode } from '../useStudyFocusMode'

const { Title, Text } = Typography

const SIDEBAR_SHADOW_ROOM = 12
const SIDEBAR_SHADOW_ROOM_BOTTOM = 40

export interface StudyWorkspaceLayoutProps {
	focus: StudyFocusMode
	sidebarLabel?: string
	overviewTitle?: string
	overviewDescription?: string
	overviewPrimary?: React.ReactNode
	overviewSecondary?: React.ReactNode
	viewerTitle?: string
	viewer: React.ReactNode
	sidebar?: React.ReactNode
}

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
						<div
							style={{
								position: screens.lg ? 'sticky' : 'static',
								display: 'flex',
								flexDirection: 'column',
								gap: 12,
								...(screens.lg
									? {
											top: 0,
											padding: `${SIDEBAR_SHADOW_ROOM}px ${SIDEBAR_SHADOW_ROOM + 2}px ${SIDEBAR_SHADOW_ROOM_BOTTOM}px ${SIDEBAR_SHADOW_ROOM}px`,
											margin: `-${SIDEBAR_SHADOW_ROOM}px -${SIDEBAR_SHADOW_ROOM + 2}px -${SIDEBAR_SHADOW_ROOM_BOTTOM}px -${SIDEBAR_SHADOW_ROOM}px`,
											maxHeight: `calc(100vh - 84px + ${SIDEBAR_SHADOW_ROOM + SIDEBAR_SHADOW_ROOM_BOTTOM}px)`,
											overflow: 'auto',
										}
									: { overflow: 'visible' }),
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
