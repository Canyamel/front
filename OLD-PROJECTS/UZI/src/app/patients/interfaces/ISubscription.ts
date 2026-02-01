export interface TariffPlan {
    id: string
    name: string
    description: string
    price: number
    duration: number // в наносекундах
}

export interface PaymentProvider {
    id: string
    name: string
    is_active: boolean
}

export interface Subscription {
    id: string
    tariff_plan_id: string
    status: 'active' | 'expired' | 'pending'
    start_date: string
    end_date: string
}

export interface SubscriptionStatus {
    has_active_subscription: boolean
}

export interface SubscriptionPurchaseRequest {
    tariff_plan_id: string
    payment_provider_id: string
}
