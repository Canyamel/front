import { baseApi } from './baseApi'

export interface TariffPlanDto {
	tariff_plan_id: string
	name: string
	description: string
	price: string
	duration_seconds: number
}

export interface PaymentProviderDto {
	id: string
	name: string
	is_active: boolean
}

export interface SubscriptionDto {
	subscription_id: string
	tariff_plan_id: string
	status: 'pending_payment' | 'active' | 'cancelled'
	start_date: string
	end_date: string
}

export interface SubscriptionStatusDto {
	has_active_subscription: boolean
}

export interface SubscriptionPurchaseRequestDto {
	tariff_plan_id: string
	payment_provider_id: string
}

export interface SubscriptionPurchaseResponseDto {
	subscription_id: string
	confirmation_url: string
}

export const billingApi = baseApi.injectEndpoints({
	endpoints: builder => ({
		getTariffPlans: builder.query<TariffPlanDto[], void>({
			query: () => 'billing/tariff-plans/',
			providesTags: ['Billing'],
		}),
		getTariffPlanById: builder.query<TariffPlanDto, string>({
			query: id => `billing/tariff-plans/${id}/`,
			providesTags: ['Billing'],
		}),
		getPaymentProviders: builder.query<PaymentProviderDto[], void>({
			query: () => 'billing/payment-providers/',
			providesTags: ['Billing'],
		}),
		checkActiveSubscription: builder.query<SubscriptionStatusDto, void>({
			query: () => 'billing/subscriptions/check-active/',
			providesTags: ['Subscription'],
		}),
		getActiveSubscription: builder.query<SubscriptionDto, void>({
			query: () => 'billing/subscriptions/active/',
			providesTags: ['Subscription'],
		}),
		purchaseSubscription: builder.mutation<
			SubscriptionPurchaseResponseDto,
			SubscriptionPurchaseRequestDto
		>({
			query: body => ({
				url: 'billing/subscriptions/purchase/',
				method: 'POST',
				body,
			}),
			invalidatesTags: ['Subscription'],
		}),
	}),
})

export const {
	useGetTariffPlansQuery,
	useGetTariffPlanByIdQuery,
	useGetPaymentProvidersQuery,
	useCheckActiveSubscriptionQuery,
	useGetActiveSubscriptionQuery,
	usePurchaseSubscriptionMutation,
} = billingApi
