import { Link, useParams } from 'react-router-dom'
import { Button, Typography } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'

import { PageShell } from '@medml/layout'

import { UziViewPage } from '@/features/uzi-view'

/**
 * Просмотр и редактирование снимка УЗИ ЩЖ (галерея + сегменты Annotorious).
 * URL: /uzi_view/:uziId
 */
export default function UziViewRoute() {
	const { uziId } = useParams<{ uziId: string }>()

	if (!uziId?.trim()) {
		return (
			<PageShell>
				<Typography.Text type='danger'>
					Не указан идентификатор снимка УЗИ.
				</Typography.Text>
			</PageShell>
		)
	}

	return (
		<PageShell
			eyebrow='Результат диагностики'
			title='Снимок УЗИ'
			actions={
				<Link to='/patients'>
					<Button icon={<ArrowLeftOutlined />}>К списку пациентов</Button>
				</Link>
			}
		>
			{/* key: при переходе к другому снимку сбрасываем всё состояние страницы,
			    в том числе калибровку линейкой — масштаб одного снимка не должен
			    попасть на другой. */}
			<UziViewPage key={uziId.trim()} uziId={uziId.trim()} />
		</PageShell>
	)
}
