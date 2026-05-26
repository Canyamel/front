/**
 * SubscriptionWrapper Component
 *
 * Компонент-обёртка, который блокирует функционал страницы при отсутствии активной подписки
 */

'use client'

import React from 'react'
import { Button, Modal, Spin } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { useSubscription } from '../../hooks'
import type { TariffPlan } from '../../types'
import styles from './SubscriptionWrapper.module.scss'

export interface SubscriptionWrapperProps {
	children: React.ReactNode
}

/**
 * Обёртка для страниц, требующих активной подписки
 *
 * Если подписка активна - рендерит children
 * Если подписки нет - показывает overlay с предложением оформить подписку
 */
export const SubscriptionWrapper: React.FC<SubscriptionWrapperProps> = ({
	children,
}) => {
	const { hasActiveSubscription, isLoading, tariffPlans } = useSubscription()

	if (isLoading) {
		return (
			<div className={styles.loading}>
				<Spin size='large' />
			</div>
		)
	}

	if (hasActiveSubscription) {
		return <>{children}</>
	}

	return (
		<div className={styles.wrapper}>
			<div className={styles.overlay}>
				<div className={styles.content}>
					<LockOutlined className={styles.icon} />
					<h2>Требуется активная подписка</h2>
					<p>
						Для доступа к этому разделу необходимо оформить подписку. Выберите
						подходящий тарифный план и начните пользоваться всеми функциями.
					</p>
					<div className={styles.plans}>
						{(tariffPlans ?? []).slice(0, 3).map((plan: TariffPlan) => (
							<div key={plan.tariff_plan_id} className={styles.plan}>
								<h3>{plan.name}</h3>
								<p>{plan.description}</p>
								<Button type='primary' size='small'>
									Выбрать
								</Button>
							</div>
						))}
					</div>
					<Button type='primary' size='large'>
						Оформить подписку
					</Button>
				</div>
			</div>
			<div className={styles.pageContent}>{children}</div>
		</div>
	)
}
