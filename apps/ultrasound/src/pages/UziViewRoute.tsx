import { Link, useParams } from 'react-router-dom'
import { Button, Layout, Space, Typography } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'

import { UziViewPage } from '@/features/uzi-view'

/**
 * Просмотр и редактирование снимка УЗИ ЩЖ (галерея + сегменты Annotorious).
 * URL: /uzi_view/:uziId
 */
export default function UziViewRoute() {
	const { uziId } = useParams<{ uziId: string }>()

	if (!uziId?.trim()) {
		return (
			<Layout style={{ minHeight: '100vh', background: 'transparent' }}>
				<Layout.Content style={{ padding: 24, width: '100%', maxWidth: '100%' }}>
					<Typography.Text type='danger'>Не указан идентификатор снимка УЗИ.</Typography.Text>
				</Layout.Content>
			</Layout>
		)
	}

	const backLink = (
		<Space style={{ marginBottom: 16 }}>
			<Link to='/patients'>
				<Button type='text' icon={<ArrowLeftOutlined />}>
					К списку пациентов
				</Button>
			</Link>
		</Space>
	)

	return (
		<Layout style={{ minHeight: '100vh', background: 'transparent' }}>
			<Layout.Content style={{ padding: 24, width: '100%', maxWidth: '100%' }}>
				{backLink}
				<UziViewPage uziId={uziId.trim()} />
			</Layout.Content>
		</Layout>
	)
}
