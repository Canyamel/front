/**
 * Поля соответствуют `MedWorkerRegistrationSerializer` на бэкенде
 * (`medweb/medml/serializers.py`). Все они помечены там `required=True`,
 * поэтому `fathers_name` и `med_organization` больше не опциональны:
 * пустая строка отклоняется валидацией DRF (`allow_blank=False`).
 */
export interface RegisterPayload {
	email: string
	last_name: string
	first_name: string
	fathers_name: string
	med_organization: string
	password1: string
	password2: string
}

export interface LoginPayload {
	email: string
	password: string
}

export interface LoginOptions {
	/**
	 * «Запомнить меня»: true — сессия переживает закрытие браузера
	 * (localStorage), false — живёт до закрытия вкладки (sessionStorage).
	 */
	remember?: boolean
}

export interface AuthLoginResponse {
	accessToken: string
	refreshToken: string
}

export interface IAuthApi {
	login(payload: LoginPayload, options?: LoginOptions): Promise<AuthLoginResponse>
	register(payload: RegisterPayload): Promise<void>
}

export interface RefreshTokenPayload {
	token: string
}

export interface RefreshTokenResponse {
	access_token: string
	refresh_token: string
}
