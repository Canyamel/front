import * as React from 'react'
import { Alert, Button, Card, Space, Spin, Typography, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'

import {
	SubscriptionInfo,
	SubscriptionModal,
	openModal,
	useCheckActiveSubscriptionQuery,
	useGetActiveSubscriptionQuery,
	useGetTariffPlanByIdQuery,
	useGetTariffPlansQuery,
	useGetPaymentProvidersQuery,
	usePurchaseSubscriptionMutation,
	type TariffPlan,
} from '@medml/subscriptions'
import { useAppDispatch } from '@medml/store'
import { PageShell } from '@medml/layout'

const { Title, Paragraph, Text } = Typography

export default function SubscriptionRoute() {
	const dispatch = useAppDispatch()

	const {
		data: status,
		isFetching: isChecking,
		refetch: refetchStatus,
	} = useCheckActiveSubscriptionQuery()

	const hasActive = status?.has_active_subscription ?? false

	const {
		data: subscription,
		refetch: refetchSubscription,
		isFetching: isLoadingSubscription,
	} = useGetActiveSubscriptionQuery(undefined, { skip: !hasActive })

	const { data: tariffPlan } = useGetTariffPlanByIdQuery(
		subscription?.tariff_plan_id ?? '',
		{ skip: !subscription?.tariff_plan_id },
	)

	const { data: tariffPlans = [], isLoading: plansLoading } =
		useGetTariffPlansQuery()
	const { data: paymentProviders = [] } = useGetPaymentProvidersQuery()
	const [purchase, { isLoading: isPurchasing }] =
		usePurchaseSubscriptionMutation()

	const checkSubscriptionStatus = React.useCallback(async () => {
		const result = await refetchStatus()
		const active = result.data?.has_active_subscription ?? false
		if (active) {
			await refetchSubscription()
		}
		return active
	}, [refetchStatus, refetchSubscription])

	const handlePurchase = async (data: {
		tariff_plan_id: string
		payment_provider_id: string
	}) => {
		const result = await purchase(data).unwrap()
		message.info('Откройте окно оплаты и завершите платёж')
		return { confirmation_url: result.confirmation_url }
	}

	const handleSubscriptionComplete = async () => {
		await checkSubscriptionStatus()
		message.success('Подписка активирована')
	}

	if (plansLoading && !tariffPlans.length) {
		return (
			<div style={{ padding: 48, textAlign: 'center' }}>
				<Spin size='large' />
			</div>
		)
	}

	return (
		// Ширину и внешние отступы держит общий каркас страницы.
		<PageShell>
			<Space direction='vertical' size='large' style={{ width: '100%' }}>
				<div>
					<Title level={2} style={{ marginBottom: 8 }}>
						Подписка
					</Title>
					<Paragraph type='secondary'>
						Тестовая страница биллинга. API:{' '}
						<Text code>/api/v3/billing/</Text>
					</Paragraph>
				</div>

				<Alert
					type='info'
					showIcon
					message='После оплаты'
					description='Активация подписки выполняется на сервере (webhook YooKassa). Если оплатили, но статус не обновился — нажмите «Обновить» или закройте окно ожидания и обновите страницу через минуту.'
				/>

				<Card
					title='Статус'
					extra={
						<Button
							icon={<ReloadOutlined />}
							onClick={() => void checkSubscriptionStatus()}
							loading={isChecking || isLoadingSubscription}
						>
							Обновить
						</Button>
					}
				>
					<SubscriptionInfo
						subscription={subscription}
						tariffPlan={tariffPlan}
						onSubscribe={() => dispatch(openModal())}
						isLoading={isChecking}
					/>
				</Card>

				<Card title='Тарифные планы'>
					<ul style={{ paddingLeft: 20, margin: 0 }}>
						{tariffPlans.map((plan: TariffPlan) => (
							<li key={plan.tariff_plan_id}>
								<Text strong>{plan.name}</Text> — {plan.price} ₽,{' '}
								{Math.round(plan.duration_seconds / 60)} мин.
							</li>
						))}
					</ul>
					<Button
						type='primary'
						style={{ marginTop: 16 }}
						onClick={() => dispatch(openModal())}
						loading={isPurchasing}
					>
						Оформить подписку
					</Button>
				</Card>
			</Space>

			<SubscriptionModal
				tariffPlans={tariffPlans}
				paymentProviders={paymentProviders}
				onPurchase={handlePurchase}
				checkSubscriptionStatus={checkSubscriptionStatus}
				onSubscriptionComplete={handleSubscriptionComplete}
			/>
		</PageShell>
	)
}
